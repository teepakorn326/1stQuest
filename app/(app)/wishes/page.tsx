import { PageHeader } from "@/components/ui/PageHeader";

// Phase 2 builds this screen. Listed under "Not built" in DECLARATION.md until then.
export default function WishesPage() {
  return (
    <main className="flex flex-col">
      <PageHeader title="Wishes" />
      <p className="mx-5 rounded-[14px] border border-dashed border-accent bg-surface px-4 py-4 text-[15px] text-ink-2">
        Adding wishes isn’t built yet in this version of the app. It’s the next thing being built.
      </p>
    </main>
  );
}
