import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { redirect } from "next/navigation";
import { LANDING_DESKTOP } from "@/components/landing/desktop";
import { LANDING_MOBILE } from "@/components/landing/mobile";
import { getUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const archivo = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: "1stQuest · Wishes we’ll share, together",
  description:
    "A shared place for one person’s wishes, and the people who help make them happen. Family, friends and the care team turn each wish into small quests, then into memories the whole family keeps.",
};

/**
 * Landing page (from the team's desktop and mobile designs). Signed-in people go straight to Home.
 * The markup is our own static design, so rendering it as HTML is safe; the mobile version shows
 * below 768px and the desktop version above.
 */
export default async function Landing() {
  if (await getUser()) redirect("/home");
  return (
    <div className={`${archivo.variable} bg-[#FFFDF8]`} data-testid="landing">
      <div className="hidden md:block" dangerouslySetInnerHTML={{ __html: LANDING_DESKTOP }} />
      <div className="md:hidden" dangerouslySetInnerHTML={{ __html: LANDING_MOBILE }} />
    </div>
  );
}
