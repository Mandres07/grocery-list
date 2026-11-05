import { randomBytes } from 'node:crypto';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** @param {string} value */
export function deploymentOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.hostname === 'localhost') throw new Error('Use a canonical HTTPS application origin without a path, query, or credentials.');
  return url.origin;
}

/** @param {'production' | 'preview'} stage @param {string} origin @param {Record<string, string | undefined>} values @param {string} secret */
export function deploymentEnvironment(stage, origin, values, secret) {
  if (stage !== 'production' && stage !== 'preview') throw new Error('Choose production or preview.');
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('Use a unique session secret of at least 32 characters.');
  const password = stage === 'production' ? values.ATLAS_PRODUCTION_PASSWORD : values.ATLAS_PREVIEW_PASSWORD;
  if (!password || !values.MONGODB_URI) throw new Error('Configure the private Atlas maintenance file and app-user passwords first.');
  const uri = new URL(values.MONGODB_URI);
  if (uri.protocol !== 'mongodb+srv:') throw new Error('Hosted deployments require the Atlas SRV connection.');
  uri.username = stage === 'production' ? 'lista-production' : 'lista-preview';
  uri.password = encodeURIComponent(password);
  uri.pathname = '/';
  uri.searchParams.set('authSource', 'admin');
  uri.searchParams.set('retryWrites', 'true');
  uri.searchParams.set('w', 'majority');
  const apiKey = values.RESEND_API_KEY?.trim();
  const from = values.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from || /@resend\.dev\b/i.test(from)) throw new Error('Configure this app’s Resend key and verified sender in .env.local first.');
  return {
    MONGODB_URI: uri.toString(),
    MONGODB_DB_NAME: stage === 'production' ? 'grocery_list_production' : 'grocery_list_preview',
    NEXTAUTH_URL: deploymentOrigin(origin),
    NEXTAUTH_SECRET: secret,
    RESEND_API_KEY: apiKey,
    RESEND_FROM_EMAIL: from,
    ...(values.RESEND_REPLY_TO_EMAIL?.trim() ? { RESEND_REPLY_TO_EMAIL: values.RESEND_REPLY_TO_EMAIL.trim() } : {}),
  };
}

/** @param {string} stage @param {string} origin */
export async function prepareDeploymentFile(stage, origin) {
  if (stage !== 'production' && stage !== 'preview') throw new Error('Choose production or preview.');
  const path = resolve(`.env.vercel.${stage}.local`);
  let secret = randomBytes(48).toString('base64url');
  try {
    const existing = await readFile(path, 'utf8');
    const match = existing.match(/^NEXTAUTH_SECRET=(.+)$/m);
    if (!match) throw new Error('Existing deployment file has no generated session secret; refusing to overwrite it.');
    secret = JSON.parse(match[1]);
  } catch (error) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error; }
  const values = deploymentEnvironment(stage, origin, process.env, secret);
  const contents = Object.entries(values).map(([name, value]) => `${name}=${JSON.stringify(value)}`).join('\n') + '\n';
  await writeFile(path, contents, { mode: 0o600 });
  await chmod(path, 0o600);
  console.log(`Prepared private ${stage} configuration: ${path}. Import only into its matching Vercel environment; do not share its contents.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  prepareDeploymentFile(process.argv[2], process.argv[3]).catch(() => {
    console.error('Deployment configuration could not be prepared. Check the private Atlas/email settings, requested HTTPS origin, and existing generated file. No secrets printed.');
    process.exitCode = 1;
  });
}
