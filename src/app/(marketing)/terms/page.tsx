import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that govern use of Apex.",
};

const SECTIONS = [
  {
    title: "Your account",
    body: "You're responsible for the activity on your account and for keeping your login credentials secure. Student and lecturer accounts are role-specific — access is limited to what your role is intended for.",
  },
  {
    title: "Buying textbooks",
    body: "Once a purchase is completed and verified, the textbook is added to your library and you have ongoing access to it through your account.",
  },
  {
    title: "Publishing as a lecturer",
    body: "Lecturers are verified before they can publish. You retain ownership of the materials you upload, and you're responsible for the accuracy and originality of what you publish.",
  },
  {
    title: "Payouts",
    body: "Lecturer earnings from completed purchases are settled and paid out on a weekly basis, once funds have cleared.",
  },
  {
    title: "Acceptable use",
    body: "Textbook access is for your personal academic use. Redistributing, reselling, or sharing purchased materials outside your account is not permitted.",
  },
  {
    title: "Questions",
    body: "This page summarizes the current terms of use in plain language. For formal questions, contact support@apexnet.site.",
  },
];

export default function TermsOfUsePage() {
  return (
    <div className="px-5 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-[1.75rem] font-bold tracking-tight text-foreground sm:text-[2.25rem]">Terms of Use</h1>
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
