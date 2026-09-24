// Local-only commands. No remote URL, linking, reset, push, pull or deployment path.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { spawnSync, spawn } from 'node:child_process';
import { assertLocalStatus, validateSandbox, isolatedEnvironment, mappingSql, projectId } from './local-supabase/helpers.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const work=path.join(root,'.local-supabase');
const envFile=path.join(root,'.env.sandbox.local');
const command=process.argv[2];
function assertUnlinked() {
  if(fs.existsSync(path.join(work,'supabase/.temp/project-ref')))throw new Error('Refusing a linked project. This directory must remain local-only.');
  const config=fs.readFileSync(path.join(work,'supabase/config.toml'),'utf8');
  if(!config.includes(`project_id = "${projectId}"`))throw new Error('Unexpected local project ID.');
}
function status() {
  assertUnlinked();
  const dockerEnv={...process.env,DOCKER_HOST:'',DOCKER_CONTEXT:'desktop-linux'};
  const context=spawnSync('docker',['context','inspect','desktop-linux','--format','{{.Endpoints.docker.Host}}'],{encoding:'utf8',env:dockerEnv});
  if(context.status!==0||!context.stdout.trim().startsWith('unix://'))throw new Error('Docker Desktop must use a local Unix socket; remote Docker contexts are refused.');
  const result=spawnSync('npx',['--yes','supabase@2','status','--workdir',work,'-o','env'],{cwd:root,encoding:'utf8',env:{...dockerEnv,SUPABASE_ACCESS_TOKEN:'',SUPABASE_DB_PASSWORD:'',SUPABASE_WORKDIR:work},maxBuffer:1024*1024});
  if(result.status!==0)throw new Error('Local Supabase status failed. Start the isolated local stack first. Credentials/output suppressed.');
  const parsed=parseEnv(result.stdout);assertLocalStatus(parsed);return parsed;
}
try {
  if(command==='prepare') {
    const baseline=path.join(work,'baseline.reviewed.sql');
    if(!fs.existsSync(baseline))throw new Error('Missing .local-supabase/baseline.reviewed.sql. Obtain and review the complete schema-only baseline first; no schema will be invented.');
    const sql=fs.readFileSync(baseline,'utf8');
    if(!/CREATE TABLE[^;]*[".]?plaques["\s(]/i.test(sql)||!/CREATE TABLE[^;]*[".]?subscriptions["\s(]/i.test(sql))throw new Error('Baseline is missing required table definitions.');
    if(/moderntap_private/i.test(sql))throw new Error('Baseline already contains entitlement objects. Review migration ordering before continuing.');
    if(fs.existsSync(path.join(work,'supabase/config.toml')))throw new Error('Local config already exists. Refusing to overwrite the existing local setup.');
    fs.mkdirSync(path.join(work,'supabase/migrations'),{recursive:true});
    fs.copyFileSync(path.join(root,'scripts/local-supabase/config.toml'),path.join(work,'supabase/config.toml'));
    fs.copyFileSync(baseline,path.join(work,'supabase/migrations/20260924000000_reviewed_baseline.sql'));
    fs.copyFileSync(path.join(root,'supabase/migrations/20260925_enforce_active_plaque_limits.sql'),path.join(work,'supabase/migrations/20260925000000_active_plaque_limits.sql'));
    console.log('Prepared an isolated local workdir. No database contacted. Start it manually after reviewing the config.');
  } else if(command==='env') {
    const local=status();
    if(fs.existsSync(envFile))throw new Error('.env.sandbox.local already exists; refusing to overwrite it.');
    fs.writeFileSync(envFile,`# PRIVATE LOCAL SANDBOX ONLY. Local Supabase credentials are injected from CLI status.\n# Fill these Stripe sandbox values privately in your editor; never paste them in chat.\nSTRIPE_SECRET_KEY=\nSTRIPE_WEBHOOK_SECRET=\nSTRIPE_PRICE_STARTER=\nSTRIPE_PRICE_GROWTH=\nSTRIPE_PRICE_PRO=\nSTRIPE_PRICE_BUSINESS=\nMODERNTAP_ADMIN_USER_IDS=\n`,{flag:'wx',mode:0o600});
    assertLocalStatus(local);console.log('Created private .env.sandbox.local. Production .env.local was not changed.');
  } else if(command==='map'||command==='dev') {
    const local=status();const sandbox=parseEnv(fs.readFileSync(envFile,'utf8'));validateSandbox(sandbox);
    if(command==='map') {
      // Verify sandbox account and price semantics without printing IDs or credentials.
      const { default: Stripe }=await import('stripe');const stripe=new Stripe(sandbox.STRIPE_SECRET_KEY);
      for(const [i,key] of ['STRIPE_PRICE_STARTER','STRIPE_PRICE_GROWTH','STRIPE_PRICE_PRO','STRIPE_PRICE_BUSINESS'].entries()) {
        let price;try{price=await stripe.prices.retrieve(sandbox[key]);}catch{throw new Error(`Could not verify ${key} in Stripe Sandbox. Provider details suppressed.`);}
        if(price.livemode||!price.active||price.currency!=='usd'||price.unit_amount!==[999,1499,1999,2499][i]||price.recurring?.interval!=='month'||price.recurring.interval_count!==1||price.recurring.usage_type!=='licensed'||price.billing_scheme!=='per_unit'||price.transform_quantity)throw new Error(`Sandbox price validation failed for ${key}.`);
      }
      const result=spawnSync('docker',['exec','-i',`supabase_db_${projectId}`,'psql','-X','-q','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{encoding:'utf8',input:mappingSql(sandbox),maxBuffer:1024*1024,env:{...process.env,DOCKER_HOST:'',DOCKER_CONTEXT:'desktop-linux'}});
      if(result.status!==0)throw new Error('Local mapping failed. Check Docker Desktop and the local migration. SQL/error output suppressed to keep IDs private.');
      console.log('Sandbox mappings saved in the local Docker database: Starter 5, Growth 10, Pro 20, Business 30.');
    } else {
      const env=isolatedEnvironment(root,sandbox,local);
      // Fixed loopback address and port: never silently switch ports away from webhook forwarding.
      const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port','3000'],{cwd:root,env,stdio:'inherit'});
      child.on('exit',code=>{process.exitCode=code??1;});
      child.on('error',()=>{console.error('Could not start local Next.js.');process.exitCode=1;});
    }
  } else throw new Error('Usage: node scripts/local-supabase.mjs prepare|env|map|dev');
} catch(error) { console.error(error.code==='ENOENT'?'A required local file or tool is missing. See docs/local-supabase.md.':error.message);process.exitCode=1; }
