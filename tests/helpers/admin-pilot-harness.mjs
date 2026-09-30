import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { createRequire } from 'node:module';
const dependency = createRequire(import.meta.url);
export const businessId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export function pilotHarness(options = {}) {
  const calls = [];
  const state = { business: { id: businessId, name: "Lorenzo’s (Pilot)", is_pilot: true, owner_id: null, created_at: '2026-09-29T00:00:00Z', trial_started_at: '2026-09-29T04:00:00Z', trial_ends_at: '2026-10-29T04:00:00Z', pilot_reviews_start: 125, pilot_rating_start: 4.5, pilot_notes: 'Restaurant pilot', pilot_share_token: null, pilot_reviews_end: null, pilot_rating_end: null, ...options.business }, plaques: [], taps: [] };
  let adminCalls = 0;
  const db = { from(table) {
    const call = { table, op: 'select', filters: [] }; calls.push(call);
    let single = false, head = false, start = 0, end = Infinity; const ordering = [];
    function matches(row) { return call.filters.every(([k,v,op]) => { const x = row[k] ?? (['is_bot','is_repeat'].includes(k) ? false : null); return op === 'gte' ? x >= v : op === 'lt' ? x < v : op === 'lte' ? x <= v : Array.isArray(v) ? v.includes(x) : x === v; }); }
    function selected(rows) { const data = rows.filter(matches); for (const [key,ascending] of [...ordering].reverse()) data.sort((a,b) => String(a[key]).localeCompare(String(b[key])) * (ascending ? 1 : -1)); return data.slice(start,end); }
    const q = {
      select(columns, opts) { call.columns = columns; head = opts?.head; return q; },
      eq(key, value) { call.filters.push([key, value]); return q; },
      in(key, value) { call.filters.push([key, value]); return q; },
      is(key,value) { call.filters.push([key,value]); return q; },
      gte(key,value) { call.filters.push([key,value,'gte']); return q; },
      lt(key,value) { call.filters.push([key,value,'lt']); return q; },
      lte(key,value) { call.filters.push([key,value,'lte']); return q; },
      order(key,opts) { ordering.push([key,opts?.ascending !== false]); return q; }, range(from,to) { start=from;end=to+1;return q; }, limit(n) { end=n;return q; },
      insert(value) { call.op = 'insert'; call.value = value; return q; },
      update(value) { call.op = 'update'; call.value = value; return q; },
      single() { single = true; return Promise.resolve(result()); },
      maybeSingle() { single = true; return Promise.resolve(result()); },
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
    };
    function result() {
      if (options.dbError && call.op !== 'select') return { data: null, error: { message: 'fixture failure' } };
      if (table === 'businesses') {
        if (call.op === 'insert') { state.business = { ...state.business, ...call.value }; return { data: { id: businessId } }; }
        const found = !options.missingBusiness && matches(state.business);
        if (found && call.op === 'update') Object.assign(state.business,call.value);
        return { data: found ? state.business : null, error: options.lookupError ? { message: 'failed' } : null };
      }
      if (table === 'plaques') {
        if (call.op === 'insert') {
          const rows = (Array.isArray(call.value) ? call.value : [call.value]).map((row, i) => ({ id: `plaque-${state.plaques.length + i}`, created_at: '2026-09-29T12:00:00Z', ...row }));
          state.plaques.push(...rows); return { data: single ? rows[0] : rows };
        }
        const rows = selected(state.plaques);
        return { data: single ? rows[0] ?? null : rows };
      }
      if (table === 'tap_events') {
        if (call.op === 'insert') state.taps.push({ is_repeat: false, is_bot: false, ...call.value, created_at: new Date().toISOString() });
        const rows = selected(state.taps);
        return { data: head ? null : rows, count: rows.length };
      }
      return { data: single ? null : [] };
    }
    return q;
  } };
  const cache = {};
  function load(file) {
    file = path.resolve(file);
    if (cache[file]) return cache[file].exports;
    const mod = { exports: {} }; cache[file] = mod;
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const req = name => {
      if (name === 'server-only') return {};
      if (options.islands && (name === './pilot-form' || name === './pilot-plaques' || name === '@/components/pilots/admin-result-controls')) {
        return new Proxy({}, { get: (_, component) => function Island(props) {
          return React.createElement('div', { 'data-island': component, 'data-props': JSON.stringify(props) });
        } });
      }
      if (name === '@/lib/supabase/server') return { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: options.unauth ? null : { id: options.user ?? 'admin-fixture' } } }) } }) };
      if (name === '@/lib/supabase/admin') return { createAdminClient: () => { adminCalls++; return db; } };
      if (name === 'next/server') return { ...dependency(name), connection: async () => {} };
      if (name === '@/lib/require-subscription') return { requireSubscription: async () => ({ supabase: db, business: state.business }) };
      if (name === '@/app/components/app-shell') return function Shell({children}) { return React.createElement('main',null,children); };
      if (name === 'next/navigation') return { useRouter: () => ({ refresh() {}, push() {} }), redirect: to => { throw new Error('REDIRECT ' + to); }, notFound: () => { throw new Error('NOT_FOUND'); } };
      if (name === 'next/link') return function MockLink({ children, ...props }) { return React.createElement('a', props, children); };
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? name.slice(2) : path.resolve(path.dirname(file), name);
        return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
      }
      return dependency(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file })(req, mod, mod.exports);
    return mod.exports;
  }
  return { load, calls, state, db, get adminCalls() { return adminCalls; } };
}
