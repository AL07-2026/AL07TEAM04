// Dry-run only. Inline fixture data; no document writes, rule release, or external get() mocks.
// API contract: https://firebase.google.com/docs/reference/rules/rest/v1/projects/test
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const req = createRequire(`${process.argv[2]}/package.json`);
const { requireAuth } = req('./lib/requireAuth.js');
const { getProjectDefaultAccount } = req('./lib/auth.js');
const { Client } = req('./lib/apiv2.js');
const project = 'al07team04-bdfcd';
await requireAuth({ project, ...getProjectDefaultAccount(process.cwd()), nonInteractive: true });
const client = new Client({ urlPrefix: 'https://firebaserules.googleapis.com', apiVersion: 'v1' });
const user = { uid: 'rules-fixture-company', token: { email: 'fixture@example.com' } };
const admin = { uid: 'rules-fixture-admin', token: { email: 'admin@example.com', adminRole: 'operations_admin' } };
const cases = [];
function add(label, collection, id, method, auth, allow, data = {}, previous = {}) {
  const path = `/databases/(default)/documents/${collection}/${id}`;
  cases.push({ label, test: {
    expectation: allow ? 'ALLOW' : 'DENY',
    request: { path, method, auth, resource: { data }, time: '2026-09-08T00:00:00Z' },
    resource: { data: previous },
  } });
}
for (const name of ['company_profiles', 'senior_profiles', 'companies']) {
  add(name + ' own create', name, user.uid, 'create', user, true, { companyName: '검증 기업' });
  add(name + ' own get', name, user.uid, 'get', user, true);
  add(name + ' other get denied', name, 'another-user', 'get', user, false);
  add(name + ' other write denied', name, 'another-user', 'update', user, false);
  add(name + ' guest denied', name, user.uid, 'get', null, false);
  add(name + ' admin read', name, user.uid, 'get', admin, true);
}
const profile = { name: '검증 기업', email: user.token.email, role: 'company' };
add('signup', 'users', user.uid, 'create', user, true, profile);
add('other signup denied', 'users', 'another-user', 'create', user, false, profile);
add('role escalation denied', 'users', user.uid, 'create', user, false, { ...profile, role: 'super_admin' });
add('admin field denied', 'users', user.uid, 'create', user, false, { ...profile, adminRole: 'super_admin' });
add('spoofed email denied', 'users', user.uid, 'create', user, false, { ...profile, email: 'another@example.com' });
add('profile update', 'users', user.uid, 'update', user, true, { ...profile, name: '변경 이름' }, profile);
add('role switch denied', 'users', user.uid, 'update', user, false, { ...profile, role: 'senior' }, profile);
for (const name of ['premium_company_applications', 'premium_company_entitlements', 'premium_company_listings', 'premium_company_reviews']) {
  add(name + ' direct user denied', name, user.uid, 'create', user, false, { used: 0, status: 'approved' });
  add(name + ' direct admin denied', name, user.uid, 'update', admin, false, { used: 0 });
  add(name + ' private read denied', name, user.uid, 'get', user, false);
}
add('experience own create', 'experience_cards', 'card', 'create', user, true, { uid: user.uid });
add('experience ownership transfer denied', 'experience_cards', 'card', 'update', user, false, { uid: 'another' }, { uid: user.uid });
add('unrelated collection stays denied', 'job_sync_metadata', 'sync', 'update', admin, false);
const { body } = await client.post(`/projects/${project}:test`, {
  source: { files: [{ name: 'firestore.rules', content: await readFile('firestore.rules', 'utf8') }] },
  testSuite: { testCases: cases.map(({ test }) => test) },
});
const failed = (body.testResults || []).flatMap((result, index) => result.state === 'SUCCESS' ? [] : [{ label: cases[index].label, result }]);
console.log(JSON.stringify({ cases: cases.length, results: body.testResults?.length, issues: body.issues || [], failed }));
if (body.issues?.some((issue) => issue.severity === 'ERROR') || failed.length || body.testResults?.length !== cases.length) process.exitCode = 1;
