// Runs every migration against an in-memory Postgres (PGlite) with a stubbed Supabase
// environment, then walks the main flows as different users to check the security rules.
// Usage: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../migrations/', import.meta.url);
const migration = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');
const db = new PGlite();

const stub = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
create schema auth; grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated, service_role;
create schema storage; grant usage on schema storage to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant all on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
grant execute on function storage.foldername(text) to authenticated;
create publication supabase_realtime;
`;

await db.exec(stub);
try { await db.exec(migration); } catch (e) { console.log("MIGRATION ERROR:", e.message, e.position); process.exit(1); }
console.log('migration OK');

const U = (n) => `00000000-0000-0000-0000-00000000000${n}`;
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };

async function as(uid, sql, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${uid ? 'authenticated' : 'anon'};`);
  try { return await db.query(sql, params); } finally { await db.exec('reset role;'); }
}
async function fails(uid, sql, params = []) {
  try { await as(uid, sql, params); return null; } catch (e) { return e.message; }
}
const one = async (uid, sql, params) => (await as(uid, sql, params)).rows[0];

for (let i = 1; i <= 6; i++) await db.query('insert into auth.users values ($1)', [U(i)]);
await db.query(`insert into admins values ($1)`, [U(6)]);

const mk = (uid, name, dob, gender, showMe, city, state) =>
  as(uid, `insert into profiles (id, name, dob, gender, show_me, city, state) values ($1,$2,$3,$4,$5,$6,$7)`,
    [uid, name, dob, gender, showMe, city, state]);

// Under 18 is rejected.
const young = new Date(); young.setFullYear(young.getFullYear() - 17);
ok(/18 or older/.test(await fails(U(1), `insert into profiles (id, name, dob, gender, show_me, city, state) values ($1,'Kid',$2,'man','{woman}','Pune','Maharashtra')`, [U(1), young.toISOString().slice(0, 10)])), 'under-18 blocked');

await mk(U(1), 'Arjun', '1998-01-01', 'man', ['woman'], 'Pune', 'Maharashtra');
await mk(U(2), 'Priya', '1999-05-05', 'woman', ['man'], 'Mumbai', 'Maharashtra');
await mk(U(3), 'Neha', '1997-03-03', 'woman', ['man'], 'Pune', 'Maharashtra');
await mk(U(4), 'Sam', '1996-02-02', 'non_binary', ['woman', 'non_binary'], 'Delhi', 'Delhi');
await mk(U(5), 'Riya', '1995-02-02', 'woman', ['man', 'non_binary'], 'Delhi', 'Delhi');
await mk(U(6), 'Admin', '1990-01-01', 'man', ['woman'], 'Pune', 'Maharashtra');

// User can't promote themselves or self-unsuspend.
await as(U(1), `update profiles set status = 'suspended' where id = $1`, [U(1)]);
ok((await one(U(1), `select status from profiles where id = $1`, [U(1)])).status === 'active', 'user cannot change own status');
ok((await as(U(1), `select * from profiles where id = $1`, [U(2)])).rows.length === 0, 'cannot read other profiles (dob hidden)');

for (let i = 1; i <= 5; i++) await as(U(i), `insert into photos (user_id, path) values ($1::uuid, $1::text || '/a.jpg')`, [U(i)]);

// Unverified: no feed, can't direct-insert verification approved.
ok(/Verify/.test(await fails(U(1), `select get_feed(10)`)), 'unverified cannot load feed');
ok(!!(await fails(U(1), `insert into verifications (user_id, status, id_type) values ($1,'approved','pan')`, [U(1)])), 'cannot self-approve verification');
ok(!!(await fails(U(1), `select submit_verification('pan', $1, 'someone-else/id.jpg')`, [U(1) + '/s.jpg'])), 'cannot submit other user paths');
ok(!!(await fails(U(1), `select profile_card($1)`, [U(2)])), 'profile_card not callable directly');

for (let i = 1; i <= 5; i++) await as(U(i), `select submit_verification('pan', $1::text || '/s.jpg', $1::text || '/id.jpg')`, [U(i)]);
ok(!!(await fails(U(1), `select admin_review($1, true)`, [U(1)])), 'non-admin cannot review');
const pending = (await one(U(6), `select admin_pending_verifications() as j`)).j;
ok(pending.length === 5 && pending[0].profile.name, 'admin sees pending queue');
for (let i = 1; i <= 5; i++) await as(U(6), `select admin_review($1, true)`, [U(i)]);
ok((await db.query(`select count(*)::int c from verifications where id_path is not null`)).rows[0].c === 0, 'id_path cleared after review');

// Feed: Arjun (man, Pune) wants women -> Neha (Pune) before Priya (Mumbai); not Riya? Riya shows man too.
const feed = (await one(U(1), `select get_feed(10) as j`)).j;
console.log('  feed for Arjun:', feed.profiles.map((p) => `${p.name}/${p.city}`).join(', '), 'remaining', feed.remaining);
ok(feed.profiles[0].name === 'Neha', 'same city ranked first');
ok(feed.profiles.every((p) => p.age && !('dob' in p)), 'feed shows age, not dob');
ok(!feed.profiles.some((p) => p.name === 'Sam'), 'show-me respected (non_binary not shown to man wanting women)');
const samFeed = (await one(U(4), `select get_feed(10) as j`)).j;
ok(samFeed.profiles.map((p) => p.name).join() === 'Riya', 'two-way show-me (Sam sees only Riya)');

