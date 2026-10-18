import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, route, conflict, forbidden, notFound } from "@/lib/http";
import { requireApiUser } from "@/lib/auth/session";
import { findCircleForMember } from "@/lib/db/queries/circles";
import { askMemorial, cancelMemorial, confirmMemorial, findOpenRequest, trustedSwitch } from "@/lib/db/queries/memorial";
import { canAsk, canCancel, canConfirm, canTrustedSwitch } from "@/lib/memorial";
import { queueTexts } from "@/lib/notify";
import { appUrl } from "@/lib/env";

const Body = z.object({ action: z.enum(["switch", "ask", "confirm", "cancel"]) });

/**
 * When no caretaker can turn the book into a memorial album:
 * - "switch": the trusted viewer does it now and becomes a caretaker;
 * - "ask" / "confirm": two viewers agree, and it happens 7 days later;
 * - "cancel": the owner or a caretaker ("I'm still here"), or either viewer, stops it.
 */
export const POST = route<{ id: string }>(async (req, { params, log }) => {
  const user = await requireApiUser();
  const circle = await findCircleForMember(z.uuid().parse(params.id), user.id);
  if (!circle) throw notFound();
  const { action } = await readBody(req, Body);
  const viewer = { userId: user.id, role: circle.role };
  const open = await findOpenRequest(circle.id);
  const ctx = { circleId: circle.id, patientName: circle.patient_name };
  const name = user.name ?? "Someone";
  const link = `${appUrl()}/circle`;

  switch (action) {
    case "switch": {
      if (!canTrustedSwitch(viewer, circle)) throw forbidden("Only the trusted person the caretakers chose can do this.");
      const sms = await trustedSwitch(ctx, user.id);
      if (!sms) throw conflict("This has already changed. Refresh to see the latest.");
      queueTexts(sms, `1stQuest: ${name} turned ${circle.patient_name}’s book into a memorial album. ${appUrl()}/home`);
      log.info("memorial switch by trusted person", { circleId: circle.id });
      return NextResponse.json({ mode: "memorial", caretaker: user.id });
    }
    case "ask": {
      if (!canAsk(viewer, circle, open)) throw forbidden(open ? "Someone has already asked." : "Only viewers ask for this; caretakers can turn the book into a memorial album themselves.");
      const sms = await askMemorial(ctx, user.id);
      if (!sms) throw conflict("Someone has already asked.");
      queueTexts(sms, `1stQuest: ${name} asked to turn ${circle.patient_name}’s book into a memorial album. Someone else in the circle needs to confirm. ${link}`);
      return NextResponse.json({ status: "asked" }, { status: 201 });
    }
    case "confirm": {
      if (!canConfirm(viewer, circle, open)) throw forbidden("Someone other than the person who asked needs to confirm.");
      const done = await confirmMemorial(ctx, user.id);
      if (!done) throw conflict("This has already changed. Refresh to see the latest.");
      const when = done.takesEffectAt.toLocaleDateString("en-AU", { day: "numeric", month: "long", timeZone: "UTC" });
      queueTexts(done.sms, `1stQuest: ${circle.patient_name}’s book will become a memorial album on ${when}. If this is a mistake, a caretaker can cancel: ${link}`);
      return NextResponse.json({ status: "confirmed", takesEffectAt: done.takesEffectAt });
    }
    case "cancel": {
      if (!canCancel(viewer, open)) throw forbidden("Only the caretakers or the people who asked can cancel this.");
      const sms = await cancelMemorial(ctx, user.id);
      if (!sms) throw conflict("This has already changed. Refresh to see the latest.");
      queueTexts(sms, `1stQuest: ${name} cancelled the memorial album for ${circle.patient_name}’s book. ${link}`);
      return NextResponse.json({ status: "cancelled" });
    }
  }
});
