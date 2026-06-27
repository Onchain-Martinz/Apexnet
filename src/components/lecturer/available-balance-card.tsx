"use client";

const naira = (amount: number) =>
  `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface AvailableBalanceCardProps {
  availableBalance: number;
  settling: number;
  // "light" — earnings-page card, self-contained, no extra content.
  // "dark" — dashboard hero card (shimmer + glows), with a slot for the
  // caller's own CTA/footnote so it stays inside the same rounded box.
  // Both are dark-theme glass surfaces (Phase 2) — "dark" is the more
  // elevated/decorated of the two, matching their original relative weight.
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

        <div className="glass-surface-elevated relative overflow-hidden rounded-[30px] pt-5 px-7 pb-5 transition-transform duration-200 active:scale-[0.99] select-none mx-[-12px]">
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

          {/* Secondary glow — bottom-left, tinted with the Phase 1 accent blue */}
          <div
            className="pointer-events-none absolute -left-12 -bottom-12 h-48 w-48 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(61,64,243,0.35) 0%, transparent 65%)",
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
          <p className="text-[11px] font-semibold tracking-[0.13em] uppercase text-foreground/45 mb-2">
            Available Balance
          </p>

          {/* Amount */}
          <p
            className="font-bold leading-none text-foreground"
            style={{ fontSize: "clamp(32px, 9vw, 42px)", letterSpacing: "-0.03em" }}
          >
            {naira(availableBalance)}
          </p>

          {/* Settling */}
          <p className="text-[13px] text-foreground/40 mt-1.5">
            {naira(settling)} settling
          </p>

          {children}
        </div>
      </>
    );
  }

  return (
    <div className="glass-surface relative overflow-hidden rounded-[28px] px-6 py-7 select-none">
      <p className="relative text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Available Balance
      </p>
      <p
        className="relative mt-3 font-bold leading-none text-foreground"
        style={{ fontSize: "clamp(30px, 8vw, 40px)", letterSpacing: "-0.025em" }}
      >
        {naira(availableBalance)}
      </p>
      <p className="relative mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
        {naira(settling)} settling
      </p>
      {children}
    </div>
  );
}
