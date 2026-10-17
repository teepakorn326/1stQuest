"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BookIcon, HeartIcon, HomeIcon, PeopleIcon } from "@/components/icons";

const items = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/wishes", label: "Wishes", Icon: HeartIcon },
  { href: "/book", label: "Book", Icon: BookIcon },
  { href: "/circle", label: "Circle", Icon: PeopleIcon },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 mx-auto grid max-w-[480px] grid-cols-4 border-t border-line bg-surface pb-[max(8px,env(safe-area-inset-bottom))]"
    >
      {items.map(({ href, label, Icon }) => {
        const active = path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex h-[68px] flex-col items-center justify-center gap-1 text-[13px] no-underline",
              active ? "font-bold text-primary hover:text-primary" : "text-ink-3 hover:text-ink",
            )}
          >
            <Icon />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
