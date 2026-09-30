// Real Next.js SSR against a loopback-only Supabase fixture, never hosted data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
const chrome=process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const token='A'.repeat(43), businessId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

async function unusedPort() { const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const port=s.address().port;await new Promise(r=>s.close(r));return port; }
test('public results: real SSR, phone layout, token isolation and revoked/unknown HTTP 404', {skip:!fs.existsSync(chrome),timeout:60000}, async()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'moderntap-results-browser-'));
  let server,browser,backend;let output='';
  const calls=[];let enabled=true;
  const dayKey=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  // Fixture times are in UTC just for stable known dates; actual DST boundaries have unit/PG tests.
  const now=new Date(dayKey+'T12:00:00Z');
  const start=new Date(now.getTime()-13*86400000);start.setUTCHours(4,0,0,0);
  const end=new Date(start.getTime()+30*86400000);
  const plaques=Array.from({length:6},(_,i)=>({id:'p'+i,business_id:businessId,name:['Table 1','Checkbook 1','Register','Table 2','Checkbook 2','Table 3'][i],placement:['table','checkbook','register','table','checkbook','table'][i]}));
  const taps=Array.from({length:168},(_,i)=>({id:i+1,plaque_id:'p'+i%6,created_at:new Date(start.getTime()+Math.floor(i/12)*86400000+3600000).toISOString(),is_bot:false,is_repeat:false}));
  try {
    backend=http.createServer((request,response)=>{
      const url=new URL(request.url,'http://localhost');calls.push(url);
      const table=url.pathname.split('/').at(-1);let data=[];
      if(table==='businesses')data=enabled&&url.searchParams.get('pilot_share_token')==='eq.'+token&&url.searchParams.get('is_pilot')==='eq.true'?[{id:businessId,name:'Lorenzo’s',is_pilot:true,trial_started_at:start.toISOString(),trial_ends_at:end.toISOString(),pilot_reviews_start:125,pilot_reviews_end:143,pilot_rating_start:4.4,pilot_rating_end:4.6}]:[];
      if(table==='plaques')data=url.searchParams.get('business_id')==='eq.'+businessId?plaques:[];
      if(table==='tap_events') {
        assert.equal(url.searchParams.get('is_bot'),'eq.false');assert.equal(url.searchParams.get('is_repeat'),'eq.false');
        data=taps.filter(t=>t.created_at>=url.searchParams.get('created_at').slice(4));
        for(const filter of url.searchParams.getAll('created_at'))if(filter.startsWith('lt.'))data=data.filter(t=>t.created_at<filter.slice(3));
      }
      if(!['businesses','plaques','tap_events'].includes(table)){response.writeHead(500);response.end('Unexpected fixture request');return;}
      const limit=Number(url.searchParams.get('limit')??1000),offset=Number(url.searchParams.get('offset')??0);
      response.writeHead(200,{'Content-Type':'application/json','Content-Range':`0-${Math.max(0,data.length-1)}/${data.length}`});response.end(JSON.stringify(data.slice(offset,offset+limit)));
    });
    await new Promise(r=>backend.listen(0,'127.0.0.1',r));const apiPort=backend.address().port;
    const appPort=await unusedPort(),base=`http://127.0.0.1:${appPort}`;
    // NEXT_PUBLIC URLs are inlined at build time. Redirect every REST fetch to
    // this loopback fixture before Next loads, and reject all other external fetches.
    fs.writeFileSync(path.join(temp,'fixture-fetch.cjs'), `const original=global.fetch;global.fetch=(input,init)=>{const u=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);if(u.pathname.startsWith('/rest/v1/'))return original('http://127.0.0.1:${apiPort}'+u.pathname+u.search,init);if(u.hostname!=='127.0.0.1'&&u.hostname!=='localhost')throw Error('External fetch blocked by fixture');return original(input,init);};`);
    server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(appPort)],{
      cwd:process.cwd(),env:{...process.env,NODE_ENV:'production',NODE_OPTIONS:'--require '+path.join(temp,'fixture-fetch.cjs'),NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${apiPort}`,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture',SUPABASE_SERVICE_ROLE_KEY:'fixture-service-role',MODERNTAP_APP_URL:base,MODERNTAP_ADMIN_USER_IDS:'fixture-admin'},stdio:['ignore','pipe','pipe'],
    });
    server.stdout.on('data',s=>{output+=s;});server.stderr.on('data',s=>{output+=s;});
    for(let i=0;i<200&&!output.includes('Ready in');i++){if(server.exitCode!==null)throw new Error(output);await new Promise(r=>setTimeout(r,30));}
    const response=await fetch(base+'/r/'+token);assert.equal(response.status,200,output);
    const html=await response.text();assert.ok(html.includes('Lorenzo'),output);assert.match(html,/noindex/);assert.match(response.headers.get('cache-control'),/no-store/);
    assert.equal(response.headers.get('referrer-policy'),'no-referrer');
    browser=spawn(chrome,['--headless','--no-first-run','--disable-gpu','--disable-background-networking','--remote-debugging-pipe',`--user-data-dir=${path.join(temp,'profile')}`],{stdio:['ignore','ignore','ignore','pipe','pipe']});
    let id=0,buffer='',browserError;const pending=new Map(),errors=[];
    const fail=error=>{browserError=error;for(const [,reject]of pending.values())reject(error);pending.clear();};
    browser.on('error',fail);browser.on('exit',(code,signal)=>fail(new Error(`Chrome exited ${code??signal}`)));
    browser.stdio[4].on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\0'))>=0){const msg=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);if(pending.has(msg.id)){const [resolve,reject]=pending.get(msg.id);pending.delete(msg.id);if(msg.error)reject(new Error(JSON.stringify(msg.error)));else resolve(msg.result);}if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails);}});
    const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{if(browserError){reject(browserError);return;}pending.set(++id,[resolve,reject]);browser.stdio[3].write(JSON.stringify({id,method,params,sessionId})+'\0');});
    const {targetId}=await call('Target.createTarget',{url:'about:blank'});const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
    const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    const wait=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,30));}throw new Error('Timed out: '+expression+' errors: '+JSON.stringify(errors));};
    await call('Runtime.enable',{},sessionId);await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},sessionId);
    await call('Page.navigate',{url:base+'/r/'+token},sessionId);
    await wait("document.querySelector('h1')?.textContent==='Lorenzo’s'");
    for(const width of [320,390,768,1024,1440,1920]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500},sessionId);
      await evaluate('document.fonts.ready');
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'width '+width);
      assert.ok(await evaluate("document.querySelector('[aria-label=\"Tap totals\"]').getBoundingClientRect().bottom<650"));
      if(process.env.MODERNTAP_SCREENSHOT_DIR){fs.mkdirSync(process.env.MODERNTAP_SCREENSHOT_DIR,{recursive:true});const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true},sessionId);fs.writeFileSync(path.join(process.env.MODERNTAP_SCREENSHOT_DIR,`results-${width}.png`),Buffer.from(shot.data,'base64'));}
    }
    await evaluate("document.querySelector('summary').click()");assert.equal(await evaluate("document.querySelector('details').open"),true);
    for(const value of ['bad','B'.repeat(43)])assert.equal((await fetch(base+'/r/'+value)).status,404,value);
    enabled=false;
    const disabled=await fetch(base+'/r/'+token);assert.equal(disabled.status,404);assert.doesNotMatch(await disabled.text(),/Lorenzo/);
    assert.ok(calls.filter(u=>u.pathname.endsWith('plaques')).every(u=>u.searchParams.get('business_id')==='eq.'+businessId));
    assert.deepEqual(errors,[]);await call('Browser.close');
  }finally{
    for(const child of [browser,server])if(child&&child.exitCode===null){child.kill();await new Promise(r=>{child.once('exit',r);setTimeout(r,2000).unref();});}
    if(backend)await new Promise(r=>backend.close(r));
    fs.rmSync(temp,{recursive:true,force:true});
  }
});
