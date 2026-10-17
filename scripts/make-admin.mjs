// Usage: npm run make-admin -- you@example.com
// Gives an existing account access to /admin. Sign in to the app once with that email first.
import { admin } from "./env.mjs";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run make-admin -- you@example.com");
  process.exit(1);
}
const db = admin();
const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;
const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No account for ${email}. Sign in to Lovira with it once, then run this again.`);
  process.exit(1);
}
const { error: e2 } = await db.from("admins").upsert({ user_id: user.id });
if (e2) throw e2;
console.log(`${email} is now an admin. Open /admin in the app.`);
