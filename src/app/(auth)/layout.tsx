import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s — Apex",
    default: "Apex",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background-subtle px-5 pt-safe pb-safe">
      <div className="w-full max-w-[360px]">
        {/* Wordmark */}
        <div className="mb-10 flex justify-center">
          <div className="flex items-center gap-2">
            {/* Geometric mark */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4 text-white"
                aria-hidden
              >
                <path
                  d="M10 2L17.3 15H2.7L10 2Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Apex
            </span>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
