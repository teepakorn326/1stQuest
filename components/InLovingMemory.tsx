import Link from "next/link";
import clsx from "clsx";
import { HeartIcon } from "@/components/icons";
import type { TributeSummary } from "@/lib/db/queries/tributes";
import { TributeActions } from "@/components/TributeActions";
import { MemoryMusic } from "@/components/MemoryMusic";
import { PortraitButton } from "@/components/PortraitButton";

/** A little pixel flower, as in the design. */
function Flower({ color, className }: { color: string; className?: string }) {
  const petal = "absolute h-2.5 w-2.5 border-[0.5px] border-[#E3D6C1]";
  return (
    <span aria-hidden className={clsx("absolute bottom-[26px] block h-[42px] w-5", className)}>
      <span className="absolute bottom-0 left-[9px] h-[26px] w-0.5 bg-[#7FA05A]" />
      <span className={petal} style={{ background: color, top: 0, left: 5 }} />
      <span className={petal} style={{ background: color, top: 5, left: 10 }} />
      <span className={petal} style={{ background: color, top: 10, left: 5 }} />
      <span className={petal} style={{ background: color, top: 5, left: 0 }} />
      <span className="absolute top-[7px] left-[7px] h-1.5 w-1.5 bg-[#FFE07A]" />
    </span>
  );
}

function Candle({ className }: { className?: string }) {
  return (
    <span aria-hidden className={clsx("absolute bottom-[22px] block h-[42px] w-[18px]", className)}>
      <span className="memory-flame absolute top-0 left-[6px] h-[13px] w-1.5 rounded-full bg-cta">
        <span className="absolute top-[5px] left-[2px] h-1.5 w-0.5 rounded-full bg-[#FFE07A]" />
      </span>
      <span className="absolute bottom-0 left-0 h-[26px] w-[18px] rounded-[3px] border border-[#E3D6C1] bg-[#FFF7EA]" />
    </span>
  );
}

/**
 * Home for a circle whose owner has passed away (memorial mode), from the "In loving memory" design:
 * a headstone with their name, years and a few words; candles and flowers the family leaves; their
 * messages; and the way into the book.
 */
export function InLovingMemory({
  circleId,
  name,
  photoSrc,
  birthYear,
  deathYear,
  epitaph,
  tributes,
  canEdit,
}: {
  circleId: string;
  name: string;
  photoSrc: string | null;
  birthYear: number | null;
  deathYear: number | null;
  epitaph: string | null;
  tributes: TributeSummary;
  canEdit: boolean;
}) {
  const years = birthYear || deathYear ? `${birthYear ?? ""} – ${deathYear ?? ""}`.trim() : null;
  const candles = Math.min(3, Math.max(1, tributes.candles));
  return (
    <main className="flex flex-col pb-5" data-testid="in-loving-memory">
      <section className="relative h-[490px] overflow-hidden bg-[#FFF4E2]" aria-label={`In loving memory of ${name}`}>
        <p className="absolute inset-x-0 top-9 m-0 text-center text-[15px] font-bold text-primary">In loving memory</p>
        <div className="absolute top-4 left-4 z-10">
          <MemoryMusic />
        </div>
        <span aria-hidden className="absolute top-[56px] left-[calc(50%+76px)] h-[68px] w-[68px] rounded-full bg-[#FFE0AE]">
          <span className="absolute inset-3 rounded-full bg-accent" />
        </span>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[54px] bg-[#E9F0DC]" />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-7 bg-[#D6E4C2]" />

        <div className="absolute bottom-[30px] left-1/2 flex h-[362px] w-[190px] -translate-x-1/2 flex-col items-center rounded-t-[28px] border-2 border-[#D9CBB4] bg-[#EFE6D8] px-3 pt-3">
          <div className="flex h-full w-full flex-col items-center rounded-t-[20px] border-[1.5px] border-b-0 border-[#E3D6C1] px-2 pt-4 text-center">
            {photoSrc ? (
              <span className="rounded-[50%] border-[3px] border-[#D9CBB4] bg-[#F7F0E4] p-[3px] shadow-[inset_0_0_0_1px_#E3D6C1]" data-testid="stone-portrait">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoSrc} alt={`${name}`} className="block h-[92px] w-[74px] rounded-[50%] object-cover sepia-[25%]" />
              </span>
            ) : (
              <HeartIcon size={16} className="mt-6 text-[#B8A58C]" />
            )}
            <h1 className={clsx("m-0 text-[26px] leading-tight font-bold text-[#4A3926]", photoSrc ? "mt-2.5" : "mt-4")}>{name}</h1>
            {years && <p className="m-0 mt-1.5 text-base text-ink-3">{years}</p>}
            <span aria-hidden className="mt-4 h-px w-[70px] bg-[#D9CBB4]" />
            <p className="m-0 mt-3 text-sm leading-snug text-ink-2">{epitaph ?? "Loved by family, always in our book"}</p>
          </div>
        </div>

        <Flower color="#F4A6B0" className="left-[calc(50%-113px)]" />
        <Flower color="#FFB547" className="left-[calc(50%-95px)]" />
        <Flower color="#FFFFFF" className="left-[calc(50%+77px)]" />
        <Flower color="#F4A6B0" className="left-[calc(50%+95px)]" />
        {Array.from({ length: candles }).map((_, i) => (
          <Candle key={i} className={["left-[calc(50%-9px)]", "left-[calc(50%-33px)]", "left-[calc(50%+15px)]"][i]} />
        ))}
      </section>

      <div className="flex flex-col gap-3 px-5 pt-5">
        {canEdit && <PortraitButton circleId={circleId} name={name} hasPhoto={Boolean(photoSrc)} />}
        {canEdit && !years && !epitaph && (
          <Link href="/circle/memorial" className="text-[15px] font-bold no-underline" data-testid="headstone-link">
            Add {name}’s years and a few words to the stone
          </Link>
        )}
        <h2 className="m-0 text-[17px] font-bold">From the family</h2>
        {tributes.messages.length === 0 ? (
          <p className="m-0 rounded-[14px] border border-dashed border-accent bg-surface px-4 py-3.5 text-[15px] text-ink-2">
            Leave a flower with a few words for {name}. Everyone in the circle will see it here.
          </p>
        ) : (
          tributes.messages.map((m) => (
            <div key={m.id} className="flex gap-3 rounded-[14px] border border-line bg-surface p-3.5" data-testid="tribute">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                {(m.name ?? "?").charAt(0).toUpperCase()}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <b className="text-[15px]">{m.name ?? "Someone"}</b>
                <p className="m-0 text-[15px] leading-snug break-words">{m.message}</p>
              </div>
            </div>
          ))
        )}
        <div className="flex h-[46px] items-center justify-between rounded-[14px] bg-[#FFF4E2] px-4 text-sm font-bold text-primary-hover" data-testid="tribute-counts">
          <span>
            {tributes.candles === 1 ? "1 candle lit" : `${tributes.candles} candles lit`} · {tributes.flowers === 1 ? "1 flower left" : `${tributes.flowers} flowers left`}
          </span>
          <Link href="/memory" className="no-underline">
            See all
          </Link>
        </div>
        <TributeActions circleId={circleId} name={name} litToday={tributes.litToday} flowerToday={tributes.flowerToday} />
      </div>
    </main>
  );
}
