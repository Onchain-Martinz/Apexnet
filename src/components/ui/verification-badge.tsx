import { ShieldCheck } from "lucide-react";

// ── Apex Certification Seal ───────────────────────────────────────────────────
// Premium scalloped SVG seal. Rendered inline beside the lecturer name.
// Gradient IDs are fixed — only one instance per page is expected in this context.

export function ApexSeal({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="apx-seal-base" x1="25%" y1="15%" x2="75%" y2="85%">
          <stop offset="0%" stopColor="#2e2e30" />
          <stop offset="100%" stopColor="#111113" />
        </linearGradient>
        <radialGradient id="apx-seal-inner" cx="38%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#272729" />
          <stop offset="100%" stopColor="#161618" />
        </radialGradient>
        <radialGradient id="apx-seal-sheen" cx="35%" cy="25%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity="0.13" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 12-tooth scalloped outer ring */}
      <polygon
        points="10,0.5 12.019,2.468 14.75,1.773 15.515,4.485 18.227,5.25 17.532,7.981 19.5,10 17.532,12.019 18.227,14.75 15.515,15.515 14.75,18.227 12.019,17.532 10,19.5 7.981,17.532 5.25,18.227 4.485,15.515 1.773,14.75 2.468,12.019 0.5,10 2.468,7.981 1.773,5.25 4.485,4.485 5.25,1.773 7.981,2.468"
        fill="url(#apx-seal-base)"
      />
      <polygon
        points="10,0.5 12.019,2.468 14.75,1.773 15.515,4.485 18.227,5.25 17.532,7.981 19.5,10 17.532,12.019 18.227,14.75 15.515,15.515 14.75,18.227 12.019,17.532 10,19.5 7.981,17.532 5.25,18.227 4.485,15.515 1.773,14.75 2.468,12.019 0.5,10 2.468,7.981 1.773,5.25 4.485,4.485 5.25,1.773 7.981,2.468"
        fill="url(#apx-seal-sheen)"
      />
      <polygon
        points="10,0.5 12.019,2.468 14.75,1.773 15.515,4.485 18.227,5.25 17.532,7.981 19.5,10 17.532,12.019 18.227,14.75 15.515,15.515 14.75,18.227 12.019,17.532 10,19.5 7.981,17.532 5.25,18.227 4.485,15.515 1.773,14.75 2.468,12.019 0.5,10 2.468,7.981 1.773,5.25 4.485,4.485 5.25,1.773 7.981,2.468"
        fill="none"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="0.4"
      />

      {/* Inner elevated circle */}
      <circle cx="10" cy="10" r="6.5" fill="url(#apx-seal-inner)" />
      <circle cx="10" cy="10" r="6.5" fill="url(#apx-seal-sheen)" />
      <circle cx="10" cy="10" r="6.5" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />

      {/* Checkmark */}
      <path
        d="M7 10.2 L9.1 12.3 L13.2 7.8"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.92"
      />
    </svg>
  );
}

// ── Verified Lecturer Badge ───────────────────────────────────────────────────
// Compact trust indicator row: shield icon + "Verified Lecturer" text.
// Shown below the lecturer name, or in profile and textbook detail sections.

export function VerifiedLecturerBadge() {
  return (
    <div className="flex items-center gap-1">
      <ShieldCheck className="h-3.5 w-3.5 text-[#94A3B8]" aria-hidden />
      <span className="text-[11px] font-medium tracking-wide text-[#94A3B8]">
        Verified Lecturer
      </span>
    </div>
  );
}

// ── Legacy — kept for backward compatibility; prefer ApexSeal or VerifiedLecturerBadge

export function VerificationBadge({ verified }: { verified: boolean; className?: string }) {
  if (!verified) return null;
  return <ApexSeal size={18} />;
}
