"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label } from "@/components/ui/Field";

/** Years and a few words for the headstone on the "In loving memory" home. All optional. */
export function HeadstoneForm({ circleId, name, initial }: { circleId: string; name: string; initial: { birthYear: number | null; deathYear: number | null; epitaph: string | null } }) {
  const router = useRouter();
  const [born, setBorn] = useState(initial.birthYear?.toString() ?? "");
  const [died, setDied] = useState(initial.deathYear?.toString() ?? "");
  const [words, setWords] = useState(initial.epitaph ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const year = (v: string) => (v.trim() ? Number(v) : null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/v1/circles/${circleId}/headstone`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ birthYear: year(born), deathYear: year(died), epitaph: words }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(data?.error?.message ?? "Please check the years and try again.");
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="m-0 flex flex-col gap-2.5 rounded-[14px] border border-line bg-surface p-4" data-testid="headstone-form">
      <h2 className="m-0 text-base font-bold">On {name}’s stone</h2>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="born">Born (year)</Label>
          <Input id="born" inputMode="numeric" maxLength={4} placeholder="1941" value={born} onChange={(e) => setBorn(e.target.value.replace(/\D/g, ""))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="died">Passed (year)</Label>
          <Input id="died" inputMode="numeric" maxLength={4} placeholder="2026" value={died} onChange={(e) => setDied(e.target.value.replace(/\D/g, ""))} />
        </div>
      </div>
      <Label htmlFor="words">A few words</Label>
      <Input id="words" maxLength={120} placeholder="Loved by family, always in our book" value={words} onChange={(e) => setWords(e.target.value)} />
      <FormError message={error} />
      {saved && (
        <p className="m-0 text-sm text-primary" role="status">
          Saved.
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={busy} className="w-full">
        {busy ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
