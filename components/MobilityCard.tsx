"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { InfoIcon } from "@/components/icons";
import { MobilityPicker } from "@/components/MobilityPicker";
import { Button } from "@/components/ui/Button";
import { FormError, Textarea } from "@/components/ui/Field";
import { MOBILITY_LABEL } from "@/lib/activityText";
import type { Mobility } from "@/lib/db/types";

export function MobilityCard({
  circleId,
  mobility,
  notes,
  canEdit,
}: {
  circleId: string;
  mobility: Mobility;
  notes: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<Mobility>(mobility);
  const [text, setText] = useState(notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/circles/${circleId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mobility: value, mobilityNotes: text }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      return setError(data?.error?.message ?? "Please try again.");
    }
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-4">
        <span className="text-base font-bold">Getting around today</span>
        <MobilityPicker value={value} onChange={setValue} />
        <label htmlFor="mobility-notes" className="text-[15px] text-ink-2">
          Anything else that helps with planning
        </label>
        <Textarea id="mobility-notes" rows={2} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} />
        <FormError message={error} />
        <div className="flex gap-2">
          <Button onClick={save} disabled={busy} className="flex-1">
            {busy ? "Saving…" : "Save"}
          </Button>
          <Button variant="secondary" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3.5">
      <InfoIcon size={22} className="shrink-0 text-primary" />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm text-ink-3">Getting around</span>
        <span className="text-base font-bold">{MOBILITY_LABEL[mobility]}</span>
        {notes && <span className="text-sm text-ink-2">{notes}</span>}
      </div>
      {canEdit && (
        <button type="button" onClick={() => setEditing(true)} className="flex min-h-11 items-center text-[15px] font-bold text-primary">
          Update
        </button>
      )}
    </div>
  );
}
