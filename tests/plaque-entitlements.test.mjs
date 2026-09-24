import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const dependency=createRequire(import.meta.url);
process.env.STRIPE_SECRET_KEY='sk_test_fixture';
process.env.MODERNTAP_PLAQUE_ENTITLEMENTS_ENABLED='true';
for(const key of ['starter','growth','pro','business'])process.env['STRIPE_PRICE_'+key.toUpperCase()]='price_'+key;
function setup(options={}){
  const calls=[],stripeCalls=[];
  const state={count:options.count??4,limit:options.limit??5,active:options.active??false,price:options.price??'price_starter',status:options.status??'active'};
  const admin={from:table=>query(table),rpc:async(name,args)=>{calls.push({rpc:name,args});if(name==='plaque_entitlement')return {data:options.unconfigured?null:{activeCount:state.count,maximum:state.limit,planKey:state.price.replace('price_','')}};if(name==='configured_plaque_limit')return {data:options.targetUnconfigured?null:{price_growth:10,price_pro:20,price_business:30}[args.p_price_id]};if(name==='reserve_plan_change')return {data:options.locked?null:'lease-fixture'};return {data:null};}};
  const client={...admin,auth:{getUser:async()=>({data:{user:options.unauth?null:{id:'owner'}}})}};
  function query(table){
    let mutation,filters=[];
    const q={order(){return q},select(){return q},eq(k,v){filters.push([k,v]);return q},insert(value){mutation={kind:'insert',value};return q},update(value){mutation={kind:'update',value};return q},single:async()=>result(),maybeSingle:async()=>result(),then(resolve,reject){return Promise.resolve(result()).then(resolve,reject)}};
    function result(){
      calls.push({table,mutation,filters});
      if(mutation){if(options.dbLimit)return {error:{message:'MT_PLAQUE_LIMIT'}};return {data:{id:'new-plaque'},error:null};}
      if(table==='businesses')return {data:options.noBusiness?null:{id:'business',name:'Fixture'}};
      if(table==='plaques'&&options.list)return {data:[]};
      if(table==='plaques')return {data:(options.wrongPlaque||options.inactivePublic)?null:{id:'plaque',active:state.active}};
      return {data:{status:state.status,stripe_subscription_id:'sub_fixture',stripe_customer_id:'cus_fixture',stripe_price_id:state.price}};
    }return q;
  }
  class Stripe{
    prices={retrieve:async id=>({id,active:true,unit_amount:{price_growth:1499,price_pro:1999,price_business:2499}[id],currency:'usd',billing_scheme:'per_unit',recurring:{interval:'month',interval_count:1,usage_type:'licensed'}})};
    subscriptions={retrieve:async id=>{stripeCalls.push({kind:'retrieve',id});return {id,collection_method:'charge_automatically',customer:options.wrongCustomer?'cus_other':'cus_fixture',status:state.status,items:{data:[{id:'si_existing',price:{id:options.livePrice??state.price,currency:'usd',unit_amount:{price_starter:999,price_growth:1499,price_pro:1999,price_business:2499}[state.price],recurring:{interval:'month',interval_count:1}},quantity:1}]},pending_update:options.pending?{}:null};},update:async(id,body,opts)=>{stripeCalls.push({kind:'update',id,body,opts});return {pending_update:options.paymentPending?{}:null};}};
    billingPortal={configurations:{list:async()=>({data:[{id:'bpc_fixture',active:true,features:{subscription_update:{enabled:!!options.portalUpdates}}}]})},sessions:{create:async body=>{stripeCalls.push({kind:'portal',body});return {url:'https://billing.stripe.test/session'};}}};
    checkout={sessions:{create(){throw new Error('Upgrade must not create Checkout')}}};
  }
  const cache={};
  function load(file){file=path.resolve(file);if(cache[file])return cache[file].exports;const compiled={exports:{}};cache[file]=compiled;
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    const req=name=>{
      if(name==='server-only')return {};
      if(name==='stripe')return Stripe;
      if(name==='@/lib/supabase/server')return {createClient:async()=>client};
      if(name==='@/lib/supabase/admin')return {createAdminClient:()=>admin};
      if(name==='@/lib/require-subscription')return {requireSubscription:async()=>({supabase:client,business:{id:'business',name:'Fixture'}})};
      if(name==='next/navigation')return {useRouter:()=>({refresh(){},push(){}}),redirect:to=>{throw new Error('REDIRECT '+to)}};
      if(name==='next/link')return function MockLink({children,...props}){return React.createElement('a',props,children)};
      if(name==='@/app/components/app-shell')return function MockShell({children}){return React.createElement('main',null,children)};
      if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?name.slice(2):path.resolve(path.dirname(file),name);return load(fs.existsSync(base+'.ts')?base+'.ts':base+'.tsx');}
      return dependency(name);
    };vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(req,compiled,compiled.exports);return compiled.exports;
  }
  return {load,state,calls,stripeCalls};
}
const req=body=>new Request('https://example.test/api',{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}});
const newPlaque={name:'Fixture',destination:'https://example.test/menu',purpose:'general'};
const create=h=>h.load('app/api/plaques/route.ts').POST(req(newPlaque));
const status=(h,active)=>h.load('app/api/plaques/[id]/status/route.ts').PATCH(req({active}),{params:Promise.resolve({id:'plaque'})});
const upgrade=(h,body)=>h.load('app/api/stripe/change-plan/route.ts').POST(req(body));
for(const [plan,limit] of [['starter',5],['growth',10],['pro',20],['business',30]])test(plan+' blocks creation and reactivation at capacity',async()=>{
  const h=setup({count:limit,limit,price:'price_'+plan});assert.equal((await create(h)).status,409);assert.equal((await status(h,true)).status,409);assert.ok(!h.calls.some(c=>c.mutation));
});
test('direct /plaques/new displays blocked state with no create form',async()=>{
  const h=setup({count:5});const html=renderToStaticMarkup(await h.load('app/plaques/new/page.tsx').default());assert.match(html,/Upgrade to Growth/);assert.doesNotMatch(html,/<form/);
});
test('API permits capacity but reports atomic DB rejection after a racing request',async()=>{
  const h=setup({dbLimit:true});assert.equal((await create(h)).status,409);assert.match((await (await status(h,true)).json()).error,/5-plaque limit/);
});
test('deactivation changes only active; activation respects owned plaque lookup',async()=>{
  const h=setup({count:5,active:true});assert.equal((await status(h,false)).status,200);
  const change=h.calls.find(c=>c.mutation);assert.deepEqual(change.mutation.value,{active:false});assert.ok(change.filters.some(([k,v])=>k==='business_id'&&v==='business'));
  assert.equal((await status(setup({wrongPlaque:true}),true)).status,404);
});
test('creation takes business from auth, rejects injected entitlement and allows room',async()=>{
  const h=setup();assert.equal((await create(h)).status,201);assert.equal(h.calls.find(c=>c.mutation).mutation.value.business_id,'business');
  const response=await h.load('app/api/plaques/route.ts').POST(req({...newPlaque,business_id:'other',maximum:99}));assert.equal(response.status,400);
  assert.equal((await create(setup({unauth:true}))).status,401);assert.equal((await create(setup({unconfigured:true}))).status,409);
});
test('upgrade updates existing subscription item and only webhook persistence changes entitlement',async()=>{
  const h=setup();assert.equal((await upgrade(h,{planKey:'growth'})).status,200);const change=h.stripeCalls.find(c=>c.kind==='update');assert.equal(change.id,'sub_fixture');assert.deepEqual(change.body.items,[{id:'si_existing',price:'price_growth',quantity:1}]);assert.equal(change.body.payment_behavior,'pending_if_incomplete');assert.equal(change.body.proration_behavior,'always_invoice');assert.match(change.opts.idempotencyKey,/lease-fixture/);
  assert.equal(h.state.price,'price_starter');assert.equal(h.state.limit,5);assert.ok(!h.calls.some(c=>c.table==='subscriptions'&&c.mutation));
});
test('upgrade rejects client IDs, invalid keys, Custom, stale price, pending update and wrong customer',async()=>{
  for(const body of [{priceId:'price_evil'},{planKey:'growth',priceId:'price_evil'},{planKey:'bad'}])assert.equal((await upgrade(setup(),body)).status,400);
  for(const [opts,key] of [[{},'custom'],[{livePrice:'price_pro'},'growth'],[{pending:true},'growth'],[{wrongCustomer:true},'growth'],[{locked:true},'growth'],[{status:'past_due'},'growth'],[{price:'price_old'},'growth']]){const h=setup(opts);assert.equal((await upgrade(h,{planKey:key})).status,409);assert.ok(!h.stripeCalls.some(c=>c.kind==='update'));}
});
test('missing target database mapping blocks upgrade; payment failure stays pending',async()=>{
  assert.equal((await upgrade(setup({targetUnconfigured:true}),{planKey:'growth'})).status,503);
  const h=setup({paymentPending:true});assert.equal((await (await upgrade(h,{planKey:'growth'})).json()).pendingPayment,true);assert.equal(h.state.limit,5);
});
test('downgrade gives exact excess count and remains manual even when it fits',async()=>{
  const h=setup({count:23,limit:30,price:'price_business'});const r=await upgrade(h,{planKey:'pro'});assert.equal(r.status,409);assert.match((await r.json()).error,/Deactivate at least 3/);
  const r2=await upgrade(setup({count:10,limit:30,price:'price_business'}),{planKey:'pro'});assert.equal(r2.status,409);assert.match((await r2.json()).error,/end-of-period/);
});

