import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
export const priceKeys=['STRIPE_PRICE_STARTER','STRIPE_PRICE_GROWTH','STRIPE_PRICE_PRO','STRIPE_PRICE_BUSINESS'];
export const projectId='moderntap-local-sandbox';
export function assertLocalStatus(status) {
  if(status.API_URL!=='http://127.0.0.1:54321' && status.API_URL!=='http://localhost:54321')throw new Error('Refusing a non-local Supabase API.');
  const db=new URL(status.DB_URL);
  if(!['127.0.0.1','localhost'].includes(db.hostname)||db.port!=='54322'||db.pathname!=='/postgres')throw new Error('Refusing a non-local database.');
  if(!status.ANON_KEY||!status.SERVICE_ROLE_KEY)throw new Error('Local CLI status must include local ANON_KEY and SERVICE_ROLE_KEY.');
}
export function validateSandbox(env) {
  if(!/^sk_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY??''))throw new Error('A Stripe Sandbox sk_test_ key is required. Live keys are refused.');
  if(!/^whsec_[A-Za-z0-9]+$/.test(env.STRIPE_WEBHOOK_SECRET??''))throw new Error('Set the signing secret from your local Stripe listener.');
  const ids=priceKeys.map(key=>env[key]);
  if(ids.some(id=>!/^price_[A-Za-z0-9]+$/.test(id??''))||new Set(ids).size!==4)throw new Error('Set four distinct sandbox price IDs privately in .env.sandbox.local.');
}
export function isolatedEnvironment(root, sandbox, status) {
  assertLocalStatus(status);validateSandbox(sandbox);
  // Next gives process.env precedence over dotenv. Blank EVERY discovered dotenv
  // name first, so unlisted production secrets cannot fall through from .env.local.
  const result={};
  for(const key of ['PATH','HOME','TMPDIR','USER','LOGNAME','SHELL','LANG','LC_ALL','TERM','SystemRoot'])if(process.env[key])result[key]=process.env[key];
  for(const name of fs.readdirSync(root).filter(name=>/^\.env(?:\.|$)/.test(name))) {
    if(fs.statSync(path.join(root,name)).isFile()) for(const key of Object.keys(parseEnv(fs.readFileSync(path.join(root,name),'utf8'))))result[key]='';
  }
  for(const key of [...priceKeys,'STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','MODERNTAP_ADMIN_USER_IDS','MODERNTAP_PLAQUE_ENTITLEMENTS_ENABLED']) result[key]=sandbox[key]??'';
  Object.assign(result,{
    NODE_ENV:'development',NEXT_PUBLIC_SUPABASE_URL:status.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:status.ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:status.SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:status.ANON_KEY,STRIPE_PRICE_ID:'',
    SUPABASE_ACCESS_TOKEN:'',SUPABASE_DB_PASSWORD:'',NEXT_TELEMETRY_DISABLED:'1',
  });
  return result;
}
export function mappingSql(sandbox) {
  validateSandbox(sandbox);
  const rows=priceKeys.map((key,i)=>`('${sandbox[key]}','${['starter','growth','pro','business'][i]}',${[5,10,20,30][i]})`);
  return `begin;\ninsert into moderntap_private.price_entitlements (stripe_price_id,plan_key,maximum_active) values ${rows.join(',')} on conflict (stripe_price_id) do update set plan_key=excluded.plan_key, maximum_active=excluded.maximum_active;\ncommit;\n`;
}
