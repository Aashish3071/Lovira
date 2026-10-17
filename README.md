# Lovira

Verified-only dating for everyone in India. Free users see 150 verified profiles a day; passes start at ₹29/day.

**Stack:** Next.js 15 (mobile-first PWA) · Supabase (database, login, file storage, realtime chat) · Razorpay (UPI/cards) · Vercel (hosting). Every tier is free to start.

---

## 1. One-time setup (about 30 minutes)

### a) Supabase (database + login + photos)
1. Create a free account at **supabase.com**, then **New project**. Pick the **Mumbai (ap-south-1)** region and save the database password somewhere safe.
2. Open **SQL Editor → New query**, paste the whole of `supabase/migrations/20261017000000_init.sql`, and click **Run**.
3. Open **Authentication → Emails → Templates → Magic Link** and replace the body with the contents of `supabase/templates/magic_link.html`. This makes the email show the 6-digit code.
4. Open **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` for now (change it to your real domain later)
   - Redirect URLs: add `http://localhost:3000/auth/callback`
5. Open **Project Settings → API** and copy the **Project URL**, the **anon public** key and the **service_role** key.

### b) Your keys
```bash
cp .env.example .env.local
```
Open `.env.local` and paste in the Supabase values. The Razorpay lines can wait until step d.

### c) Run it
```bash
npm install
```
```bash
npm run dev
```
Open http://localhost:3000 and sign in with your own email. Then make yourself an admin:
```bash
npm run make-admin -- you@example.com
```
For test people in the feed, run the command below. **Development only:** it adds 20 verified fake profiles.
```bash
npm run seed
```

### d) Razorpay (payments)
1. Sign up at **razorpay.com**. You can test straight away in **Test Mode**; going live needs your KYC (a sole proprietorship is fine).
2. Go to **Account & Settings → API Keys → Generate Test Key**, and put the ID and secret in `.env.local`.
3. After you deploy (step 2), go to **Webhooks → Add**:
   - URL: `https://YOUR-DOMAIN/api/payments/webhook`
   - Event: `payment.captured`
   - Secret: any long random string. Put the same string in `RAZORPAY_WEBHOOK_SECRET`.
4. Test card: `4111 1111 1111 1111`, any future date, any CVV. Test UPI: `success@razorpay`.

## 2. Going live on Vercel
1. Push this folder to a private GitHub repo.
2. At **vercel.com → Add New → Project**, import the repo.
3. Add every variable from `.env.local` under **Environment Variables**, with `NEXT_PUBLIC_SITE_URL` set to your real URL.
4. Deploy. Then update the Supabase **Site URL** and **Redirect URLs** to your Vercel or custom domain.
5. Supabase's built-in email only sends a few emails per hour. Before launch, connect a free SMTP provider (for example Resend) under **Authentication → Emails → SMTP**.

## 3. Daily admin work
Go to `/admin` (or **Profile → Admin panel**):
- **Verifications:** compare the live selfie with the profile photos and the ID, then approve or reject. The ID image is **deleted automatically** when you decide.
- **Reports:** suspend or dismiss.

## 4. Changing prices and limits
Edit the `plans` table in Supabase (**Table Editor → plans**). Prices are in **paise** (₹29 = 2900); `daily_limit` is profiles per day. No code change is needed.

## Before taking real money
- Fill in the `[bracketed]` details in `src/app/legal/[slug]/page.tsx` (your name, address, grievance officer email).
- **Have a lawyer review** the Privacy Policy and Terms (DPDP Act 2023, IT Rules 2021).

## Testing on your Mac without a Supabase account
With Docker Desktop running:
```bash
npx supabase start -x edge-runtime,logflare,vector,imgproxy,supavisor,studio,postgres-meta
```
This applies the migrations automatically. Point `.env.local` at `http://127.0.0.1:54321` using the classic **JWT-style** anon and service_role keys (they start with `eyJ`). The new `sb_publishable_` keys break realtime chat locally. Sign-in codes land in the local mailbox at http://127.0.0.1:54324. As an admin you'll see a **"Verify me (admin)"** shortcut on the verification screen.

## Developer notes
- `npm run test:db` runs the 41 database security checks against an in-memory Postgres.
- `npm run typecheck`, `npm run lint` and `npm run build` must all pass before deploying.
- All rules that matter (18+, verified-only feed, daily limits, matching, chat access) are enforced in the database (`supabase/migrations`), not just in the UI.
