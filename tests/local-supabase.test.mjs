import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { assertLocalStatus, validateSandbox, isolatedEnvironment, mappingSql } from '../scripts/local-supabase/helpers.mjs';
const require=createRequire(import.meta.url);
const local={API_URL:'http://127.0.0.1:54321',DB_URL:'postgresql://postgres:fixture@127.0.0.1:54322/postgres',ANON_KEY:'local_anon_fixture',SERVICE_ROLE_KEY:'local_service_fixture'};
const sandbox={STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',STRIPE_PRICE_STARTER:'price_starter',STRIPE_PRICE_GROWTH:'price_growth',STRIPE_PRICE_PRO:'price_pro',STRIPE_PRICE_BUSINESS:'price_business'};
test('only expected loopback Supabase endpoints are accepted',()=>{
  assertLocalStatus(local);
  for(const status of [{...local,API_URL:'https://production.example.test'},{...local,DB_URL:'postgresql://x:fixture@production.example.test:54322/postgres'},{...local,DB_URL:'postgresql://x:fixture@127.0.0.1:6543/postgres'}])assert.throws(()=>assertLocalStatus(status),/non-local/);
});
test('Stripe live keys, missing IDs and SQL injection in IDs are refused',()=>{
  validateSandbox(sandbox);
  for(const env of [{...sandbox,STRIPE_SECRET_KEY:'sk_live_fixture'},{...sandbox,STRIPE_PRICE_STARTER:''},{...sandbox,STRIPE_PRICE_STARTER:"price_';drop table x;--"},{...sandbox,STRIPE_PRICE_GROWTH:sandbox.STRIPE_PRICE_STARTER}])assert.throws(()=>validateSandbox(env));
});
test('Next dotenv loading cannot restore production Supabase or unlisted production values',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'moderntap-local-env-'));
  try{
    const production='NEXT_PUBLIC_SUPABASE_URL=https://production.example.test\nSUPABASE_SERVICE_ROLE_KEY=production_fixture\nUNLISTED_PRODUCTION_SECRET=do_not_inherit\n';
    fs.writeFileSync(path.join(root,'.env.local'),production);
    fs.writeFileSync(path.join(root,'.env.development.local'),'STRIPE_SECRET_KEY=sk_live_fixture\nANOTHER_PRODUCTION_SECRET=do_not_inherit\n');
    const env=isolatedEnvironment(root,sandbox,local);
    assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,local.API_URL);assert.equal(env.SUPABASE_SERVICE_ROLE_KEY,local.SERVICE_ROLE_KEY);assert.equal(env.UNLISTED_PRODUCTION_SECRET,'');assert.equal(env.ANOTHER_PRODUCTION_SECRET,'');
    const child=spawnSync(process.execPath,['-e',`require(${JSON.stringify(require.resolve('@next/env'))}).loadEnvConfig(process.argv[1],true,{info(){},error(){}});console.log(JSON.stringify({local:process.env.NEXT_PUBLIC_SUPABASE_URL==='http://127.0.0.1:54321',sandbox:process.env.STRIPE_SECRET_KEY==='sk_test_fixture',cleared:process.env.UNLISTED_PRODUCTION_SECRET===''&&process.env.ANOTHER_PRODUCTION_SECRET===''}));`,root],{env,encoding:'utf8'});
    assert.equal(child.status,0);assert.deepEqual(JSON.parse(child.stdout.trim()),{local:true,sandbox:true,cleared:true});
    assert.equal(fs.readFileSync(path.join(root,'.env.local'),'utf8'),production);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('local mapping SQL contains exactly the four approved limits and is transactional',()=>{
  const sql=mappingSql(sandbox);assert.match(sql,/^begin;/);assert.match(sql,/commit;/);for(const [key,max]of [['starter',5],['growth',10],['pro',20],['business',30]])assert.ok(sql.includes(`'price_${key}','${key}',${max}`));assert.doesNotMatch(sql,/custom|legacy/);
});
