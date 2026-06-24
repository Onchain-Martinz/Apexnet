import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Apex collects, uses, and protects your information.",
};

const SECTIONS = [
  {
    title: "What we collect",
    body: "When you create an account, we collect your name, email address, and role (student or lecturer). Students provide their university, department, and level; lecturers provide academic title and department. We do not collect more than is needed to run your account.",
  },
  {
    title: "Payments",
    body: "Payments are processed by Flutterwave. Apex does not receive or store your card or bank details — Flutterwave handles payment data directly under its own security standards.",
  },
  {
    title: "Textbook files",
    body: "Textbook files you purchase or publish are stored with a cloud storage provider and made available only to your account. Access is not shareable via public links.",
  },
  {
    title: "Email",
    body: "We send account-related email (verification codes, password resets, purchase receipts) through a transactional email provider. We do not sell your email address or send marketing email without your consent.",
  },
  {
    title: "Data retention",
    body: "We keep your account and purchase history for as long as your account is active, so your library and lecturer earnings history stay intact.",
  },
  {
    title: "Questions",
    body: "This page summarizes our current data practices in plain language. For formal privacy requests or questions, contact support@apexnet.site.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="px-5 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-[1.75rem] font-bold tracking-tight text-foreground sm:text-[2.25rem]">Privacy Policy</h1>
        <p className="mt-3 text-[13px] text-muted-foreground">Last updated: June 2026</p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-[16px] font-semibold text-foreground">{section.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
