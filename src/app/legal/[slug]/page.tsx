import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui";

// DRAFT legal text. Have a lawyer review it, and fill in the [bracketed] details, before taking real payments.
const CONTACT = {
  company: "[Your legal name / company name]",
  address: "[Registered address, City, State, PIN]",
  officer: "[Grievance Officer name]",
  email: "[grievance@yourdomain.in]",
  support: "[support@yourdomain.in]",
};

type Page = { title: string; sections: [string, string[]][] };

const PAGES: Record<string, Page> = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      ["Who we are", [`Lovira is operated by ${CONTACT.company}, ${CONTACT.address}. This policy explains how we handle your personal data under India's Digital Personal Data Protection Act, 2023.`]],
      ["What we collect", [
        "Account: email address.",
        "Profile: name, date of birth, gender, orientation (optional), who you want to see, city, state, photos, bio and prompts.",
        "Verification: a live selfie and a photo of one government ID. The ID photo is deleted as soon as our team reviews it. We keep only the result (verified or not), the type of ID, and the selfie, to protect against impersonation.",
        "Activity: likes, passes, matches, messages, reports and blocks.",
        "Payments: Razorpay processes all payments. We never see or store your card, UPI or bank details. We keep the order and payment reference and the amount.",
      ]],
      ["Why we use it", [
        "To run the service: show your profile to other verified members, create matches and deliver messages.",
        "To keep Lovira safe: confirm you are a real person aged 18 or older, investigate reports and remove fake or abusive accounts.",
        "To process passes you buy.",
        "We do not sell your personal data and do not use it for third-party advertising.",
      ]],
      ["Who can see what", [
        "Other verified members see your first name, age (not your date of birth), gender, orientation if you add it, city, state, photos, bio and prompts.",
        "Only you and your match can read your chat. Our team may review messages only when a conversation is reported.",
        "Our infrastructure providers (Supabase for the database and storage, Vercel for hosting, Razorpay for payments) process data on our behalf.",
      ]],
      ["Your rights", [
        `You can access, correct or delete your data, and withdraw consent, at any time. Edit your profile in the app, or email ${CONTACT.support} to delete your account. Deleting your account permanently removes your profile, photos, matches and messages.`,
        `If you have a complaint, contact our Grievance Officer (below). You may also approach the Data Protection Board of India.`,
      ]],
      ["Retention and security", [
        "We keep your data while your account is active. Payment records are kept as long as tax law requires.",
        "Photos and verification files are stored privately and are only shown through short-lived links to people allowed to see them.",
      ]],
      ["Contact", [`Grievance Officer: ${CONTACT.officer}, ${CONTACT.email}`]],
    ],
  },
  terms: {
    title: "Terms of Service",
    sections: [
      ["Eligibility", ["You must be at least 18 years old and legally able to enter a contract in India. One account per person."]],
      ["Verification", ["Every member must pass a selfie and government ID check before they can be shown to others, like or chat. Submitting someone else's ID or an edited document leads to a permanent ban and may be reported to authorities."]],
      ["Your conduct", ["Follow our Community Guidelines. Do not harass, threaten, scam, solicit money, promote businesses, or share anyone's private information. We may suspend or remove accounts that break these rules, with or without notice."]],
      ["Passes and payments", [
        "Passes (Day, Week, Month) are one-time purchases. They do not renew automatically.",
        "A pass starts as soon as payment succeeds. Buying the same pass again extends it.",
        "Passes are non-refundable once active, except where the law requires a refund or if we fail to provide the service.",
        "Prices may change. Changes never affect a pass you have already bought.",
      ]],
      ["Safety disclaimer", ["Verification lowers risk but cannot guarantee anyone's intentions. Meet in public places, tell a friend where you are going, and never send money to someone you met online. Lovira is not responsible for members' offline conduct."]],
      ["Content", ["You own what you post. You give Lovira permission to display it within the service. Do not post content you don't have rights to."]],
      ["Liability", ["Lovira is provided as-is. To the extent the law allows, our total liability is limited to the amount you paid us in the last 3 months."]],
      ["Governing law", [`These terms are governed by the laws of India. Courts at [City] have jurisdiction.`]],
    ],
  },
  guidelines: {
    title: "Community Guidelines",
    sections: [
      ["Be real", ["Use your own recent photos and your real first name and age. No impersonation, no fake profiles."]],
      ["Be respectful", ["Lovira is for everyone. Harassment, hate speech, or abuse based on gender, orientation, caste, religion, ethnicity or disability gets you removed."]],
      ["Consent matters", ["No unsolicited sexual content. If someone isn't interested, move on."]],
      ["No scams", ["Never ask for money, gift cards, crypto, OTPs or bank details. Report anyone who does, and we'll act fast."]],
      ["18+ only", ["Report any profile that looks underage. We take this extremely seriously."]],
      ["Report and block", ["Every profile and chat has a Report or Block option. Reports are confidential."]],
    ],
  },
  grievance: {
    title: "Grievance Officer",
    sections: [
      ["Contact", [
        `In line with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and the DPDP Act, 2023, you can contact our Grievance Officer:`,
        `Name: ${CONTACT.officer}`,
        `Email: ${CONTACT.email}`,
        `Address: ${CONTACT.address}`,
      ]],
      ["Timelines", ["We acknowledge complaints within 24 hours and resolve them within 15 days. Requests to remove content showing nudity or impersonation are acted on within 24 hours."]],
      ["General help", [`For anything else, write to ${CONTACT.support}.`]],
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <Logo />
        <Link href="/" className="text-sm text-muted">Home</Link>
      </header>
      <h1 className="mb-1 text-3xl font-bold">{page.title}</h1>
      <p className="mb-8 text-sm text-muted">Last updated: [date]</p>
      <div className="space-y-6">
        {page.sections.map(([heading, paras]) => (
          <section key={heading}>
            <h2 className="mb-2 text-lg font-semibold">{heading}</h2>
            <div className="space-y-2 leading-relaxed text-muted">
              {paras.map((p) => <p key={p}>{p}</p>)}
            </div>
          </section>
        ))}
      </div>
      <nav className="mt-12 flex flex-wrap gap-4 border-t border-line pt-6 text-sm text-muted">
        {Object.entries(PAGES).map(([s, p]) => (
          <Link key={s} href={`/legal/${s}`} className={s === slug ? "text-brand" : ""}>{p.title}</Link>
        ))}
      </nav>
    </div>
  );
}
