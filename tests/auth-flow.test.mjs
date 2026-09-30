import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
const dependency=createRequire(import.meta.url);
function setup({session=null, error=null}={}) {
  const calls=[];
  const auth={signUp:async input=>{calls.push(input);return {data:{session},error};},verifyOtp:async input=>{calls.push(input);return {error};},exchangeCodeForSession:async code=>{calls.push(code);return {error};},resetPasswordForEmail:async(email,options)=>{calls.push(options);return {error};}};
  const cache={};
  function load(file){file=path.resolve(file);if(cache[file])return cache[file].exports;const mod={exports:{}};cache[file]=mod;
    const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    const req=name=>{
      if(name==='server-only')return {};
      if(name==='react')return {...React,useState:initial=>[initial,()=>{}],useRef:value=>({current:value})};
      if(name==='next/navigation')return {redirect:to=>{throw new Error('REDIRECT '+to)},useRouter:()=>({replace:to=>calls.push(to),refresh:()=>{},push:to=>calls.push(to)})};
      if(name==='next/link')return function MockLink({children,...props}){return React.createElement('a',props,children)};
      if(name==='next/image')return function MockImage(props){const attrs={...props};delete attrs.priority;return React.createElement('img',attrs)};
      if(name==='@/lib/supabase/server'||name==='@/lib/supabase/client')return {createClient:()=>({auth})};
      if(name.startsWith('@/components/ui/'))return new Proxy({}, {get:()=>function MockCard({children,...props}){return React.createElement('div',props,children)}});
      if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?name.slice(2):path.resolve(path.dirname(file),name);return load(fs.existsSync(base+'.ts')?base+'.ts':base+'.tsx');}
      return dependency(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${source}\n})`,{filename:file})(req,mod,mod.exports);return mod.exports;
  }
  return {load,calls};
}
function findForm(node){if(!node)return; if(node.type==='form')return node;return React.Children.toArray(node.props?.children).map(findForm).find(Boolean);}
test('auth origin uses configured production, local development and isolated preview URLs',()=>{
 const {authOrigin,authDestination}=setup().load('lib/auth-redirects.ts');
 assert.equal(authOrigin({NODE_ENV:'development'}),'http://localhost:3000');
 assert.equal(authOrigin({VERCEL_ENV:'production'}),'https://modern-tap-app.vercel.app');
 assert.equal(authOrigin({VERCEL_ENV:'preview',VERCEL_URL:'preview-example.vercel.app',MODERNTAP_APP_URL:'https://modern-tap-app.vercel.app'}),'https://preview-example.vercel.app');
 assert.throws(()=>authOrigin({VERCEL_ENV:'production',MODERNTAP_APP_URL:'http://localhost:3000'}));
 for(const next of ['https://evil.test','//evil.test','/\\evil.test','/%2f%2fevil.test','/auth/update-password?next=https://evil.test'])assert.equal(authDestination(next),'/onboarding');
});
for(const session of [null,{access_token:'fixture'}])test(`signup with ${session?'immediate session':'confirmation required'}`,async()=>{
 const s=setup({session});const tree=s.load('components/sign-up-form.tsx').SignUpForm({emailRedirectTo:'https://modern-tap-app.vercel.app/auth/confirm?next=/onboarding'});
 await findForm(tree).props.onSubmit({preventDefault(){}});
 assert.equal(s.calls[0].options.emailRedirectTo,'https://modern-tap-app.vercel.app/auth/confirm?next=/onboarding');
 assert.equal(s.calls[1],session?'/onboarding':'/auth/sign-up-success');
});
test('password recovery uses server-provided callback URL',async()=>{
 const s=setup();const tree=s.load('components/forgot-password-form.tsx').ForgotPasswordForm({emailRedirectTo:'https://modern-tap-app.vercel.app/auth/confirm?next=/auth/update-password'});
 await findForm(tree).props.onSubmit({preventDefault(){}});assert.equal(s.calls[0].redirectTo,'https://modern-tap-app.vercel.app/auth/confirm?next=/auth/update-password');
});
for(const [query,destination] of [['code=fixture&next=https://evil.test','/onboarding'],['code=fixture&next=/auth/update-password','/auth/update-password'],['token_hash=fixture&type=signup','/onboarding'],['token_hash=fixture&type=recovery','/auth/update-password'],['token_hash=fixture&type=invalid','/auth/error'],['','/auth/error']])test('auth callback '+query,async()=>{
 const s=setup();await assert.rejects(s.load('app/auth/confirm/route.ts').GET({url:'https://modern-tap-app.vercel.app/auth/confirm?'+query}),{message:'REDIRECT '+destination});
});
test('invalid or expired auth links never reach onboarding',async()=>{
 const s=setup({error:{message:'expired'}});await assert.rejects(s.load('app/auth/confirm/route.ts').GET({url:'https://modern-tap-app.vercel.app/auth/confirm?code=expired'}),{message:'REDIRECT /auth/error'});
});
test('all auth pages render one brand through their shared layout',()=>{
 const s=setup();const Layout=s.load('app/auth/layout.tsx').default;
 for(const route of ['login','sign-up','forgot-password','update-password','sign-up-success','error']){
  const Page=s.load(`app/auth/${route}/page.tsx`).default;
  const html=renderToStaticMarkup(React.createElement(Layout,null,React.createElement(Page)));
  assert.equal((html.match(/alt="ModernTap"/g)||[]).length,1,route);assert.equal((html.match(/Business Portal/g)||[]).length,1,route);
 }
});
