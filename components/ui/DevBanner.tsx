export function DevBanner({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="rounded-[14px] border border-gold bg-gold-soft px-4 py-3 text-[15px] text-gold-ink">
      <p className="m-0 font-bold">Dev mode</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