// Like flow.
let r = (await one(U(1), `select swipe($1, true) as j`, [U(3)])).j;
ok(!r.matched, 'one-way like no match');
const likes = (await one(U(3), `select likes_received() as j`)).j;
ok(likes.count === 1 && !likes.can_see && likes.profiles.length === 0, 'free user sees count only');
r = (await one(U(3), `select swipe($1, true) as j`, [U(1)])).j;
ok(r.matched && r.match_id, 'mutual like creates match');
const matchId = r.match_id;
ok((await one(U(1), `select my_status() as j`)).j.used_today === 1, 'swipe counted toward daily use');

// Chat.
await as(U(1), `insert into messages (match_id, sender, body) values ($1, $2, 'Hi Neha')`, [matchId, U(1)]);
ok((await as(U(3), `select * from messages where match_id = $1`, [matchId])).rows.length === 1, 'match member reads message');
ok((await as(U(2), `select * from messages where match_id = $1`, [matchId])).rows.length === 0, 'outsider cannot read messages');
ok(!!(await fails(U(2), `insert into messages (match_id, sender, body) values ($1, $2, 'hack')`, [matchId, U(2)])), 'outsider cannot send');
ok(!!(await fails(U(1), `insert into messages (match_id, sender, body) values ($1, $2, 'spoof')`, [matchId, U(3)])), 'cannot spoof sender');
ok((await one(U(1), `select my_matches() as j`)).j[0].last_message === 'Hi Neha', 'matches list shows last message');

// Premium: give Neha a day pass (as service role would) -> sees who liked her.
await as(U(2), `select swipe($1, true)`, [U(1)]); // Priya likes Arjun
await db.query(`insert into subscriptions (user_id, plan_id, ends_at, amount_paise, razorpay_order_id, razorpay_payment_id) values ($1,'day', now() + interval '24 hours', 2900, 'o1', 'p1')`, [U(1)]);
const prem = (await one(U(1), `select likes_received() as j`)).j;
ok(prem.can_see && prem.profiles[0].name === 'Priya', 'premium sees who liked them');
ok((await one(U(1), `select my_status() as j`)).j.plan.daily_limit === 600, 'day pass raises limit');
ok((await as(U(1), `select * from subscriptions`)).rows.length === 1 && (await as(U(2), `select * from subscriptions`)).rows.length === 0, 'subscriptions private');
ok(!!(await fails(U(2), `insert into subscriptions (user_id, plan_id, ends_at, amount_paise, razorpay_order_id, razorpay_payment_id) values ($1,'month', now() + interval '30 days', 0, 'x', 'y')`, [U(2)])), 'cannot grant self a pass');

// Block removes match and hides both ways.
await as(U(3), `select block_user($1)`, [U(1)]);
ok((await one(U(1), `select my_matches() as j`)).j.length === 0, 'block removes match');
ok(!!(await fails(U(1), `select swipe($1, true)`, [U(3)])), 'cannot swipe blocked user');

// Reports and suspension.
await as(U(2), `insert into reports (reporter, reported, reason) values ($1, $2, 'scam')`, [U(2), U(5)]);
ok((await as(U(2), `select * from reports`)).rows.length === 0, 'reporter cannot list reports');
ok((await one(U(6), `select admin_reports() as j`)).j.length === 1, 'admin sees report');
await as(U(6), `select admin_set_status($1, 'suspended')`, [U(5)]);
const samFeed2 = (await one(U(4), `select get_feed(10) as j`)).j;
ok(samFeed2.profiles.length === 0, 'suspended user leaves feeds');
ok(/Verify/.test(await fails(U(5), `select get_feed(10)`)), 'suspended user cannot use feed');

// Daily limit.
await db.query(`delete from subscriptions`);
await db.query(`update plans set daily_limit = 2 where id = 'free'`);
await as(U(1), `select swipe($1, false)`, [U(2)]);
ok(/Daily limit/.test(await fails(U(1), `select swipe($1, false)`, [U(4)])), 'daily limit enforced');
ok((await one(U(1), `select get_feed(10) as j`)).j.remaining === 0, 'feed reports 0 remaining');

// Storage policies.
await as(U(1), `insert into storage.objects (bucket_id, name) values ('verification', $1::text || '/new.jpg')`, [U(1)]);
ok((await as(U(1), `select * from storage.objects where bucket_id = 'verification'`)).rows.length === 0, 'user cannot read back own ID');
ok((await as(U(6), `select * from storage.objects where bucket_id = 'verification'`)).rows.length === 1, 'admin can read ID');
ok(!!(await fails(U(1), `insert into storage.objects (bucket_id, name) values ('photos', $1::text || '/x.jpg')`, [U(2)])), 'cannot upload into another user folder');

// Admin self-verify shortcut.
await db.query('insert into auth.users values ($1)', ['00000000-0000-0000-0000-000000000007']);
await mk('00000000-0000-0000-0000-000000000007', 'Mallory', '1995-01-01', 'man', ['woman'], 'Pune', 'Maharashtra');
ok(!!(await fails('00000000-0000-0000-0000-000000000007', `select admin_self_verify()`)), 'non-admin cannot self-verify');
await as(U(6), `select admin_self_verify()`);
ok((await one(U(6), `select my_status() as j`)).j.verification.status === 'approved', 'admin can self-verify');

// Anonymous visitor.
ok((await as(null, `select * from plans`)).rows.length === 4, 'anon can read plans');
ok((await as(null, `select * from profiles`)).rows.length === 0, 'anon reads no profiles');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