test('inactive public tap does not redirect or record an event',async()=>{
  const h=setup({inactivePublic:true});const r=await h.load('app/t/[code]/route.ts').GET(new Request('https://example.test/t/INACTIVE'),{params:Promise.resolve({code:'INACTIVE'})});
  assert.equal(r.status,404);assert.ok(h.calls.some(c=>c.table==='plaques'&&c.filters.some(([k,v])=>k==='active'&&v===true)));assert.ok(!h.calls.some(c=>c.table==='tap_events'));
});

test('portal preserves billing management but cannot bypass controlled plan changes',async()=>{
  for(const [portalUpdates,status] of [[false,200],[true,409]]){
    const h=setup({portalUpdates});const r=await h.load('app/api/stripe/portal/route.ts').POST(req({}));assert.equal(r.status,status);
    assert.equal(h.stripeCalls.some(c=>c.kind==='portal'),!portalUpdates);
  }
});

test('flag defaults off: legacy creation works with no new RPCs, status/upgrades are inaccessible',async()=>{
  const previous=process.env.MODERNTAP_PLAQUE_ENTITLEMENTS_ENABLED;
  try {
    for(const value of [undefined,'false','TRUE','1','']) {
      if(value===undefined)delete process.env.MODERNTAP_PLAQUE_ENTITLEMENTS_ENABLED;else process.env.MODERNTAP_PLAQUE_ENTITLEMENTS_ENABLED=value;
      const h=setup({unconfigured:true,count:500});
      assert.equal(h.load('lib/plans/entitlements-enabled.ts').plaqueEntitlementsEnabled(),false);
      assert.equal((await create(h)).status,201);
      assert.equal((await status(h,false)).status,404);assert.equal((await status(h,true)).status,404);
      assert.equal((await upgrade(h,{planKey:'growth'})).status,404);
      await h.load('lib/plans/plaque-entitlement.ts').readPlaqueEntitlement('business');
      const html=renderToStaticMarkup(await h.load('app/plaques/new/page.tsx').default());assert.match(html,/<form/);assert.doesNotMatch(html,/Upgrade to|plaques active/);
      await assert.rejects(h.load('app/billing/change-plan/page.tsx').default(),/REDIRECT \/billing/);
      const list=setup({list:true});const listHtml=renderToStaticMarkup(await list.load('app/plaques/page.tsx').default());assert.match(listHtml,/Add Plaque/);assert.doesNotMatch(listHtml,/Active plaque allowance|of .* plaques active/);assert.ok(!list.calls.some(c=>c.rpc));
      assert.ok(!h.calls.some(c=>c.rpc));assert.equal(h.stripeCalls.length,0);
    }
  }finally{process.env.MODERNTAP_PLAQUE_ENTITLEMENTS_ENABLED=previous;}
});
test('flag off preserves original Stripe Portal session behavior',async()=>{
  delete process.env.MODERNTAP_PLAQUE_ENTITLEMENTS_ENABLED;
  try{const h=setup({portalUpdates:true});assert.equal((await h.load('app/api/stripe/portal/route.ts').POST(req({}))).status,200);assert.equal(h.stripeCalls.find(c=>c.kind==='portal').body.configuration,undefined);}finally{process.env.MODERNTAP_PLAQUE_ENTITLEMENTS_ENABLED='true';}
});
