import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { pilotHarness, businessId } from './helpers/admin-pilot-harness.mjs';
process.env.MODERNTAP_ADMIN_USER_IDS = ' admin-fixture, second-admin ';
process.env.MODERNTAP_APP_URL = 'https://pilot.example.test';
const pilotRoute = 'app/api/admin/pilots/route.ts';
const plaqueRoute = 'app/api/admin/businesses/[businessId]/plaques/route.ts';
const context = { params: Promise.resolve({ businessId }) };
const request = body => new Request('https://pilot.example.test/api/admin/pilots', { method: 'POST', body: JSON.stringify(body) });
const pilot = { name: "Lorenzo's (Pilot)", startDate: '2026-09-29', days: 30, reviews: 125, rating: 4.5, notes: 'Week one' };
const plaques = { name: 'Table', placement: 'table', quantity: 12, destination: 'https://g.page/r/fixture/review' };
for (const opts of [{ unauth: true }, { user: 'customer' }]) test('pilot routes reject non-admin before service-role access: ' + JSON.stringify(opts), async () => {
  for (const route of [pilotRoute, plaqueRoute]) {
    const h = pilotHarness(opts);
    assert.equal((await h.load(route).POST(request({}), context)).status, 403);
    assert.equal(h.adminCalls, 0); assert.equal(h.calls.length, 0);
  }
});
test('missing allowlist fails closed', async () => {
  const old = process.env.MODERNTAP_ADMIN_USER_IDS;
  try { delete process.env.MODERNTAP_ADMIN_USER_IDS; const h = pilotHarness(); assert.equal((await h.load(pilotRoute).POST(request(pilot))).status, 403); assert.equal(h.adminCalls, 0); }
  finally { process.env.MODERNTAP_ADMIN_USER_IDS = old; }
});
test('creates ownerless 30-day business without subscription writes', async () => {
  const h = pilotHarness(); assert.equal((await h.load(pilotRoute).POST(request(pilot))).status, 201);
  assert.equal(h.state.business.owner_id, null); assert.equal(h.state.business.is_pilot, true);
  assert.equal(h.state.business.trial_ends_at, '2026-10-29T00:00:00.000Z');
  assert.equal(h.state.business.pilot_reviews_start, 125); assert.equal(h.state.business.pilot_rating_start, 4.5);
  assert.ok(h.calls.every(c => c.table === 'businesses'));
});
test('validates pilot fields and refuses client-supplied ownership/status', async () => {
  for (const patch of [{ name: ' ' }, { startDate: '2026-02-30' }, { startDate: 'invalid' }, { days: 0 }, { days: 366 }, { days: 1.5 }, { reviews: -1 }, { reviews: 1.5 }, { rating: 5.1 }, { rating: 0 }, { notes: 'x'.repeat(5001) }, { owner_id: 'customer' }, { is_pilot: false }]) {
    const h = pilotHarness(); assert.equal((await h.load(pilotRoute).POST(request({ ...pilot, ...patch }))).status, 400, JSON.stringify(patch)); assert.equal(h.calls.length, 0);
  }
});
test('pilot route handles malformed JSON and database failures', async () => {
  const h = pilotHarness(); assert.equal((await h.load(pilotRoute).POST(new Request('https://example.test', { method: 'POST', body: '{' }))).status, 400);
  assert.equal((await pilotHarness({ dbError: true }).load(pilotRoute).POST(request(pilot))).status, 500);
});
test('non-pilot and missing businesses cannot use the bypass', async () => {
  for (const [options, status] of [[{ business: { is_pilot: false } }, 403], [{ missingBusiness: true }, 404], [{ lookupError: true }, 500]]) {
    const h = pilotHarness(options); assert.equal((await h.load(plaqueRoute).POST(request(plaques), context)).status, status); assert.ok(!h.calls.some(c => c.op === 'insert'));
  }
});
test('validates quantity, placement and http/https without credentials', async () => {
  for (const patch of [{ quantity: 0 }, { quantity: 31 }, { quantity: 1.5 }, { quantity: '12' }, { placement: 'wall' }, { placement: null }, { name: '' }, { destination: 'javascript:alert(1)' }, { destination: 'ftp://example.test' }, { destination: 'https://user:pass@example.test' }, { destination: 'example.test' }, { destination: 'https://x.test/' + 'a'.repeat(2048) }, { business_id: 'other' }, { active: false }]) {
    const h = pilotHarness(); assert.equal((await h.load(plaqueRoute).POST(request({ ...plaques, ...patch }), context)).status, 400, JSON.stringify(patch)); assert.ok(!h.calls.some(c => c.op === 'insert'));
  }
  for (const quantity of [1, 30]) { const h = pilotHarness(); assert.equal((await h.load(plaqueRoute).POST(request({ ...plaques, quantity, destination: 'http://example.test' }), context)).status, 201); }
});
test('24 pilot plaques use unique customer-format codes; tap appears on admin page', async () => {
  const h = pilotHarness();
  for (const placement of ['table', 'checkbook']) assert.equal((await h.load(plaqueRoute).POST(request({ ...plaques, placement, name: placement }), context)).status, 201);
  assert.equal(h.state.plaques.length, 24);
  assert.equal(new Set(h.state.plaques.map(p => p.code)).size, 24);
  for (const p of h.state.plaques) { assert.match(p.code, /^[A-F0-9]{32}$/); assert.equal(p.business_id, businessId); assert.equal(p.active, true); assert.equal(p.mode, 'direct_link'); }
  assert.ok(!h.calls.some(c => c.table === 'subscriptions'));
  const code = h.state.plaques[0].code;
  const response = await h.load('app/t/[code]/route.ts').GET(new Request(`https://pilot.example.test/t/${code}`), { params: Promise.resolve({ code }) });
  assert.equal(response.headers.get('location'), plaques.destination); assert.equal(h.state.taps.length, 1);
  const html = renderToStaticMarkup(await h.load('app/admin/businesses/[businessId]/page.tsx').default(context));
  assert.match(html, /Total Taps<\/p><p[^>]*>1<\/p>/); assert.match(html, /Recent Taps/); assert.match(html, /1 taps/); assert.match(html, new RegExp(`https://pilot.example.test/t/${code}`)); assert.match(html, /Copy tap URL/); assert.match(html, /Add plaques/);
});
test('batch DB error reports failure without returning success', async () => {
  const h = pilotHarness({ dbError: true }); assert.equal((await h.load(plaqueRoute).POST(request(plaques), context)).status, 500); assert.equal(h.state.plaques.length, 0);
});
test('admin plaque edit cannot target plaque belonging to another business', async () => {
  const h = pilotHarness(); h.state.plaques.push({ id: 'other-plaque', business_id: 'other-business' });
  const response = await h.load('app/api/admin/businesses/[businessId]/plaques/[plaqueId]/route.ts').PATCH(request({ name: 'Other', destination_url: 'https://example.test' }), { params: Promise.resolve({ businessId, plaqueId: 'other-plaque' }) });
  assert.equal(response.status, 404); assert.ok(!h.calls.some(c => c.op === 'update'));
});
test('pilot pages require allowlist; non-pilot business omits add form', async () => {
  await assert.rejects(pilotHarness({ user: 'customer' }).load('app/admin/pilots/new/page.tsx').default(), /REDIRECT/);
  const h = pilotHarness({ business: { is_pilot: false } });
  const html = renderToStaticMarkup(await h.load('app/admin/businesses/[businessId]/page.tsx').default(context));
  assert.doesNotMatch(html, /Add plaques/);
});
