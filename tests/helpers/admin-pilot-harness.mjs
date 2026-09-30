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
  const state = { business: { id: businessId, name: "Lorenzo’s (Pilot)", is_pilot: true, owner_id: null, created_at: '2026-09-29T00:00:00Z', trial_started_at: '2026-09-29T00:00:00Z', trial_ends_at: '2026-10-29T00:00:00Z', pilot_reviews_start: 125, pilot_rating_start: 4.5, pilot_notes: 'Restaurant pilot', ...options.business }, plaques: [], taps: [] };
  let adminCalls = 0;
  const db = { from(table) {
    const call = { table, op: 'select', filters: [] }; calls.push(call);
    let single = false, head = false;
    const q = {
      select(columns, opts) { call.columns = columns; head = opts?.head; return q; },
      eq(key, value) { call.filters.push([key, value]); return q; },
      in(key, value) { call.filters.push([key, value]); return q; },
      gte() { return q; }, order() { return q; }, range() { return q; }, limit() { return q; },
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
        return { data: options.missingBusiness ? null : state.business, error: options.lookupError ? { message: 'failed' } : null };
      }
      if (table === 'plaques') {
        if (call.op === 'insert') {
          const rows = (Array.isArray(call.value) ? call.value : [call.value]).map((row, i) => ({ id: `plaque-${state.plaques.length + i}`, created_at: '2026-09-29T12:00:00Z', ...row }));
          state.plaques.push(...rows); return { data: single ? rows[0] : rows };
        }
        const rows = state.plaques.filter(p => call.filters.every(([k, v]) => Array.isArray(v) ? v.includes(p[k]) : p[k] === v));
        return { data: single ? rows[0] ?? null : rows };
      }
      if (table === 'tap_events') {
        if (call.op === 'insert') state.taps.push({ ...call.value, created_at: new Date().toISOString() });
        const rows = state.taps.filter(p => call.filters.every(([k, v]) => Array.isArray(v) ? v.includes(p[k]) : p[k] === v));
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
      if (options.islands && (name === './pilot-form' || name === './pilot-plaques')) {
        return new Proxy({}, { get: (_, component) => function Island(props) {
          return React.createElement('div', { 'data-island': component, 'data-props': JSON.stringify(props) });
        } });
      }
      if (name === '@/lib/supabase/server') return { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: options.unauth ? null : { id: options.user ?? 'admin-fixture' } } }) } }) };
      if (name === '@/lib/supabase/admin') return { createAdminClient: () => { adminCalls++; return db; } };
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
  return { load, calls, state, get adminCalls() { return adminCalls; } };
}
