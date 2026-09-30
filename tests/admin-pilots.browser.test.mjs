import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import { pilotHarness, businessId } from './helpers/admin-pilot-harness.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dependency = createRequire(import.meta.url);
const { webpack } = dependency('next/dist/compiled/webpack/webpack');
const chrome = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
process.env.MODERNTAP_ADMIN_USER_IDS = 'admin-fixture';
process.env.MODERNTAP_APP_URL = 'https://pilot.example.test';

test('admin pilot forms, copy feedback and responsive page layouts', { skip: !fs.existsSync(chrome), timeout: 60000 }, async () => {
  const root = process.cwd(), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'moderntap-pilot-browser-'));
  let browser;
  try {
    const h = pilotHarness({ islands: true });
    h.state.plaques = ['table', 'checkbook'].map((placement, i) => ({ id: 'plaque-' + i, name: placement === 'table' ? 'Table 1' : 'Checkbook 1', code: String(i).padStart(32, 'A'), business_id: businessId, placement, active: true, created_at: '2026-09-29T12:00:00Z', destination_url: 'https://g.page/r/fixture/review' }));
    h.state.taps = [{ plaque_id: 'plaque-0', created_at: '2026-09-29T12:15:00Z' }];
    const newHtml = renderToStaticMarkup(await h.load('app/admin/pilots/new/page.tsx').default());
    const businessHtml = renderToStaticMarkup(await h.load('app/admin/businesses/[businessId]/page.tsx').default({ params: Promise.resolve({ businessId }) }));
    fs.writeFileSync(path.join(temp, 'loader.cjs'), `const ts=require(${JSON.stringify(dependency.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;};`);
    fs.writeFileSync(path.join(temp, 'entry.tsx'), `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
      import {NewPilotForm} from '@/app/admin/pilots/new/pilot-form';
      import {AddPilotPlaquesForm,PlaqueTapUrl,RefreshPilotActivity} from '@/app/admin/businesses/[businessId]/pilot-plaques';
      const components={NewPilotForm,AddPilotPlaquesForm,PlaqueTapUrl,RefreshPilotActivity};
      window.requests=[];window.routes=[];window.refreshes=0;window.fail=false;window.copyFail=false;
      Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{if(window.copyFail)throw Error('Unavailable');window.copied=text;}}});
      window.fetch=async(url,init)=>{window.requests.push({url,body:JSON.parse(init.body)});await new Promise(r=>setTimeout(r,40));return {ok:!window.fail,json:async()=>window.fail?{error:'Fixture save failed.'}:url==='/api/admin/pilots'?{id:${JSON.stringify(businessId)}}:{plaques:Array(JSON.parse(init.body).quantity).fill({})}};};
      const router={push:to=>window.routes.push(to),refresh:()=>window.refreshes++,replace(){},prefetch(){},back(){},forward(){}};
      let roots=[];
      function mount(html){roots.forEach(r=>r.unmount());roots=[];document.getElementById('root').innerHTML=html;document.querySelectorAll('[data-island]').forEach(el=>{const Component=components[el.dataset.island];const root=createRoot(el);roots.push(root);root.render(<AppRouterContext.Provider value={router}><Component {...JSON.parse(el.dataset.props)}/></AppRouterContext.Provider>);});}
      window.showPilot=()=>mount(${JSON.stringify(newHtml)});window.showBusiness=()=>mount(${JSON.stringify(businessHtml)});window.showPilot();
    `);
    await new Promise((resolve, reject) => webpack({ mode: 'development', devtool: false, target: 'web', entry: path.join(temp, 'entry.tsx'), output: { path: temp, filename: 'bundle.js' }, resolve: { alias: { '@': root }, extensions: ['.tsx', '.ts', '.js'], modules: [path.join(root, 'node_modules')] }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(temp, 'loader.cjs') }] }, plugins: [new webpack.DefinePlugin({ 'process.env': JSON.stringify({ NODE_ENV: 'development' }) })] }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
    const cssDir = path.join(root, '.next/static/css');
    assert.ok(fs.existsSync(cssDir), 'Run webpack build before browser QA');
    const css = fs.readdirSync(cssDir).filter(x => x.endsWith('.css')).map(x => fs.readFileSync(path.join(cssDir, x), 'utf8')).join('\n');
    fs.writeFileSync(path.join(temp, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script src="./bundle.js"></script></body></html>`);
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
    await wait("document.querySelector('input[name=days]')?.value==='30'");
    const screenshot = async (name, width) => {
      if (!process.env.MODERNTAP_SCREENSHOT_DIR) return;
      fs.mkdirSync(process.env.MODERNTAP_SCREENSHOT_DIR, { recursive: true });
      const shot = await call('Page.captureScreenshot', { format: 'png' }, sessionId);
      fs.writeFileSync(path.join(process.env.MODERNTAP_SCREENSHOT_DIR, `${name}-${width}.png`), Buffer.from(shot.data, 'base64'));
    };
    async function widths(name) {
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 }, sessionId);
        await evaluate('document.fonts.ready');
        assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, name + ' width ' + width);
        await screenshot(name, width);
      }
    }
    await widths('new-pilot');
    await evaluate(`document.querySelector('input[name=name]').value="Lorenzo's (Pilot)";document.querySelector('input[name=reviews]').value='125';document.querySelector('input[name=rating]').value='4.5';window.fail=true`);
    await click('Create pilot');await wait("document.querySelector('[role=alert]')?.textContent==='Fixture save failed.'");
    await evaluate('window.fail=false');await click('Create pilot');await wait('window.routes.length===1');
    assert.equal((await evaluate('window.requests.at(-1).body')).days, 30);
    assert.equal(await evaluate('window.routes[0]'), '/admin/businesses/' + businessId);
    await evaluate('window.showBusiness()');await wait("document.querySelector('select[name=placement]')!==null");
    await widths('pilot-business');
    for (const width of [320, 390, 768, 1440]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 }, sessionId);
      await evaluate("document.querySelector('[data-island=AddPilotPlaquesForm]').scrollIntoView()");
      await screenshot('pilot-plaques-form', width);
      await evaluate("document.querySelector('#plaques').scrollIntoView()");
      await screenshot('pilot-tap-urls', width);
      assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
    }
    await evaluate(`document.querySelector('input[name=name]').value='Table';document.querySelector('input[name=quantity]').value='12';document.querySelector('input[name=destination]').value='https://g.page/r/fixture/review'`);
    // Select the name inside the batch form (the page also has an existing edit-name input).
    await evaluate(`document.querySelector('[data-island=AddPilotPlaquesForm] input[name=name]').value='Table'`);
    await click('Add plaques');await wait("document.body.textContent.includes('12 plaques added.')");
    assert.equal((await evaluate('window.requests.at(-1).body')).quantity, 12);
    await evaluate(`document.querySelector('[data-island=AddPilotPlaquesForm] input[name=name]').value='Checkbook';document.querySelector('select[name=placement]').value='checkbook'`);
    await click('Add plaques');await wait("window.requests.at(-1).body.placement==='checkbook' && !document.querySelector('[data-island=AddPilotPlaquesForm] button').disabled");
    assert.equal(await evaluate('window.requests.filter(r=>r.url.endsWith("/plaques")).length'), 2);
    await evaluate("document.querySelector('[data-island=PlaqueTapUrl] button').click()");await wait("document.body.textContent.includes('Copied.')");
    assert.match(await evaluate('window.copied'), /^https:\/\/pilot\.example\.test\/t\/[A-F0-9]{32}$/);
    await evaluate("window.copyFail=true;document.querySelector('[data-island=PlaqueTapUrl] button').click()");await wait("document.body.textContent.includes('Copy unavailable.')");
    const refreshes = await evaluate('window.refreshes');await click('Refresh activity');await wait(`window.refreshes>${refreshes}`);
    assert.deepEqual(errors, []);await call('Browser.close');
  } finally {
    if (browser && browser.exitCode === null) { browser.kill();await new Promise(resolve => { browser.once('exit', resolve);setTimeout(resolve, 2000).unref(); }); }
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
