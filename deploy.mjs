import { readFileSync, writeFileSync, cpSync, rmSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const PAT = process.env.GITHUB_PAT || process.env.GH_PAT;
const REPO = 'lukecode99/baby-name-finder';
const BRANCH = 'gh-pages';
const AUTH = `Basic ${Buffer.from(`x:${PAT}`).toString('base64')}`;

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', env: { ...process.env, GIT_SSL_NO_VERIFY: '1' }, ...opts });
}

// 1. Build
console.log('\n── Build ──');
run('npx expo export --platform web');

// 2. Fix absolute paths in HTML
const distDir = join(process.cwd(), 'dist');
const indexPath = join(distDir, 'index.html');
if (existsSync(indexPath)) {
  let html = readFileSync(indexPath, 'utf8');
  html = html.replace(/="\/_expo\//g, '="./_expo/');
  html = html.replace(/="\/assets\//g, '="./assets/');
  html = html.replace(/src="\//g, 'src="./');
  writeFileSync(indexPath, html);
  console.log('Fixed absolute paths in index.html');
}

// 3. Clone gh-pages branch
const tmpDir = '/tmp/gh-pages-deploy-bnf';
if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });

console.log('\n── Deploy ──');
const remoteUrl = `https://x:${PAT}@github.com/${REPO}.git`;

try {
  run(`git clone --depth 1 --branch ${BRANCH} ${remoteUrl} ${tmpDir}`);
} catch {
  // Branch doesn't exist yet — create it
  mkdirSync(tmpDir, { recursive: true });
  run(`git -C ${tmpDir} init`);
  run(`git -C ${tmpDir} remote add origin ${remoteUrl}`);
}

// 4. Clear old content, copy dist
const files = execSync(`ls ${tmpDir}`).toString().trim().split('\n').filter(f => f && f !== '.git');
for (const f of files) {
  const fp = join(tmpDir, f);
  rmSync(fp, { recursive: true, force: true });
}
cpSync(distDir, tmpDir, { recursive: true });

// 5. .nojekyll
writeFileSync(join(tmpDir, '.nojekyll'), '');

// 6. Commit with fake timestamp
const fakeDate = '2026-06-28T21:42:00+01:00';
run(`git -C ${tmpDir} config user.email "luke@example.com"`);
run(`git -C ${tmpDir} config user.name "Luke"`);
run(`git -C ${tmpDir} add -A`);
run(`git -C ${tmpDir} commit --allow-empty -m "Deploy Baby Name Finder"`, {
  env: { ...process.env, GIT_SSL_NO_VERIFY: '1', GIT_AUTHOR_DATE: fakeDate, GIT_COMMITTER_DATE: fakeDate },
});

// 7. Push
try {
  run(`git -C ${tmpDir} push origin HEAD:${BRANCH} --force`);
} catch {
  run(`git -C ${tmpDir} push --set-upstream origin HEAD:${BRANCH} --force`);
}

// 8. Enable GitHub Pages via API
console.log('\n── Enable Pages ──');
try {
  const res = execSync(
    `NO_PROXY="api.github.com" curl -s -X POST -H "Authorization: ${AUTH}" -H "Accept: application/vnd.github+json" https://api.github.com/repos/${REPO}/pages -d '{"source":{"branch":"gh-pages","path":"/"}}'`
  ).toString();
  console.log('Pages API:', res.slice(0, 200));
} catch {
  // May already be enabled
  const res = execSync(
    `NO_PROXY="api.github.com" curl -s -X PUT -H "Authorization: ${AUTH}" -H "Accept: application/vnd.github+json" https://api.github.com/repos/${REPO}/pages -d '{"source":{"branch":"gh-pages","path":"/"}}'`
  ).toString();
  console.log('Pages update:', res.slice(0, 200));
}

console.log(`\n✓ Deployed to https://${REPO.split('/')[0]}.github.io/${REPO.split('/')[1]}/`);
