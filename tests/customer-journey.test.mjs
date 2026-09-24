import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
const dependency = createRequire(import.meta.url);
delete process.env.MODERNTAP_PLAQUE_ENTITLEMENTS_ENABLED;
process.env.STRIPE_SECRET_KEY = 'sk_test_fixture_only';
process.env.STRIPE_PRICE_ID = 'price_legacy_fixture';
for (const key of ['STARTER','GROWTH','PRO','BUSINESS']) process.env['STRIPE_PRICE_'+key] = 'price_'+key.toLowerCase()+'_fixture';

function setup(options={}) {
  const calls=[], stripeCalls=[];
  const database={auth:{getUser:async()=>({data:{user:options.unauth?null:{id:'owner',email:'fixture@example.test'}}})},from(table){
    const call={table,filters:[]};calls.push(call);
    const q={select(){return q},eq(k,v){call.filters.push([k,v]);return q},single:async()=>result(),maybeSingle:async()=>result()};
    function result(){ if(options.dbError) return {data:null,error:new Error('fixture database error')};return {data:table==='businesses'?(options.noBusiness?null:{id:'owned-business',name:'Fixture Business'}):options.subscription??null,error:null}; }
    return q;
  }};
  class Stripe {
    prices={retrieve:async id=>{stripeCalls.push({kind:'price',id});if(options.priceError)throw new Error('unavailable');return {id,active:!options.inactivePrice,unit_amount:options.amount??({price_starter_fixture:999,price_growth_fixture:1499,price_pro_fixture:1999,price_business_fixture:2499}[id]??2500),currency:options.currency??'usd',billing_scheme:'per_unit',recurring:{interval:options.interval??'month',interval_count:1,usage_type:'licensed'}};}};
    subscriptions={retrieve:async()=>({status:options.stripeStatus??options.subscription?.status})};
    checkout={sessions:{create:async body=>{stripeCalls.push({kind:'checkout',body});return {url:'https://checkout.stripe.test/fixture'}}}};
  }
  const cache={};
  function load(file){file=path.resolve(file);if(cache[file])return cache[file].exports;const compiled={exports:{}};cache[file]=compiled;
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    const req=name=>{
      if(name==='server-only')return {};
      if(name==='stripe')return Stripe;
      if(name==='@/lib/supabase/server')return {createClient:async()=>database};
      if(name==='@/lib/supabase/admin')return {createAdminClient:()=>database};
      if(name==='next/navigation')return {redirect:to=>{throw new Error('REDIRECT '+to)},notFound:()=>{throw new Error('NOT_FOUND')}};
      if(name==='next/link')return function MockLink({children,...props}){return React.createElement('a',props,children)};
      if(name==='@/app/components/app-shell')return function MockAppShell({children}){return React.createElement('main',null,children)};
      if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?name.slice(2):path.resolve(path.dirname(file),name);return load(fs.existsSync(base+'.ts')?base+'.ts':base+'.tsx');}
      return dependency(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(req,compiled,compiled.exports);return compiled.exports;
  }
  return {load,calls,stripeCalls};
}
async function checkout(h,body){return h.load('app/api/stripe/checkout/route.ts').POST(new Request('https://moderntap.test/api/stripe/checkout',{method:'POST',...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})}));}

