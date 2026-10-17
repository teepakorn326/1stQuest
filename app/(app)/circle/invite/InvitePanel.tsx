"use client";
import { useState } from "react";
import clsx from "clsx";

type Opt = { url: string; qr: string };

export function InvitePanel({ patientName, options }: { patientName: string; options: { family: Opt; doctor: Opt } }) {
  const [role, setRole] = useState<"family" | "doctor">("family");
  const [copied, setCopied] = useState(false);
  const current = options[role];

  async function copy() {
    try {
      await navigator.clipboard.writeText(current.url);
    } catch {
      const el = document.getElementById("invite-link") as HTMLInputElement | null;
      el?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2.5 p-0 text-base font-bold">Invite as</legend>
        <div className="grid grid-cols-2 gap-2 rounded-[14px] bg-tint p-1">
          {(
            [
              ["family", "Family and friends"],
              ["doctor", "Care team doctor"],
            ] as const
          ).map(([r, label]) => (
            <button
              key={r}
              type="button"
              aria-pressed={role === r}
              onClick={() => setRole(r)}
              className={clsx(
                "h-11 rounded-[11px] text-[15px]",
                role === r ? "bg-surface font-bold text-ink shadow-[0_1px_2px_rgba(28,43,58,0.12)]" : "text-ink-2",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2.5 mb-0 text-sm text-ink-3">
          {role === "family"
            ? `They can see shared wishes, take quests and leave messages on cards. The owner posts wishes and cards.`
            : `Doctors see the wishes ${patientName} shares with the circle and can take quests, like the ones marked for the care team.`}
        </p>
      </fieldset>

      <div className="flex flex-col items-center gap-3.5 rounded-[18px] border border-line bg-surface px-5 py-6">
        <div
          role="img"
          aria-label={`QR code for the ${role === "family" ? "family" : "care team"} invite link`}
          className="h-[200px] w-[200px] [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: current.qr }}
        />
        <p className="m-0 text-center text-[15px] text-ink-2">Ask them to scan this with their phone camera</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="invite-link" className="text-base font-bold">
          Or send a link
        </label>
        <div className="flex gap-2">
          <input
            id="invite-link"
            readOnly
            value={current.url}
            onFocus={(e) => e.currentTarget.select()}
            data-testid="invite-link"
            className="h-[52px] min-w-0 flex-1 rounded-[14px] border-[1.5px] border-field bg-surface px-3.5 text-base text-ink"
          />
          <button type="button" onClick={copy} className="h-[52px] rounded-[14px] bg-cta px-[18px] text-base font-bold text-cta-ink">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </>
  );
}
