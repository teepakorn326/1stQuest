import { PageHeader } from "@/components/ui/PageHeader";

// Phase 4 builds this screen. Listed under "Not built" in DECLARATION.md until then.
export default function BookPage() {
  return (
    <main className="flex flex-col">
      <PageHeader title="Book" />
      <p className="mx-5 rounded-[14px] border border-dashed border-accent bg-surface px-4 py-4 text-[15px] text-ink-2">
        The book isn’t built yet in this version of the app.
      </p>
    </main>
  );
}
