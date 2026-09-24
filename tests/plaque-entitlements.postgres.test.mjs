// Fresh disposable localhost PostgreSQL only. Never reads .env or connects to Supabase.
// MODERNTAP_PG_TOOLS points to a temp directory with embedded-postgres and pg installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { createRequire } from 'node:module';
const tools=process.env.MODERNTAP_PG_TOOLS;
test('real PostgreSQL migration, privileges, rollback and concurrent requests',{skip:!tools,timeout:60000},async t=>{
  const requireTools=createRequire(path.join(tools,'package.json'));
  const {default:EmbeddedPostgres}=await import(requireTools.resolve('embedded-postgres'));
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'moderntap-db-test-'));
  const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
  const pg=new EmbeddedPostgres({databaseDir:path.join(temp,'data'),user:'postgres',password:'local-fixture-only',port,persistent:false,onLog:()=>{},onError:()=>{},initdbFlags:['--locale=C','--encoding=UTF8'],postgresFlags:['-h','127.0.0.1']});
  let client;const connections=[];
  try{
    await pg.initialise();await pg.start();client=pg.getPgClient();await client.connect();
    await client.query(`
      create role anon; create role authenticated; create role service_role;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.role() returns text language sql as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on all functions in schema auth to anon,authenticated,service_role;
      create table businesses(id uuid primary key default gen_random_uuid(), owner_id uuid not null, name text);
      create table subscriptions(id uuid primary key default gen_random_uuid(),business_id uuid unique references businesses, status text, stripe_subscription_id text,stripe_customer_id text,stripe_price_id text);
      create table plaques(id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses on delete cascade,name text,code text unique,destination_url text,active boolean not null default true,mode text default 'direct_link',purpose text default 'general');
      create table fixture_history(plaque_id uuid references plaques(id), event text);
      grant select,insert,update,delete on plaques,businesses,subscriptions to authenticated;
      grant insert(status),update(status) on subscriptions to authenticated;
    `);
    const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const b=(await client.query('insert into businesses(owner_id,name) values($1,$2) returning id',[owner,'Fixture'])).rows[0].id;
    await client.query("insert into subscriptions(business_id,status,stripe_subscription_id,stripe_price_id) values($1,'active','sub_fixture','price_starter')",[b]);
    await client.query("insert into plaques(business_id,active,name) select $1,true,'Existing' from generate_series(1,4)",[b]);
    await client.query(fs.readFileSync('supabase/migrations/20260925_enforce_active_plaque_limits.sql','utf8'));
    await client.query("insert into moderntap_private.price_entitlements values ('price_starter','starter',5),('price_growth','growth',10),('price_pro','pro',20),('price_business','business',30),('price_custom','custom',35)");
    async function owned(){const c=pg.getPgClient();await c.connect();connections.push(c);await c.query("set role authenticated; select set_config('request.jwt.claim.role','authenticated',false)");await c.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);return c;}
    const a=await owned(),z=await owned();
    const count=async()=>Number((await client.query('select count(*) from plaques where business_id=$1 and active',[b])).rows[0].count);
    await t.test('concurrent transactions cannot both take the last slot',async()=>{
      await a.query('begin');await a.query("insert into plaques(business_id,name) values($1,'A')",[b]);
      let finished=false;const competing=z.query("insert into plaques(business_id,name) values($1,'B')",[b]).then(()=>({ok:true}),error=>({error})).finally(()=>{finished=true;});
      await new Promise(r=>setTimeout(r,100));assert.equal(finished,false);await a.query('commit');const result=await competing;assert.match(result.error.message,/MT_PLAQUE_LIMIT/);assert.equal(await count(),5);
    });
    await t.test('inactive records, reactivation, deactivation and preserved history',async()=>{
      const inactive=(await a.query("insert into plaques(business_id,active,name) values($1,false,'Inactive') returning id",[b])).rows[0].id;
      await assert.rejects(a.query('update plaques set active=true where id=$1',[inactive]),/MT_PLAQUE_LIMIT/);
      await assert.rejects(a.query('insert into plaques(business_id) values($1)',[b]),/MT_PLAQUE_LIMIT/);
      const active=(await client.query('select id from plaques where business_id=$1 and active limit 1',[b])).rows[0].id;
      await client.query("insert into fixture_history values($1,'tap remains')",[active]);await a.query('update plaques set active=false where id=$1',[active]);await a.query('update plaques set active=true where id=$1',[inactive]);
      assert.equal(await count(),5);assert.equal((await client.query('select * from fixture_history where plaque_id=$1',[active])).rowCount,1);
    });
    await t.test('manual callers cannot edit protected state or another business',async()=>{
      await assert.rejects(a.query("update subscriptions set stripe_price_id='price_business' where business_id=$1",[b]),/permission denied/);
      await assert.rejects(a.query("update subscriptions set status='active' where business_id=$1",[b]),/permission denied/);
      await assert.rejects(a.query('update moderntap_private.plaque_usage set active_count=0'),/permission denied/);
      await assert.rejects(a.query("select reserve_plan_change($1,'price_starter')",[b]),/permission denied/);
      await z.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);await assert.rejects(z.query('insert into plaques(business_id,active) values($1,false)',[b]),/ownership/);await assert.rejects(z.query('select plaque_entitlement($1)',[b]),/ownership/);await z.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
    });
    await t.test('Growth, Pro, Business plaque 31, Custom, persisted mapping and legacy retention',async()=>{
      for(const [key,max] of [['growth',10],['pro',20],['business',30],['custom',35]]){
        await client.query('update subscriptions set stripe_price_id=$1 where business_id=$2',['price_'+key,b]);while(await count()<max)await a.query('insert into plaques(business_id) values($1)',[b]);
        await assert.rejects(a.query('insert into plaques(business_id) values($1)',[b]),/MT_PLAQUE_LIMIT/);assert.equal(await count(),max);
      }
      await client.query("update subscriptions set stripe_price_id='unmapped' where business_id=$1",[b]);await assert.rejects(a.query('insert into plaques(business_id) values($1)',[b]),/MT_ENTITLEMENT_UNCONFIGURED/);
      await client.query("update subscriptions set stripe_price_id='price_custom',status='past_due' where business_id=$1",[b]);await assert.rejects(a.query('insert into plaques(business_id) values($1)',[b]),/MT_SUBSCRIPTION_REQUIRED/);
      await client.query("update subscriptions set stripe_price_id='price_starter',status='active' where business_id=$1",[b]);assert.equal(await count(),35);await assert.rejects(a.query('insert into plaques(business_id) values($1)',[b]),/MT_PLAQUE_LIMIT/);
    });
    await t.test('rollback and insert conflicts cannot drift the counter',async()=>{
      await client.query("update subscriptions set stripe_price_id='price_custom' where business_id=$1",[b]);const id=(await client.query('select id from plaques where business_id=$1 and active limit 1',[b])).rows[0].id;
      await a.query('begin');await a.query('update plaques set active=false where id=$1',[id]);await a.query('rollback');assert.equal(await count(),35);
      await a.query('insert into plaques(id,business_id) values($1,$2) on conflict do nothing',[id,b]);assert.equal((await a.query('select plaque_entitlement($1) as info',[b])).rows[0].info.activeCount,35);
    });
    await t.test('reactivation and creation compete for the same slot; metadata stays editable',async()=>{
      const active=(await client.query('select id from plaques where business_id=$1 and active limit 1',[b])).rows[0].id;
      await a.query('update plaques set active=false where id=$1',[active]);
      await a.query('begin');await a.query('update plaques set active=true where id=$1',[active]);
      let done=false;const racing=z.query('insert into plaques(business_id) values($1)',[b]).then(()=>null,e=>e).finally(()=>{done=true;});
      await new Promise(r=>setTimeout(r,100));assert.equal(done,false);await a.query('commit');assert.match((await racing).message,/MT_PLAQUE_LIMIT/);
      await a.query("update plaques set name='Retained metadata' where id=$1",[active]);assert.equal(await count(),35);
      assert.equal((await a.query('select plaque_entitlement($1) as info',[b])).rows[0].info.activeCount,35);
    });
    await t.test('plan change lease blocks competing requests and wrong-token releases',async()=>{
      const one=(await client.query("select reserve_plan_change($1,'price_custom') as token",[b])).rows[0].token;assert.ok(one);
      assert.equal((await client.query("select reserve_plan_change($1,'price_custom') as token",[b])).rows[0].token,null);
      await client.query('select release_plan_change($1,$2)',[b,owner]);assert.equal((await client.query("select reserve_plan_change($1,'price_custom') as token",[b])).rows[0].token,null);
      await client.query('select release_plan_change($1,$2)',[b,one]);assert.ok((await client.query("select reserve_plan_change($1,'price_custom') as token",[b])).rows[0].token);
    });
  }finally{await Promise.allSettled(connections.map(c=>c.end()));if(client)await client.end();await pg.stop();fs.rmSync(temp,{recursive:true,force:true});}
});
