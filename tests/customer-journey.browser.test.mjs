import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dependency=createRequire(import.meta.url);
const {webpack}=dependency('next/dist/compiled/webpack/webpack');
const chrome=process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test('tour stays local through all four steps; activation polling stops and waits for confirmation', {skip:!fs.existsSync(chrome),timeout:60000},async()=>{
  const root=process.cwd(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'moderntap-journey-'));let browser;
  try {
    fs.writeFileSync(path.join(temp,'loader.cjs'),`const ts=require(${JSON.stringify(dependency.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;};`);
    fs.writeFileSync(path.join(temp,'entry.tsx'),`
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import Selector from '@/components/plans/plan-selector';
      import Tour from '@/components/tour/tour-shell'; import Activation from '@/app/billing/activation-status';
      const root=createRoot(document.getElementById('root')); root.render(<Tour/>);
      const originalTimer=window.setTimeout.bind(window);window.setTimeout=(fn,ms,...args)=>originalTimer(fn,ms===2500?5:ms,...args);
      window.requests=[];window.confirmed=false;
      window.fetch=async(url)=>{window.requests.push(String(url));return {ok:true,json:async()=>({active:window.confirmed})};};
      window.showPlans=()=>root.render(<div style={{padding:16}}><Selector prices={{}}/></div>);
      window.startActivation=()=>root.render(<Activation initiallyActive={false}/>);
    `);
    await new Promise((resolve,reject)=>webpack({mode:'development',devtool:false,target:'web',entry:path.join(temp,'entry.tsx'),output:{path:temp,filename:'bundle.js'},resolve:{alias:{'@':root},extensions:['.tsx','.ts','.js'],modules:[path.join(root,'node_modules')]},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(temp,'loader.cjs')}]},plugins:[new webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})]},(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
    const cssDir=path.join(root,'.next/static/css');const css=fs.existsSync(cssDir)?fs.readdirSync(cssDir).filter(x=>x.endsWith('.css')).map(x=>fs.readFileSync(path.join(cssDir,x),'utf8')).join('\n'):'';
    fs.writeFileSync(path.join(temp,'index.html'),`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="./bundle.js"></script></body></html>`);
    browser=spawn(chrome,['--headless','--no-first-run','--disable-gpu','--disable-background-networking','--remote-debugging-pipe',`--user-data-dir=${path.join(temp,'profile')}`],{stdio:['ignore','ignore','ignore','pipe','pipe']});
    let id=0,buffer='',browserError;const pending=new Map(),errors=[];
    const fail=error=>{browserError=error;for(const [,reject]of pending.values())reject(error);pending.clear();};
    browser.on('error',fail);browser.on('exit',(code,signal)=>fail(new Error(`Chrome exited ${code??signal}`)));
    browser.stdio[4].on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\0'))>=0){const msg=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);if(pending.has(msg.id)){const [resolve,reject]=pending.get(msg.id);pending.delete(msg.id);if(msg.error)reject(new Error(JSON.stringify(msg.error)));else resolve(msg.result);}if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails);}});
    const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{if(browserError){reject(browserError);return;}pending.set(++id,[resolve,reject]);browser.stdio[3].write(JSON.stringify({id,method,params,sessionId})+'\0');});
    const {targetId}=await call('Target.createTarget',{url:'about:blank'});const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
    const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    const wait=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,30));}throw new Error('Timed out: '+expression+' errors: '+JSON.stringify(errors));};
    const click=text=>evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent===${JSON.stringify(text)}).click()`);
    await call('Runtime.enable',{},sessionId);await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},sessionId);
    await call('Page.navigate',{url:`file://${path.join(temp,'index.html')}`},sessionId);
    await wait("document.querySelector('h1')?.textContent==='Dashboard'");
    assert.equal(await evaluate("Array.from(document.querySelectorAll('a')).find(a=>a.textContent==='Skip Tour').getAttribute('href')"),'/billing');
    await click('Recent Activity');await wait("document.body.textContent.includes('minutes ago')");
    await click('Next →');await wait("document.querySelector('h1')?.textContent==='Plaques'");
    await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Patio Table')).click()");
    assert.equal(await evaluate("document.querySelector('#demo-destination').value"),'example.com/cedar-stone/patio');
    await click('Try Update');await wait("document.body.textContent.includes('Demo destination updated')");
    await click('Next →');await wait("document.querySelector('h1')?.textContent==='Analytics'");
    await click('Last 14 Days');await wait("document.body.textContent.includes('560')");
    await click('Last 7 Days');await wait("document.body.textContent.includes('280')");
    await click('Next →');await wait("document.querySelector('h1')?.textContent==='Smart Page'");
    await click('View Our Menu');await wait("document.body.textContent.includes('No website opened or activity recorded')");
    assert.equal(await evaluate("Array.from(document.querySelectorAll('a')).find(a=>a.textContent==='Choose Your Plan').getAttribute('href')"),'/billing');
    assert.equal(await evaluate("document.querySelectorAll('a[href*="+JSON.stringify('/t/')+"], a[href*="+JSON.stringify('/go/')+"]').length"),0);
    assert.deepEqual(await evaluate('window.requests'),[]);
    await evaluate('window.startActivation()');await wait("document.body.textContent.includes('Your subscription is still being confirmed.')");
    assert.equal(await evaluate('window.requests.length'),12);
    await new Promise(r=>setTimeout(r,200));assert.equal(await evaluate('window.requests.length'),12);
    assert.equal(await evaluate("document.querySelector('a[href=\"/dashboard\"]')===null"),true);
    await evaluate('window.confirmed=true');await click('Check Again');await wait("document.body.textContent.includes('Your ModernTap account is ready.')");
    assert.equal(await evaluate("document.querySelector('a').getAttribute('href')"),'/dashboard');
    assert.ok((await evaluate('window.requests')).every(url=>url==='/api/billing/status'));
    await evaluate('window.showPlans()');await wait("document.body.textContent.includes('Choose Your ModernTap Plan')");
    for (const width of [390,1440]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390},sessionId);
      assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),true);
      assert.equal(await evaluate("document.querySelectorAll('a[href^=\"/plans/\"]').length"),4);
      assert.equal(await evaluate("document.querySelector('a[href*=custom]')===null"),true);
    }
    assert.deepEqual(errors,[]);await call('Browser.close');
  } finally {
    if(browser&&browser.exitCode===null){browser.kill();await new Promise(resolve=>{browser.once('exit',resolve);setTimeout(resolve,2000).unref();});}
    fs.rmSync(temp,{recursive:true,force:true});
  }
});
