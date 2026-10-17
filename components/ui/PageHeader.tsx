import Link from "next/link";
import { ChevronLeft } from "@/components/icons";

export function PageHeader({ title, backHref }: { title: string; backHref?: string }) {
  return (
    <header className="flex items-center gap-2 px-3 pt-4 pb-2">
      {backHref && (
        <Link href={backHref} aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:text-ink">
          <ChevronLeft />
        </Link>
      )}
      <h1 className={backHref ? "m-0 text-[22px] font-bold" : "m-0 px-2 text-[22px] font-bold"}>{title}</h1>
    </header>
  );
}
