import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Root() {
  redirect((await getUser()) ? "/home" : "/sign-in");
}
