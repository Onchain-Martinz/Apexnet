"use client";

const naira = (amount: number) =>
  `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface AvailableBalanceCardProps {
  availableBalance: number;
  settling: number;
  // "light" — earnings-page silver/gradient card, self-contained, no extra content.
  // "dark" — dashboard navy hero card (shimmer + glows), with a slot for the
  // caller's own CTA/footnote so it stays inside the same rounded box.
  theme?: "light" | "dark";
  children?: React.ReactNode;
}

export function AvailableBalanceCard({
  availableBalance,
  settling,
  theme = "light",
  children,
}: AvailableBalanceCardProps) {
  if (theme === "dark") {
    return (
      <>
        <style>{`
          @keyframes apx-shimmer {
            0%   { transform: translateX(-160%) skewX(-12deg); opacity: 0; }
            20%  { opacity: 1; }
            80%  { opacity: 1; }
            100% { transform: translateX(320%) skewX(-12deg); opacity: 0; }
          }
          .apx-shimmer {
            animation: apx-shimmer 4s ease-in-out 2.5s infinite;
          }
        `}</style>

        <div
          className="relative overflow-hidden rounded-[30px] pt-5 px-7 pb-5 transition-transform duration-200 active:scale-[0.99] select-none mx-[-12px]"
          style={{
            background: "#07132A",
            boxShadow: [
              "0 8px 40px rgba(7,19,42,0.16)",
              "0 2px 8px rgba(7,19,42,0.10)",
              "inset 0 1px 0 rgba(255,255,255,0.08)",
              "inset 0 -1px 0 rgba(0,0,0,0.18)",
              "inset 0 0 60px rgba(0,0,20,0.22)",
            ].join(", "),
          }}
        >
          {/* Shimmer sweep */}
          <div className="apx-shimmer pointer-events-none absolute inset-y-0 w-[45%] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* Primary radial glow — top-right */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 60%)",
              opacity: 0.38,
            }}
          />

          {/* Secondary glow — bottom-left */}
          <div
            className="pointer-events-none absolute -left-12 -bottom-12 h-48 w-48 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(90,110,220,0.35) 0%, transparent 65%)",
              opacity: 0.45,
            }}
          />

          {/* Decorative concentric rings — texture only, not illustration */}
          <div
            className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2"
            style={{ opacity: 0.04 }}
            aria-hidden
          >
            <div
              className="h-[108px] w-[108px] rounded-full"
              style={{ border: "1.5px solid white" }}
            >
              <div
                className="absolute inset-[18px] rounded-full"
                style={{ border: "1px solid white" }}
              >
                <div
                  className="absolute inset-[18px] rounded-full"
                  style={{ border: "1px solid white" }}
                />
              </div>
            </div>
          </div>

          {/* Label */}
          <p className="text-[11px] font-semibold tracking-[0.13em] uppercase text-white/45 mb-2">
            Available Balance
          </p>

          {/* Amount */}
          <p
            className="font-bold leading-none text-white"
            style={{ fontSize: "clamp(32px, 9vw, 42px)", letterSpacing: "-0.03em" }}
          >
            {naira(availableBalance)}
          </p>

          {/* Settling */}
          <p className="text-[13px] text-white/40 mt-1.5">
            {naira(settling)} settling
          </p>

          {children}
        </div>
      </>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-[28px] px-6 py-7 select-none"
      style={{
        background: "linear-gradient(160deg, #F9F9F9 0%, #F0F0F0 50%, #E7E7E7 100%)",
        boxShadow: [
          "0 8px 32px rgba(0,0,0,0.09)",
          "0 2px 8px rgba(0,0,0,0.06)",
          "inset 0 1px 0 rgba(255,255,255,0.92)",
          "inset 0 -1px 0 rgba(0,0,0,0.04)",
        ].join(", "),
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[28px]"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 100%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.98), transparent)" }}
        aria-hidden
      />
      <p className="relative text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "#909090" }}>
        Available Balance
      </p>
      <p
        className="relative mt-3 font-bold leading-none"
        style={{ fontSize: "clamp(30px, 8vw, 40px)", letterSpacing: "-0.025em", color: "#1A1A1A" }}
      >
        {naira(availableBalance)}
      </p>
      <p className="relative mt-2.5 text-[12px] leading-relaxed" style={{ color: "#999999" }}>
        {naira(settling)} settling
      </p>
      {children}
    </div>
  );
}
