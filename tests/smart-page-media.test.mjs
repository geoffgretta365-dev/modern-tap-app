import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { harness } from './helpers/smart-page-harness.mjs';
const uploadRoute = 'app/api/plaques/[id]/smart-page/buttons/[buttonId]/image/route.ts';
const publicRoute = 'app/s/[code]/buttons/[buttonId]/image/route.ts';
const saveRoute = 'app/api/plaques/[id]/smart-page/route.ts';
const ctx = { params: Promise.resolve({ id: 'plaque', buttonId: 'button', code: 'code' }) };
function uploadRequest(bytes = new Uint8Array([137,80,78,71,13,10,26,10]), type = 'image/png') {
  const body = new FormData(); body.set('image', new File([bytes], 'test.png', { type }));
  return new Request('https://example.com', { method: 'POST', body });
}
async function save(h, body) {
  return h.load(saveRoute).POST(new Request('https://example.com', { method: 'POST', body: JSON.stringify({ buttonId: 'button', ...body }) }), ctx);
}
for (const [name, opts, status] of [['unauthorized', { unauth: true },401], ['wrong plaque',{ wrongPlaque: true },404], ['wrong button',{ wrongButton: true },404]]) {
  test(name + ' upload rejected', async () => {
    const h = harness(opts); assert.equal((await h.load(uploadRoute).POST(uploadRequest(),ctx)).status,status); assert.equal(h.uploaded.length,0);
  });
}
test('upload and replacement clear icon and clean old object after DB success', async () => {
  const h = harness({ button: { icon_key: 'menu' } });
  assert.equal((await h.load(uploadRoute).POST(uploadRequest(),ctx)).status,200);
  const update = h.calls.find(c => c.op === 'update');
  assert.equal(update.value.icon_key,null); assert.equal(update.value.image_path,h.uploaded[0]);
  assert.ok(update.filters.some(([k,v]) => k === 'updated_at' && v === 'old'));
  assert.deepEqual(h.removed,[h.oldPath]);
});
test('failed DB change cleans only new upload', async () => {
  const h = harness({ conflict: true }); assert.equal((await h.load(uploadRoute).POST(uploadRequest(),ctx)).status,409);
  assert.deepEqual(h.removed,h.uploaded); assert.ok(!h.removed.includes(h.oldPath));
});
for (const [name, bytes, mime] of [['SVG',new Uint8Array([1]),'image/svg+xml'],['signature',new Uint8Array([1]),'image/png'],['oversize',new Uint8Array(4*1024*1024+1),'image/png']]) {
  test(name + ' rejected',async () => { const h=harness(); assert.equal((await h.load(uploadRoute).POST(uploadRequest(bytes,mime),ctx)).status,400); assert.equal(h.uploaded.length,0); });
}
for (const icon_key of ['menu',null]) test('switch upload to '+icon_key,async () => {
  const h=harness(); assert.equal((await save(h,{action:'update_button',label:'Menu',destination_url:'https://example.com',enabled:true,icon_key})).status,200);
  const update=h.calls.find(c=>c.op==='update'); assert.equal(update.value.image_path,null); assert.equal(update.value.icon_key,icon_key); assert.deepEqual(h.removed,[h.oldPath]);
});
test('invalid icon and browser storage path rejected',async () => {
  for(const patch of [{icon_key:'__proto__'},{image_path:'arbitrary'}]) {const h=harness(); assert.equal((await save(h,{action:'update_button',...patch})).status,400); assert.ok(!h.calls.some(c=>c.op==='update'));}
});
test('visibility updates preserve media; reorder only writes positions',async () => {
  const h=harness(); await save(h,{action:'update_button',label:'Menu',destination_url:'https://example.com',enabled:false});
  assert.ok(!Object.hasOwn(h.calls.find(c=>c.op==='update').value,'image_path'));
  const r=harness(); assert.equal((await save(r,{action:'move_button',direction:'down'})).status,200);
  for(const c of r.calls.filter(c=>c.op==='update')) assert.deepEqual(Object.keys(c.value),['position']);
});
test('delete button and remove media clean old objects',async () => {
  const h=harness(); assert.equal((await save(h,{action:'delete_button'})).status,200); assert.deepEqual(h.removed,[h.oldPath]);
  const r=harness(); assert.equal((await r.load(uploadRoute).DELETE(new Request('https://example.com'),ctx)).status,200); assert.deepEqual(r.removed,[r.oldPath]);
});
test('public delivery enforces scope, enabled button and active Smart Page; missing image returns 404',async () => {
  const h=harness(); const response=await h.load(publicRoute).GET(new Request('https://example.com'),ctx); assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'no-store');
  assert.ok(h.calls.find(c=>c.table==='plaques').filters.some(([k,v])=>k==='active' && v===true));
  assert.ok(h.calls.find(c=>c.table==='smart_page_buttons').filters.some(([k,v])=>k==='enabled' && v===true));
  for(const opts of [{button:{image_path:'other/plaque/buttons/button/abcdef.png'}},{wrongButton:true},{missingImage:true}]) {const r=harness(opts); assert.equal((await r.load(publicRoute).GET(new Request('https://example.com'),ctx)).status,404);}
});
test('legacy text-only content is unchanged; icons and uploads are decorative', () => {
  const h=harness(); const Content=h.load('components/smart-page/action-content.tsx').default;
  const render=props=>renderToStaticMarkup(React.createElement(Content,props));
  assert.equal(render({label:'Menu',iconKey:null,imageSrc:null}),'Menu');
  assert.match(render({label:'Menu',iconKey:'menu'}),/aria-hidden="true"/);
  assert.match(render({label:'Menu',imageSrc:'/s/code/buttons/button/image'}),/alt=""/);
  assert.equal(render({label:'Menu',iconKey:'invalid'}),'Menu');
});
test('tracked redirect still records button ID and label snapshot', async () => {
  const h=harness({button:{label:'Menu',destination_url:'https://example.com/menu',enabled:true}});
  const route=h.load('app/s/[code]/go/[buttonId]/route.ts');
  const response=await route.GET(new Request('https://example.com/s/code/go/button'),ctx);
  assert.equal(response.status,302); assert.equal(response.headers.get('location'),'https://example.com/menu');
  const click=h.calls.find(c=>c.table==='smart_page_clicks' && c.op==='insert');
  assert.equal(click.value.button_id,'button'); assert.equal(click.value.button_label_snapshot,'Menu');
});

test('failed image renders the original label without an empty media slot', () => {
  const h=harness({failedImageSrc:'/missing-image'});
  const Content=h.load('components/smart-page/action-content.tsx').default;
  assert.equal(renderToStaticMarkup(React.createElement(Content,{label:'Menu',imageSrc:'/missing-image'})),'Menu');
});
test('icon can be removed and visibility re-enabled without media changes', async () => {
  const h=harness({button:{image_path:null,icon_key:'menu'}});
  assert.equal((await save(h,{action:'update_button',label:'Menu',destination_url:'https://example.com',enabled:true,icon_key:null})).status,200);
  assert.equal(h.calls.find(c=>c.op==='update').value.icon_key,null);
  assert.equal(h.removed.length,0);
});
