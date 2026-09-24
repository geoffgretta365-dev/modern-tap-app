import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { harness } from './helpers/smart-page-harness.mjs';

const dependency = createRequire(import.meta.url);
const { webpack } = dependency('next/dist/compiled/webpack/webpack');
const chrome = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const root = process.cwd();

// Real browser regression: the server-rendered srcDoc finishes loading BEFORE hydration.
// No live app, Supabase connection, credentials, or customer records are used.
test('hydrated preview attaches to an already-loaded iframe and renders V1/V2 drafts inertly', {
  skip: !fs.existsSync(chrome) ? 'Set CHROME_BIN to a local Chrome executable to run the browser regression.' : false,
  timeout: 60000,
}, async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'moderntap-preview-test-'));
  let browser;
  try {
    const h = harness();
    const Preview = h.load('components/smart-page/smart-page-preview.tsx').default;
    const { resolvePresentation } = h.load('lib/smart-page-presentation.ts');
    const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2XkAAAAASUVORK5CYII=';
    const props = {
      heading: 'Welcome to our business', subheading: 'Connect with us below', logoSrc: image,
      appearance: resolvePresentation({ presentation_version: 1, theme_preset: 'clean' }),
      actions: [
        { id: 'text', label: 'Visit our website', href: '/s/test/go/text' },
        { id: 'icon', label: 'View menu', iconKey: 'menu', href: '/s/test/go/icon' },
        { id: 'image', label: 'Order online', imageSrc: image, href: '/s/test/go/image' },
        { id: 'long', label: 'A very long action label that should wrap safely without hiding any part of the customer action', href: '/s/test/go/long' },
      ],
    };
    fs.writeFileSync(path.join(temp, 'loader.cjs'), `const ts = require(${JSON.stringify(dependency.resolve('typescript'))}); module.exports = function(source) { return ts.transpileModule(source, {compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, esModuleInterop: true}}).outputText; };`);
    fs.writeFileSync(path.join(temp, 'entry.tsx'), `
      import React from 'react';
      import { hydrateRoot, createRoot } from 'react-dom/client';
      import Preview from '@/components/smart-page/smart-page-preview';
      import { resolvePresentation } from '@/lib/smart-page-presentation';
      const initial = ${JSON.stringify(props)};
      let root = hydrateRoot(document.getElementById('root'), <Preview {...initial} />);
      window.previewTest = { initial, remount() { root.unmount(); root=createRoot(document.getElementById('root')); root.render(<Preview {...initial} />); }, update(patch) { root.render(<Preview {...initial} {...patch} />); },
        appearance(patch) { return resolvePresentation({presentation_version: 2, theme_preset:'bistro', ...patch}); } };
    `);
    await new Promise((resolve, reject) => webpack({
      mode: 'development', devtool: false, target: 'web', entry: path.join(temp, 'entry.tsx'),
      output: { path: temp, filename: 'bundle.js' },
      resolve: { alias: { '@': root }, extensions: ['.tsx','.ts','.js'], modules: [path.join(root,'node_modules')] },
      module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(temp,'loader.cjs') }] },
      plugins: [new webpack.DefinePlugin({ 'process.env': JSON.stringify({ NODE_ENV: 'development' }) })],
    }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({all:false,errors:true}))) : resolve()));
    // Actual compiled app CSS when available. The regression itself does not depend on CSS.
    const cssDir = path.join(root,'.next/static/css');
    const css = fs.existsSync(cssDir) ? fs.readdirSync(cssDir).filter(x=>x.endsWith('.css')).map(x=>fs.readFileSync(path.join(cssDir,x),'utf8')).join('\n') : '';
    fs.writeFileSync(path.join(temp, 'index.html'), `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root">${renderToString(React.createElement(Preview,props))}</div><script>
      window.addEventListener('load', () => {
        window.frameLoadedBeforeHydration = document.querySelector('iframe').contentDocument.readyState;
        setTimeout(() => { const script=document.createElement('script'); script.src='./bundle.js'; document.body.appendChild(script); }, 100);
      }, {once:true});
    </script></body></html>`);
    browser = spawn(chrome, ['--headless','--no-first-run','--disable-gpu','--disable-background-networking','--remote-debugging-pipe',`--user-data-dir=${path.join(temp,'profile')}`], {stdio:['ignore','ignore','ignore','pipe','pipe']});
    let sequence=0, buffer=''; const pending=new Map(), errors=[], requests=[];
    let browserError;
    function failBrowser(error) { browserError=error; for(const [,reject] of pending.values()) reject(error); pending.clear(); }
    browser.on('error',failBrowser);
    browser.on('exit',(code,signal)=>failBrowser(new Error(`Chrome exited (${code ?? signal}). Check browser sandbox permissions.`)));
    browser.stdio[4].on('data', chunk => {
      buffer += chunk; let end;
      while((end=buffer.indexOf('\0'))>=0) {
        const msg=JSON.parse(buffer.slice(0,end)); buffer=buffer.slice(end+1);
        if(pending.has(msg.id)) { const [resolve,reject]=pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result); }
        if(msg.method==='Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description ?? ''));
        if(msg.method==='Network.requestWillBeSent') requests.push(msg.params.request.url);
      }
    });
    const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{if(browserError) { reject(browserError); return; } pending.set(++sequence,[resolve,reject]);browser.stdio[3].write(JSON.stringify({id:sequence,method,params,sessionId})+'\0');});
    const {targetId}=await call('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
    const evaluate=async expression=>{
      const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);
      if(result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    await call('Runtime.enable',{},sessionId);await call('Network.enable',{},sessionId);
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},sessionId);
    await call('Page.navigate',{url:`file://${path.join(temp,'index.html')}`},sessionId);
    async function waitFor(expression) {
      for(let i=0;i<100;i++) {if(await evaluate(expression)) return; await new Promise(r=>setTimeout(r,50));}
      throw new Error('Browser condition timed out: '+expression+'; errors: '+JSON.stringify(errors));
    }
    await waitFor('!!window.previewTest');
    assert.equal(await evaluate('window.frameLoadedBeforeHydration'),'complete');
    await waitFor("!!document.querySelector('iframe').contentDocument.querySelector('h1')");
    const inspect=()=>evaluate(`(() => { const frame=document.querySelector('iframe'), d=frame.contentDocument, m=d.querySelector('main'); return {
      heading:d.querySelector('h1')?.textContent, headingHeight:d.querySelector('h1')?.getBoundingClientRect().height, visibility:d.defaultView.getComputedStyle(d.querySelector('h1')).visibility, message:d.body.textContent, images:d.querySelectorAll('img').length,
      icons:d.querySelectorAll('svg').length, links:d.querySelectorAll('a,link[rel="prefetch"]').length,
      background:m?.style.backgroundImage, alignment:m?.firstElementChild.style.textAlign,
      logoWidth:d.querySelector('img')?.style.maxWidth, bodyWidth:d.documentElement.scrollWidth, viewport:frame.clientWidth,
      version:window.previewTest.initial.appearance.presentation_version
    }; })()`);
    let state=await inspect();
    assert.equal(state.heading,props.heading);assert.ok(state.message.includes(props.subheading));assert.equal(state.version,1);
    assert.ok(state.headingHeight>0);assert.equal(state.visibility,'visible');assert.ok(state.bodyWidth<=state.viewport+1);
    assert.equal(state.images,2);assert.equal(state.icons,1);assert.equal(state.links,0);
    assert.ok(state.message.includes(props.actions[3].label));
    await evaluate('window.previewTest.update({logoSrc:null})');
    await waitFor("document.querySelector('iframe').contentDocument.querySelectorAll('img').length === 1");
    for(const alignment of ['center','left']) for(const [size,width] of [['small','96px'],['medium','160px'],['large','200px']]) {
      await evaluate(`window.previewTest.update({appearance:window.previewTest.appearance({content_alignment:'${alignment}',logo_size:'${size}'})})`);
      await waitFor(`document.querySelector('iframe').contentDocument.querySelector('img')?.style.maxWidth === '${width}'`);
      state=await inspect();assert.equal(state.alignment,alignment);assert.equal(state.links,0);
    }
    await evaluate("window.previewTest.update({appearance:window.previewTest.appearance({background_mode:'gradient',page_background_color:'#123456',gradient_end_color:'#ABCDEF',gradient_direction:'diagonal'})})");
    await waitFor("document.querySelector('iframe').contentDocument.querySelector('main').style.backgroundImage.includes('135deg')");
    await evaluate('window.previewTest.update({actions:[]})');
    await waitFor("!document.querySelector('iframe').contentDocument.body.textContent.includes('View menu')");
    assert.equal((await inspect()).heading,props.heading);
    await evaluate('window.previewTest.update({})');
    await waitFor("document.querySelector('iframe').contentDocument.body.textContent.includes('View menu')");
    const before=await evaluate('document.querySelector("iframe").contentWindow.location.href');
    await evaluate("Array.from(document.querySelector('iframe').contentDocument.querySelectorAll('span')).find(x=>x.textContent==='Visit our website').click()");
    assert.equal(await evaluate('document.querySelector("iframe").contentWindow.location.href'),before);
    assert.ok(!requests.some(url=>/\/go\/|\/t\/|supabase/.test(url)));
    // The same component must also reconnect after iframe reload and client-side mounting.
    await evaluate(`document.querySelector('iframe').srcdoc += '<!-- reload -->'`);
    await waitFor("!!document.querySelector('iframe').contentDocument.querySelector('h1')");
    await evaluate('window.previewTest.remount()');
    await waitFor("!!document.querySelector('iframe').contentDocument.querySelector('h1')");
    assert.equal((await inspect()).heading,props.heading);
    assert.deepEqual(errors,[]);
    await call('Browser.close');
  } finally {
    if(browser && browser.exitCode === null) { browser.kill(); await new Promise(resolve=>{browser.once('exit',resolve);setTimeout(resolve,2000).unref();}); }
    fs.rmSync(temp,{recursive:true,force:true});
  }
});
