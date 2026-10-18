import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { timeAgo } from "@/lib/activityText";
import { getActiveCircle, requirePageUser } from "@/lib/auth/session";
import { tributeSummary } from "@/lib/db/queries/tributes";

export const dynamic = "force-dynamic";

/** Every message left with a flower, and how many candles and flowers there are. */
export default async function MemoryPage() {
  const user = await requirePageUser("/memory");
  const circle = await getActiveCircle(user.id);
  if (!circle || circle.mode !== "memorial") redirect("/home");
  const t = await tributeSummary(circle.id, user.id, 200);
  return (
    <main className="flex flex-col">
      <PageHeader title={`For ${circle.patient_name}`} backHref="/home" />
      <div className="flex flex-col gap-3 px-5 pt-2 pb-5">
        <p className="m-0 text-[15px] font-bold text-primary-hover">
          {t.candles === 1 ? "1 candle lit" : `${t.candles} candles lit`} · {t.flowers === 1 ? "1 flower left" : `${t.flowers} flowers left`}
        </p>
        {t.messages.length === 0 && <p className="m-0 text-[15px] text-ink-2">No messages yet.</p>}
        {t.messages.map((m) => (
          <div key={m.id} className="flex gap-3 rounded-[14px] border border-line bg-surface p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
              {(m.name ?? "?").charAt(0).toUpperCase()}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px]">
                <b>{m.name ?? "Someone"}</b> <span className="text-sm text-ink-3">· {timeAgo(m.created_at)}</span>
              </span>
              <p className="m-0 text-[15px] leading-snug break-words">{m.message}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