test('unsubscribed business can enter tour without changing any data',async()=>{
  const h=setup();const tree=await h.load('app/tour/page.tsx').default();const html=renderToStaticMarkup(tree);
  assert.match(html,/Cedar &amp; Stone/);assert.match(html,/href="\/billing"[^>]*>Skip Tour/);assert.match(html,/Fictional demo/);
  assert.ok(h.calls.every(c=>['businesses','subscriptions'].includes(c.table)));
  assert.equal(h.stripeCalls.length,0);
});
for(const [options,destination] of [[{unauth:true},'/auth/login'],[{noBusiness:true},'/onboarding'],[{subscription:{status:'active'}},'/dashboard'],[{subscription:{status:'trialing'}},'/dashboard'],[{subscription:{status:'past_due'}},'/billing'],[{subscription:{status:'incomplete'}},'/billing']])test('journey gate redirects to '+destination,async()=>{
  const h=setup(options);await assert.rejects(h.load('lib/customer-journey.ts').requirePreSubscriptionBusiness(),error=>error.message==='REDIRECT '+destination);
});
for (const [key,price,min,max,discount,design,replacements,support] of [
  ['starter',9.99,1,5,5,1,1,'Standard Support'], ['growth',14.99,6,10,10,2,1,'Standard Support'],
  ['pro',19.99,11,20,12.5,4,2,'Priority Support'], ['business',24.99,21,30,15,6,3,'Highest Priority Support']
]) test(key+' approved terms, review and checkout match',async()=>{
  const h=setup();const {getPlan,CORE_SOFTWARE_FEATURES}=h.load('lib/plans/catalog.ts');const plan=getPlan(key);
  assert.deepEqual([plan.monthlyPrice,plan.minimumPlaques,plan.maximumPlaques,plan.initialPlaqueDiscountPercent,plan.designChangesPerYear,plan.replacementPlaquesPerYear,plan.support],[price,min,max,discount,design,replacements,support]);
  assert.equal(plan.coreSoftwareFeatures,CORE_SOFTWARE_FEATURES);
  const html=renderToStaticMarkup(await h.load('app/plans/[planKey]/review/page.tsx').default({params:Promise.resolve({planKey:key})}));
  assert.ok(html.includes('$'+price));assert.ok(html.includes(`${min}–${max} active plaques`));assert.ok(html.includes(`Save ${discount}% on your initial plaque order`));assert.match(html,/Continue to Checkout/);assert.doesNotMatch(html,/disabled=""/);
  assert.equal((await checkout(h,{planKey:key})).status,200);
  const call=h.stripeCalls.find(c=>c.kind==='checkout');assert.equal(call.body.line_items[0].price,`price_${key}_fixture`);assert.equal(call.body.metadata.business_id,'owned-business');assert.equal(call.body.subscription_data.metadata.plan_key,key);assert.equal(call.body.line_items.length,1);assert.equal(call.body.success_url,'https://moderntap.test/billing?checkout=success');
});
test('billing is the unsubscribed plan selector; /plans redirects there',async()=>{
  const h=setup();const html=renderToStaticMarkup(await h.load('app/billing/page.tsx').default({searchParams:Promise.resolve({})}));
  assert.match(html,/Choose Your ModernTap Plan/);for(const key of ['starter','growth','pro','business'])assert.ok(html.includes(`/plans/${key}/review`));assert.match(html,/31\+ active plaques/);
  await assert.rejects(h.load('app/plans/page.tsx').default(),/REDIRECT \/billing/);
});
test('Custom has negotiated terms and no checkout',async()=>{
  const h=setup();const plan=h.load('lib/plans/catalog.ts').getPlan('custom');assert.equal(plan.custom,true);assert.equal(plan.minimumPlaques,31);for(const field of ['monthlyPrice','maximumPlaques','initialPlaqueDiscountPercent','designChangesPerYear','replacementPlaquesPerYear'])assert.equal(plan[field],null);
  const html=renderToStaticMarkup(await h.load('app/plans/[planKey]/review/page.tsx').default({params:Promise.resolve({planKey:'custom'})}));assert.match(html,/Contact/);assert.doesNotMatch(html,/Continue to Checkout/);assert.equal((await checkout(h,{planKey:'custom'})).status,503);assert.equal(h.stripeCalls.length,0);
});
test('unavailable, inactive and mismatched prices cannot charge',async()=>{
  for(const options of [{priceError:true},{inactivePrice:true},{amount:2500},{currency:'eur'},{interval:'year'}]) {
    const h=setup(options);const html=renderToStaticMarkup(await h.load('app/plans/[planKey]/review/page.tsx').default({params:Promise.resolve({planKey:'starter'})}));assert.match(html,/disabled=""/);assert.match(html,/Checkout is unavailable/);
    assert.equal((await checkout(h,{planKey:'starter'})).status,503);assert.ok(!h.stripeCalls.some(c=>c.kind==='checkout'));
  }
});
test('missing and duplicate mappings fail closed without legacy fallback',async()=>{
  const original=process.env.STRIPE_PRICE_STARTER;
  try {
    for(const value of ['',process.env.STRIPE_PRICE_GROWTH]) {
      process.env.STRIPE_PRICE_STARTER=value;const h=setup();assert.equal((await checkout(h,{planKey:'starter'})).status,503);assert.equal(h.stripeCalls.length,0);
    }
  } finally {process.env.STRIPE_PRICE_STARTER=original;}
});
test('checkout rejects arbitrary prices, legacy empty requests and invalid plans',async()=>{
  for(const body of [undefined,{planKey:'moderntap'},{planKey:'bogus'},{planKey:'starter',priceId:'price_evil'},{price:'price_evil'},{},[],null,'not-json']){const h=setup();assert.equal((await checkout(h,body)).status,400);assert.ok(!h.stripeCalls.some(c=>c.kind==='checkout'));}
  const h=setup();await assert.rejects(h.load('app/plans/[planKey]/review/page.tsx').default({params:Promise.resolve({planKey:'bogus'})}),/NOT_FOUND/);
});
test('plaque capacity is informational and unknown does not mean unlimited',()=>{
  const h=setup();const {getPlan}=h.load('lib/plans/catalog.ts');const {plaqueCapacity}=h.load('lib/plans/entitlements.ts');
  assert.deepEqual(plaqueCapacity(getPlan('starter'),3),{maximum:5,remaining:2});assert.equal(plaqueCapacity(getPlan('starter'),9).remaining,0);assert.equal(plaqueCapacity(getPlan('custom'),31).remaining,null);assert.equal(plaqueCapacity(undefined,1).maximum,null);
});
test('checkout preserves existing subscription and authentication guards',async()=>{
  for(const [options,status] of [[{unauth:true},401],[{noBusiness:true},404],[{subscription:{status:'active',stripe_subscription_id:'sub_fixture'}},409],[{subscription:{status:'past_due',stripe_subscription_id:'sub_fixture'}},409]]){const h=setup(options);assert.equal((await checkout(h,{planKey:'starter'})).status,status);assert.ok(!h.stripeCalls.some(c=>c.kind==='checkout'));}
});
test('billing maps only known price IDs; legacy subscribers retain generic management',async()=>{
  for(const [id,name] of [['price_pro_fixture','Pro'],['price_legacy_fixture','ModernTap Service'],['price_old','ModernTap Service']]){
    const h=setup({subscription:{status:'active',stripe_customer_id:'cus_fixture',stripe_subscription_id:'sub_fixture',stripe_price_id:id}});
    const html=renderToStaticMarkup(await h.load('app/billing/page.tsx').default({searchParams:Promise.resolve({})}));
    assert.ok(html.includes(name));assert.doesNotMatch(html,/Choose Your ModernTap Plan/);assert.doesNotMatch(html,/href="\/billing\/change-plan"/);assert.match(html,/Manage Subscription/);if(id!=='price_pro_fixture'){assert.equal(h.stripeCalls.length,0);assert.doesNotMatch(html,/\$25/);}
  }
});
test('billing does not link unresolved nonterminal subscriptions back into a plans redirect loop',async()=>{
  const h=setup({subscription:{status:'incomplete'}});const html=renderToStaticMarkup(await h.load('app/billing/page.tsx').default({searchParams:Promise.resolve({})}));assert.doesNotMatch(html,/href="\/plans\//);assert.match(html,/Contact ModernTap/);
});
test('activation requires persisted active/trialing state and a Stripe subscription reference',async()=>{
  for(const [subscription,expected] of [[null,false],[{status:'incomplete',stripe_subscription_id:'sub_fixture'},false],[{status:'trialing'},false],[{status:'active',stripe_subscription_id:'sub_fixture'},true],[{status:'trialing',stripe_subscription_id:'sub_fixture'},true]]){
    const h=setup({subscription});const response=await h.load('app/api/billing/status/route.ts').GET();assert.deepEqual(await response.json(),{active:expected});assert.match(response.headers.get('cache-control'),/no-store/);
    assert.ok(h.calls.find(c=>c.table==='businesses').filters.some(([k,v])=>k==='owner_id'&&v==='owner'));
    assert.ok(h.calls.find(c=>c.table==='subscriptions').filters.some(([k,v])=>k==='business_id'&&v==='owned-business'));
    const html=renderToStaticMarkup(await h.load('app/billing/page.tsx').default({searchParams:Promise.resolve({checkout:'success'})}));assert.equal(html.includes('Open ModernTap'),expected);
  }
});
test('activation endpoint rejects unauthenticated and missing-business requests',async()=>{
  for(const [options,status] of [[{unauth:true},401],[{noBusiness:true},404],[{dbError:true},500]]){const h=setup(options);assert.equal((await h.load('app/api/billing/status/route.ts').GET()).status,status);}
});

test('Google Review physical benefit matches all five catalog plans and rendered summaries',async()=>{
  const h=setup();const {getPlan,googleReviewBenefit}=h.load('lib/plans/catalog.ts');
  for(const [key,count,text] of [['starter',0,'available as an add-on'],['growth',1,'1 Google Review plaque included'],['pro',1,'1 Google Review plaque included'],['business',2,'2 Google Review plaques included'],['custom',null,'custom quantity']]){
    const plan=getPlan(key);assert.equal(plan.googleReviewPlaques,count);assert.ok(googleReviewBenefit(plan).includes(text));
    const html=renderToStaticMarkup(React.createElement(h.load('components/plans/plan-summary.tsx').default,{plan}));assert.ok(html.includes(text));assert.doesNotMatch(html,/QR card|unlimited replacement/i);
  }
});
