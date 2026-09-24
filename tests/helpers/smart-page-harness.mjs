import { createRequire } from 'node:module';
import React from 'react';
const loadDependency = createRequire(import.meta.url);
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import vm from 'node:vm';

export function harness(options = {}) {
  const calls = [], removed = [], uploaded = [];
  const oldPath = 'business/plaque/buttons/button/abcdef.png';
  const button = { id: 'button', image_path: oldPath, icon_key: null, updated_at: 'old', ...options.button };
  const db = { auth: { getUser: async () => ({ data: { user: options.unauth ? null : { id: 'user' } } }) },
    storage: { from: () => ({
      upload: async (p) => { uploaded.push(p); return { error: null }; },
      remove: async p => { removed.push(...p); return { error: null }; },
      download: async () => ({ data: options.missingImage ? null : new Blob(['image'], { type: 'image/png' }) }),
    }) },
    from(table) {
      const call = { table, filters: [], op: 'select' }; calls.push(call);
      const q = {
        select() { return q; }, eq(k,v) { call.filters.push([k,v]); return q; },
        order() { return q; }, limit() { return q; },
        update(v) { call.op = 'update'; call.value = v; return q; },
        insert(v) { call.op = 'insert'; call.value = v; return q; },
        delete() { call.op = 'delete'; return q; },
        async maybeSingle() { return result(); },
        then(resolve, reject) { return Promise.resolve(result()).then(resolve,reject); },
      };
      function result() {
        if (call.op !== 'select') return { data: options.conflict ? null : { id: 'button' }, error: null };
        if (table === 'businesses') return { data: { id: 'business' } };
        if (table === 'plaques') return { data: options.wrongPlaque ? null : { id: 'plaque', business_id: 'business', mode: 'smart_page' } };
        if (table === 'smart_pages') return { data: { id: 'page', presentation_version: options.version ?? 1 } };
        if (table === 'smart_page_buttons') return { data: options.wrongButton ? null : call.filters.some(([k]) => k === 'id') ? button : [{ ...button, smart_page_id: 'page', label: 'Menu', destination_url: 'https://example.com', enabled: true, position: 0 }, { ...button, id: 'second', position: 1 }] };
        return { data: null };
      }
      return q;
    },
  };
  const cache = {};
  function load(file) {
    file = path.resolve(file);
    if (cache[file]) return cache[file].exports;
    const compiled = { exports: {} }; cache[file] = compiled;
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const req = name => {
      if (name === 'react' && options.failedImageSrc) return { ...React, useState: () => [options.failedImageSrc, () => {}] };
      if (name === '@/lib/supabase/server') return { createClient: async () => db };
      if (name === '@/lib/supabase/admin') return { createAdminClient: () => db };
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? name.slice(2) : path.resolve(path.dirname(file),name);
        return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
      }
      return loadDependency(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(req,compiled,compiled.exports);
    return compiled.exports;
  }
  return { load, calls, removed, uploaded, oldPath };
}
