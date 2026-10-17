"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CategoryIcon, ChatIcon, MicIcon } from "@/components/icons";
import { useDictation } from "@/components/useDictation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FormError, Label, Textarea } from "@/components/ui/Field";
import { CATEGORY_LABEL, VISIBILITY_LABEL } from "@/lib/activityText";
import { CATEGORIES, type Category, type Visibility } from "@/lib/db/types";

type Member = { user_id: string; name: string | null; email: string };

export type WishFormValues = { text: string; category: Category | null; visibility: Visibility; viewerIds: string[] };

export function WishForm({
  circleId,
  wishId,
  members,
  initial,
}: {
  circleId: string;
  /** Present when editing. */
  wishId?: string;
  /** Other members of the circle (not the author), for "Only people I choose". */
  members: Member[];
  initial: WishFormValues;
}) {
  const router = useRouter();
  const [text, setText] = useState(initial.text);
  const [category, setCategory] = useState<Category | null>(initial.category);
  const [visibility, setVisibility] = useState<Visibility>(initial.visibility);
  const [viewerIds, setViewerIds] = useState<string[]>(initial.viewerIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dictation = useDictation(text, setText);

  function toggleViewer(id: string) {
    setViewerIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) return setError("Pick a category that fits best.");
    setBusy(true);
    setError(null);
    const res = await fetch(wishId ? `/api/v1/wishes/${wishId}` : `/api/v1/circles/${circleId}/wishes`, {
      method: wishId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, category, visibility, viewerIds: visibility === "chosen" ? viewerIds : [] }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setError(data?.error?.message ?? "We couldn’t save the wish. Please try again.");
      setBusy(false);
      return;
    }
    router.replace(`/wishes/${data.wish.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="m-0 flex flex-1 flex-col">
      <div className="flex flex-col gap-[22px] px-5 pt-2 pb-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="wish">What would you love to do?</Label>
          <div className="relative">
          <Textarea
            id="wish"
            rows={3}
            required
            maxLength={500}
            autoFocus={!initial.text}
            placeholder="e.g. Feel the sea breeze at Bondi again, with the grandkids."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={clsx("text-[17px] leading-[1.45]", dictation.supported && "pr-16")}
          />
          {dictation.supported && (
            <button
              type="button"
              onClick={dictation.toggle}
              aria-label={dictation.listening ? "Stop listening" : "Say your wish"}
              aria-pressed={dictation.listening}
              className={clsx(
                "absolute right-2.5 bottom-2.5 flex h-12 w-12 items-center justify-center rounded-full",
                dictation.listening ? "animate-pulse bg-cta text-cta-ink" : "bg-primary-soft text-primary",
              )}
              data-testid="wish-mic"
            >
              <MicIcon />
            </button>
          )}
          </div>
          {dictation.listening && <span className="text-sm text-ink-3" role="status">Listening… speak your wish, then tap the microphone again.</span>}
          {!wishId && (
            <Link href="/wishes/talk" className="flex min-h-11 items-center gap-2 text-[15px] font-bold no-underline">
              <ChatIcon size={20} /> Not sure where to start? Talk it through
            </Link>
          )}
        </div>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2.5 p-0 text-base font-bold">Category</legend>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => {
              const on = c === category;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCategory(c)}
                  className={clsx(
                    "flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-[14px] text-[15px]",
                    on ? "border-2 border-primary bg-primary-soft font-bold text-primary-hover" : "border-[1.5px] border-field bg-surface text-ink",
                  )}
                >
                  <CategoryIcon category={c} className={on ? "" : "text-primary"} />
                  {CATEGORY_LABEL[c]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2.5 p-0 text-base font-bold">Who can see this wish</legend>
          {(["circle", "chosen", "private"] as const).map((v) => (
            <label
              key={v}
              className={clsx(
                "flex min-h-12 items-center gap-3 rounded-[14px] border-[1.5px] bg-surface px-3.5 text-base",
                visibility === v ? "border-primary" : "border-field",
              )}
            >
              <input type="radio" name="visibility" checked={visibility === v} onChange={() => setVisibility(v)} className="h-5 w-5 accent-primary" />
              {VISIBILITY_LABEL[v]}
            </label>
          ))}
          {visibility === "chosen" && (
            <div className="flex flex-col rounded-[14px] border border-line bg-surface" role="group" aria-label="Choose who can see this wish">
              {members.length === 0 ? (
                <p className="m-0 px-3.5 py-3 text-[15px] text-ink-2">No one else has joined yet. Invite people from the Circle tab.</p>
              ) : (
                members.map((m, i) => (
                  <label
                    key={m.user_id}
                    className={clsx("flex min-h-12 items-center gap-3 px-3.5 py-2 text-base", i < members.length - 1 && "border-b border-[#F6EBDA]")}
                  >
                    <input
                      type="checkbox"
                      checked={viewerIds.includes(m.user_id)}
                      onChange={() => toggleViewer(m.user_id)}
                      className="h-5 w-5 accent-primary"
                    />
                    <Avatar name={m.name ?? m.email} seed={m.user_id} size={32} />
                    {m.name ?? m.email}
                  </label>
                ))
              )}
            </div>
          )}
          {visibility === "private" && (
            <p className="m-0 text-sm text-ink-3">Only you can see it. You can make a plan, and share it later so others can help.</p>
          )}
        </fieldset>
        <FormError message={error} />
      </div>
      <div className="sticky bottom-[76px] flex flex-col gap-2 border-t border-line bg-bg px-5 pt-3 pb-4">
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Saving…" : wishId ? "Save changes" : "Save wish"}
        </Button>
        <p className="m-0 text-center text-sm text-ink-3">There’s no rush. You can add or change wishes any time.</p>
      </div>
    </form>
  );
}
