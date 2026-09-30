import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { pilotHarness, businessId } from './helpers/admin-pilot-harness.mjs';
process.env.MODERNTAP_ADMIN_USER_IDS = 'admin-fixture';
process.env.MODERNTAP_APP_URL = 'https://pilot.example.test';
const shareRoute = 'app/api/admin/pilots/[businessId]/share/route.ts';
const reviewRoute = 'app/api/admin/pilots/[businessId]/results/route.ts';
const context = { params: Promise.resolve({ businessId }) };
const req = (body = {}, method = 'POST') => new Request('https://pilot.example.test/api', { method, body: JSON.stringify(body) });
const token = 'A'.repeat(43);

for (const marker of ['facebookexternalhit','Facebot','Twitterbot','Slackbot','LinkedInBot','WhatsApp','TelegramBot','Discordbot','Googlebot','bingbot','crawler','spider','bot/']) test('case-insensitive bot marker: ' + marker, () => {
  const { isBotTap } = pilotHarness().load('lib/tap-classification.ts');
  assert.equal(isBotTap('Mozilla/5.0 ' + marker.toUpperCase() + ' 1.0'), true);
});
test('human, absent UA and HEAD classification', () => {
  const { isBotTap } = pilotHarness().load('lib/tap-classification.ts');
  for (const agent of [null, '', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1']) assert.equal(isBotTap(agent), false);
  assert.equal(isBotTap(null, 'HEAD'), true); assert.equal(isBotTap('Mozilla/5.0', 'head'), true);
});
test('bots and HEAD still redirect and are recorded with is_bot', async () => {
  for (const [method, agent, bot] of [['GET','Twitterbot',true], ['HEAD','Mozilla/5.0',true], ['GET','Mozilla/5.0',false]]) {
    const h = pilotHarness(); h.state.plaques = [{ id:'p', code:'CODE', active:true, mode:'direct_link', destination_url:'https://example.test/review' }];
    const route = h.load('app/t/[code]/route.ts');
    const response = await route[method](new Request('https://example.test/t/CODE', { method, headers:{'user-agent':agent} }), { params:Promise.resolve({code:'CODE'}) });
    assert.equal(response.status,307); assert.equal(response.headers.get('location'),'https://example.test/review'); assert.equal(h.state.taps[0].is_bot,bot);
  }
});
for (const [date, days, start, end] of [
  ['2026-09-29',30,'2026-09-29T04:00:00.000Z','2026-10-29T04:00:00.000Z'],
  ['2026-03-08',1,'2026-03-08T05:00:00.000Z','2026-03-09T04:00:00.000Z'],
  ['2026-11-01',1,'2026-11-01T04:00:00.000Z','2026-11-02T05:00:00.000Z'],
  ['2026-10-20',30,'2026-10-20T04:00:00.000Z','2026-11-19T05:00:00.000Z'],
]) test('Eastern calendar trial boundaries: ' + date, () => {
  const { pilotInput } = pilotHarness().load('lib/pilot-input.ts');
  const input = pilotInput({name:'Pilot',startDate:date,days});
  assert.equal(input.trial_started_at,start);assert.equal(input.trial_ends_at,end);
});
test('window clamps before/after trial, counts calendar days across DST, scopes plaques and buckets by Eastern date', () => {
  const h = pilotHarness({business:{trial_started_at:'2026-03-01T05:00:00Z',trial_ends_at:'2026-03-31T04:00:00Z'}});
  const { summarizePilot } = h.load('lib/pilot-results.ts');
  const plaques=[{id:'p1',name:'Table 1',placement:'table'},{id:'p2',name:'Checkbook',placement:'checkbook'},{id:'p3',name:'Unplaced',placement:null}];
  const taps=[['p1','2026-03-01T04:59:59Z'],['p1','2026-03-01T05:00:00Z'],['p1','2026-03-08T04:59:59Z'],['p2','2026-03-08T05:00:00Z'],['p3','2026-03-09T04:00:00Z'],['p2','2026-03-31T04:00:00Z'],['foreign','2026-03-09T04:00:00Z']].map(([plaque_id,created_at])=>({plaque_id,created_at}));
  const r=summarizePilot(h.state.business,plaques,taps,new Date('2026-03-09T12:00:00Z'));
  assert.equal(r.day,9);assert.equal(r.length,30);assert.equal(r.total,4);assert.equal(r.week,3);
  assert.equal(r.days.find(d=>d.date==='2026-03-07').taps,1);assert.equal(r.days.find(d=>d.date==='2026-03-08').taps,1);
  assert.deepEqual(r.byPlacement.map(p=>[p.placement,p.taps,p.share]),[['table',2,50],['checkbook',1,25],['register',0,0],['other',1,25]]);
  const before=summarizePilot(h.state.business,plaques,taps,new Date('2026-02-28T12:00:00Z'));assert.equal(before.day,0);assert.equal(before.total,0);
  const after=summarizePilot(h.state.business,plaques,taps,new Date('2026-04-10T12:00:00Z'));assert.equal(after.day,30);assert.equal(after.total,4);assert.equal(after.week,0);
  assert.equal(summarizePilot({...h.state.business,is_pilot:false},plaques,taps),null);
});
test('shared query excludes bots/repeats, respects trial window and business scope, paginates past 1000', async () => {
  const h=pilotHarness({business:{pilot_share_token:token,trial_started_at:'2026-01-01T05:00:00Z',trial_ends_at:'2026-01-31T05:00:00Z'}});
  h.state.plaques=[{id:'p',name:'Table',business_id:businessId,placement:'table'},{id:'foreign',name:'Other restaurant',business_id:'other',placement:'table'}];
  h.state.taps=Array.from({length:1005},(_,i)=>({id:i,plaque_id:'p',created_at:'2026-01-02T12:00:00Z',is_bot:false,is_repeat:false}));
  h.state.taps.push({plaque_id:'p',created_at:'2026-01-02T12:00:00Z',is_bot:true},{plaque_id:'p',created_at:'2026-01-02T12:00:00Z',is_repeat:true},{plaque_id:'foreign',created_at:'2026-01-02T12:00:00Z'},{plaque_id:'p',created_at:'2026-02-01T12:00:00Z'});
  const r=await h.load('lib/pilot-results-server.ts').sharedPilotResults(token);assert.equal(r.total,1005);assert.equal(r.plaques.length,1);
  for(const c of h.calls.filter(c=>c.table==='tap_events')){assert.ok(c.filters.some(([k,v])=>k==='is_bot'&&v===false));assert.ok(c.filters.some(([k,v])=>k==='is_repeat'&&v===false));}
});
for(const options of [{unauth:true},{user:'customer'}]) test('share/review mutations require admin before service access: '+JSON.stringify(options),async()=>{
  const h=pilotHarness(options);
  for(const [route,method]of [[shareRoute,'POST'],[shareRoute,'DELETE'],[reviewRoute,'PATCH']])assert.equal((await h.load(route)[method](req(),context)).status,403);
  assert.equal(h.adminCalls,0);
});
test('share creation is stable, 32-byte random, scoped; disable invalidates lookup; recreate changes token',async()=>{
  const h=pilotHarness();const route=h.load(shareRoute);
  const response=await route.POST(req(),context);assert.equal(response.status,200);
  const url=(await response.json()).url;const first=h.state.business.pilot_share_token;
  assert.match(first,/^[A-Za-z0-9_-]{43}$/);assert.equal(Buffer.from(first,'base64url').length,32);assert.equal(url,'https://pilot.example.test/r/'+first);
  await route.POST(req(),context);assert.equal(h.state.business.pilot_share_token,first);
  assert.equal((await route.DELETE(req(),context)).status,200);assert.equal(h.state.business.pilot_share_token,null);
  assert.equal(await h.load('lib/pilot-results-server.ts').sharedPilotResults(first),null);
  await route.POST(req(),context);assert.notEqual(h.state.business.pilot_share_token,first);
});
test('unknown, disabled, malformed and non-pilot shares return 404; admin results are pilot only',async()=>{
  for(const options of [{},{business:{pilot_share_token:token,is_pilot:false}},{business:{pilot_share_token:'B'.repeat(43)}}]) {
    const h=pilotHarness(options);await assert.rejects(h.load('app/r/[token]/page.tsx').default({params:Promise.resolve({token})}),/NOT_FOUND/);
  }
  const h=pilotHarness();await assert.rejects(h.load('app/r/[token]/page.tsx').default({params:Promise.resolve({token:'bad'})}),/NOT_FOUND/);assert.equal(h.adminCalls,0);
  const nonPilot=pilotHarness({business:{is_pilot:false}});
  await assert.rejects(nonPilot.load('app/admin/pilots/[businessId]/results/page.tsx').default(context),/NOT_FOUND/);
  assert.equal((await nonPilot.load(shareRoute).POST(req(),context)).status,404);
  assert.equal((await nonPilot.load(reviewRoute).PATCH(req({reviews:20,rating:4.5}),context)).status,404);
  await assert.rejects(pilotHarness({user:'customer'}).load('app/admin/pilots/[businessId]/results/page.tsx').default(context),/REDIRECT/);
});
test('public HTML exposes only requested data, top 5 names, and noindex metadata',async()=>{
  const h=pilotHarness({business:{pilot_share_token:token,pilot_notes:'SECRET-NOTES',owner_id:'SECRET-OWNER',trial_started_at:'2026-01-01T05:00:00Z',trial_ends_at:'2026-01-31T05:00:00Z',pilot_reviews_end:143,pilot_rating_end:4.6}});
  h.state.plaques=Array.from({length:6},(_,i)=>({id:'PRIVATE-ID-'+i,business_id:businessId,name:'Plaque '+i,placement:'table',code:'SECRET-CODE-'+i,destination_url:'https://SECRET-DESTINATION.test'}));
  const page=h.load('app/r/[token]/page.tsx');const html=renderToStaticMarkup(await page.default({params:Promise.resolve({token})}));
  assert.match(html,/Lorenzo/);assert.match(html,/143/);assert.match(html,/Powered by ModernTap/);assert.match(html,/not confirmed reviews/);
  for(const secret of ['SECRET','PRIVATE-ID',businessId,token,'Plaque 5','subscription','4.6'])assert.ok(!html.includes(secret),secret);
  assert.equal(page.metadata.robots.index,false);
  const lookup=h.calls.find(c=>c.table==='businesses');assert.ok(lookup.filters.some(([k,v])=>k==='pilot_share_token'&&v===token));assert.ok(!lookup.columns.includes('notes'));
});
test('review form route saves only permitted fields and displays deltas',async()=>{
  const h=pilotHarness();const route=h.load(reviewRoute);
  assert.equal((await route.PATCH(req({reviews:143,rating:4.6}),context)).status,200);
  assert.equal(h.state.business.pilot_reviews_end,143);
  const html=renderToStaticMarkup(await h.load('app/admin/pilots/[businessId]/results/page.tsx').default(context));assert.match(html,/\+18/);assert.match(html,/4.5 → 4.6/);
  for(const input of [{reviews:-1,rating:4},{reviews:2.5,rating:4},{reviews:1,rating:0},{reviews:1,rating:6},{reviews:1,rating:4,is_pilot:false},{reviews:1}])assert.equal((await route.PATCH(req(input),context)).status,400);
  assert.equal((await route.PATCH(req({reviews:null,rating:null}),context)).status,200);
});
test('all existing reporting pages use clean queries and exclude bot/repeat activity',async()=>{
  const h=pilotHarness();h.state.plaques=[{id:'p',name:'Table',business_id:businessId,code:'CODE',active:true,purpose:'review',created_at:'2026-01-01'}];
  const time=new Date(Date.now()-1000).toISOString();h.state.taps=[{plaque_id:'p',created_at:time},{plaque_id:'p',created_at:time,is_bot:true},{plaque_id:'p',created_at:time,is_repeat:true}];
  for(const [file,args]of [['app/admin/businesses/[businessId]/page.tsx',context],['app/admin/businesses/[businessId]/plaques/[plaqueId]/page.tsx',{params:Promise.resolve({businessId,plaqueId:'p'})}],['app/dashboard/page.tsx',undefined],['app/analytics/page.tsx',{searchParams:Promise.resolve({})}]]) {
    const before=h.calls.length;await h.load(file).default(args);
    for(const c of h.calls.slice(before).filter(c=>c.table==='tap_events')){assert.ok(c.filters.some(([k,v])=>k==='is_bot'&&v===false),file);assert.ok(c.filters.some(([k,v])=>k==='is_repeat'&&v===false),file);}
  }
  const {data,count}=await h.load('lib/clean-tap-events.ts').cleanTapEvents(h.db,{count:'exact'});assert.equal(count,1);assert.equal(data.length,1);
});
test('future raw tap reads cannot bypass the shared filter',()=>{
  function scan(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?scan(path.join(dir,e.name)):[path.join(dir,e.name)]);}
  const raw=scan('app').concat(scan('lib')).filter(file=>/\.(ts|tsx)$/.test(file)&&/\.from\(["']tap_events["']\)/.test(fs.readFileSync(file,'utf8'))).sort();
  assert.deepEqual(raw,['app/t/[code]/route.ts','lib/clean-tap-events.ts']);
});

test('public proxy gate returns plain 404 and no-store before streamed rendering',async()=>{
  for(const enabled of [true,false]){
    const h=pilotHarness({business:{pilot_share_token:enabled?token:null}});
    const response=await h.load('lib/supabase/proxy.ts').updateSession(new NextRequest('https://example.test/r/'+token));
    assert.equal(response.status,enabled?200:404);assert.match(response.headers.get('cache-control'),/no-store/);
    assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
    if(!enabled)assert.equal(await response.text(),'Page not found.');
  }
});
