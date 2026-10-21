// Generates every script variant and runs `bash -n` (and `fish -n` if fish is installed) on it.
// Usage: node tools/check.js
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const { spawnSync } = require('child_process');

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8').split('/* UI */')[0];
const api = vm.runInNewContext(src + ';({gen,fish,purge,st,VERS,OS})', { location: { search: '' }, URL, URLSearchParams });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'odoo-check-'));
const hasFish = spawnSync('fish', ['--version']).status === 0;
let n = 0, bad = 0;

const run = (cmd, args, label, text) => {
  const f = path.join(tmp, label.replace(/\W+/g, '_'));
  fs.writeFileSync(f, text + '\n');
  const r = spawnSync(cmd, [...args, f], { encoding: 'utf8' });
  n++;
  if (r.status !== 0) { bad++; console.error('FAIL', cmd, label + '\n' + r.stderr); }
};

for (const v of api.VERS) for (const o of Object.keys(api.OS)) for (const mode of ['system', 'user']) for (const variant of ['defaults', 'everything']) {
  const s = { ...api.st, v, os: o, mode };
  if (variant === 'everything') Object.assign(s, { db: 'mydb', workers: '4', proxy: 1, listdb: 1, ppdb: 1, pdbs: 'a b', prole: 1, ppg: 1, svc: 0 });
  const id = [v, o, mode, variant].join('-');
  run('bash', ['-n'], 'install-' + id, api.gen(s));
  run('bash', ['-n'], 'purge-' + id, api.purge(s));
  if (hasFish) run('fish', ['-n'], 'fish-' + id, api.fish(s));
}
console.log(`${n} scripts checked${hasFish ? '' : ' (fish not installed: fish files skipped)'}, ${bad} failed`);
process.exit(bad ? 1 : 0);
