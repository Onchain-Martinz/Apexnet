// Marketing / landing layout — full-width, no constraints.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* MarketingNav goes here */}
      <main className="flex-1">{children}</main>
      {/* MarketingFooter goes here */}
    </div>
  );
}
