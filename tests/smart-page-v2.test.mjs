import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { harness } from './helpers/smart-page-harness.mjs';

const h = harness();
const { normalizePresentation, resolvePresentation, validLayout, LEGACY_THEMES } = h.load('lib/smart-page-presentation.ts');
const { PRESETS, appearanceContrastError } = h.load('lib/smart-page-appearance.ts');
const View = h.load('components/smart-page/smart-page-view.tsx').default;
const { mergeDraft, mergeActionDrafts } = h.load('lib/smart-page-drafts.ts');
const action = { id: 'unchanged-id', label: 'View Menu', href: '/s/code/go/unchanged-id' };
const render = (appearance, extra = {}) => renderToStaticMarkup(React.createElement(View, {
  appearance: resolvePresentation(appearance), heading: 'Our business', subheading: 'Welcome', actions: [action], ...extra,
}));
async function save(body, options) {
  const api = harness(options);
  const response = await api.load('app/api/plaques/[id]/smart-page/route.ts').POST(new Request('https://example.com', {
    method: 'POST', body: JSON.stringify(body),
  }), { params: Promise.resolve({ id: 'plaque' }) });
  return { response, calls: api.calls };
}
test('all legacy themes keep palettes, layout, and version; V2 fields are ignored by version 1', () => {
  const palettes = { clean: ['#F8FAFC','#FFFFFF','#020617'], dark: ['#0F172A','#1E293B','#F8FAFC'], modern: ['#E0E7FF','#FFFFFF','#3730A3'], warm: ['#FFF7ED','#FFFBF5','#9A3412'], minimal: ['#F5F5F4','#FFFFFF','#44403C'], bold: ['#172554','#1E3A8A','#FACC15'] };
  for (const theme of LEGACY_THEMES) {
    const value = resolvePresentation({ theme_preset: theme });
    assert.equal(value.presentation_version,1); assert.equal(value.v2,false);
    assert.deepEqual([PRESETS[theme].pageBackground,PRESETS[theme].surfaceBackground,PRESETS[theme].buttonColor],palettes[theme]);
    assert.equal(render({theme_preset:theme}),render({theme_preset:theme,presentation_version:1,page_background_color:'#FF0000',background_mode:'gradient',logo_size:'large',content_alignment:'left'}));
    assert.match(render({theme_preset:theme}),/min-h-12/);
  }
  assert.equal(resolvePresentation({theme_preset:'clean'}).legacyClean,true);
  assert.equal(resolvePresentation({theme_preset:'warm',background_color:'#FFFFFF'}).surfaceBackground,'#FFFFFF');
});
test('unrelated content and button saves never write presentation_version',async () => {
  for (const body of [{action:'save_page',heading:'Hello',subheading:''},{action:'update_button',buttonId:'button',label:'Menu',destination_url:'https://example.com',enabled:true,icon_key:'menu'},{action:'move_button',buttonId:'button',direction:'down'}]) {
    const { response,calls }=await save({...body,presentation_version:2}); assert.equal(response.status,200);
    for(const call of calls.filter(c=>c.op==='update')) assert.ok(!Object.hasOwn(call.value,'presentation_version'));
  }
});
test('legacy appearance saves do not upgrade; explicit V2 appearance save does',async () => {
  const legacy=normalizePresentation({theme_preset:'warm'});
  let result=await save({action:'save_appearance',...legacy});assert.equal(result.response.status,200);
  assert.ok(!Object.hasOwn(result.calls.find(c=>c.op==='update').value,'presentation_version'));
  result=await save({action:'save_appearance',...normalizePresentation({presentation_version:2,theme_preset:'coastal',logo_size:'large'})});
  assert.equal(result.response.status,200);assert.equal(result.calls.find(c=>c.op==='update').value.presentation_version,2);
});
for(const theme of ['bistro','espresso','studio','motion','boutique','coastal']) test(theme+' normalizes, passes contrast validation and saves',async () => {
  const draft=normalizePresentation({theme_preset:theme,presentation_version:2});
  assert.equal(draft.theme_preset,theme);assert.equal(appearanceContrastError(draft),null);
  assert.match(render(draft),/min-h-14/);
  assert.equal((await save({action:'save_appearance',...draft})).response.status,200);
});
test('new themes cannot silently change version 1',async () => {
  const result=await save({action:'save_appearance',...normalizePresentation({theme_preset:'clean'}),theme_preset:'bistro'});
  assert.equal(result.response.status,400);assert.ok(!result.calls.some(c=>c.op==='update'));
});
test('solid and both gradient directions use only validated colors', () => {
  const base={presentation_version:2,page_background_color:'#123456',gradient_end_color:'#ABCDEF'};
  assert.equal(resolvePresentation(base).backgroundImage,undefined);
  assert.equal(resolvePresentation(base).pageBackground,'#123456');
  assert.equal(resolvePresentation({...base,background_mode:'gradient',gradient_direction:'down'}).backgroundImage,'linear-gradient(180deg, #123456, #ABCDEF)');
  assert.equal(resolvePresentation({...base,background_mode:'gradient',gradient_direction:'diagonal'}).backgroundImage,'linear-gradient(135deg, #123456, #ABCDEF)');
  assert.doesNotMatch(render({...base,page_background_color:'url(https://evil.example)'}),/evil/);
});
test('invalid colors and enums rejected without any write',async () => {
  for(const patch of [{presentation_version:3},{page_background_color:'#123'},{gradient_end_color:'red'},{background_mode:'url(x)'},{gradient_direction:'up'},{logo_size:'huge'},{content_alignment:'justify'},{text_color:'white'}]) {
    const input={...normalizePresentation({presentation_version:2}),...patch};
    const result=await save({action:'save_appearance',...input});assert.equal(result.response.status,400);assert.ok(!result.calls.some(c=>c.op==='update'));
  }
  assert.equal(validLayout(normalizePresentation({presentation_version:2})),true);
});
test('logo sizes preserve aspect ratio and alignment; no-logo and long action lists render', () => {
  for(const [size,width,height] of [['small',96,72],['medium',160,128],['large',200,160]]) {
    const html=render({presentation_version:2,logo_size:size,content_alignment:'left'},{logoSrc:'/s/code/logo'});
    assert.match(html,new RegExp(`max-width:${width}px;max-height:${height}px`));assert.match(html,/text-align:left/);assert.match(html,/object-contain/);
  }
  assert.match(render({presentation_version:2}),/text-align:center/);
  const html=render({presentation_version:2},{actions:Array.from({length:30},(_,i)=>({...action,id:String(i),label:'Long label '.repeat(8)}))});
  assert.equal((html.match(/<a /g)??[]).length,30);assert.doesNotMatch(html,/<img/);assert.match(html,/overflow-wrap:anywhere/);
});
test('preview has matching action styling but no links; public links retain tracked IDs', () => {
  for(const version of [1,2]) {
    for(const media of [{},{iconKey:'menu'},{imageSrc:'/s/code/buttons/unchanged-id/image'}]) {
      const props={actions:[{...action,...media}]};
      const publicHtml=render({presentation_version:version},props);
      const previewHtml=render({presentation_version:version},{...props,preview:true});
      assert.match(publicHtml,/href="\/s\/code\/go\/unchanged-id"/);
      assert.doesNotMatch(previewHtml,/<a |href=|onclick|prefetch/);
      const publicAction=publicHtml.match(/<a [^>]*class="([^"]*)"/)[1];
      assert.ok(previewHtml.includes(`class="${publicAction}"`));
    }
  }
});
test('dirty content and appearance survive unrelated refresh, clean fields receive saved changes', () => {
  const old={heading:'Saved',subheading:'Old'};
  assert.deepEqual(mergeDraft({heading:'Draft',subheading:'Old'},old,{heading:'Saved',subheading:'New'}),{heading:'Draft',subheading:'New'});
  const saved=normalizePresentation({});const draft={...saved,logo_size:'large',presentation_version:2};
  assert.equal(mergeDraft(draft,saved,{...saved}).logo_size,'large');
  // Save acknowledgement, then a later remote update: acknowledged fields are clean again.
  const acknowledged=mergeDraft(draft,saved,draft);
  assert.equal(mergeDraft(acknowledged,draft,{...draft,logo_size:'small'}).logo_size,'small');
});
test('action draft edits survive reorder/upload refresh; deleted rows disappear and new rows appear', () => {
  const old=[{id:'a',position:0,label:'Saved',image_path:null},{id:'b',position:1,label:'Other',image_path:null}];
  const draft=[{...old[0],label:'Draft'},old[1]];
  const incoming=[{...old[1],position:0},{...old[0],position:1,image_path:'new-image'}];
  const merged=mergeActionDrafts(draft,old,incoming);
  assert.equal(merged[1].label,'Draft');assert.equal(merged[1].position,1);assert.equal(merged[1].image_path,'new-image');
  assert.deepEqual(mergeActionDrafts(draft,old,[{id:'c',position:0,label:'New',image_path:null}]),[{id:'c',position:0,label:'New',image_path:null}]);
});
test('V2 save still requires authenticated ownership',async () => {
  for(const [options,status] of [[{unauth:true},401],[{wrongPlaque:true},404]]) {
    const result=await save({action:'save_appearance',...normalizePresentation({presentation_version:2})},options);
    assert.equal(result.response.status,status);assert.ok(!result.calls.some(c=>c.op==='update'));
  }
});
