/**
 * POST — the server's copy of a new account for Meta (lib/meta-capi.ts), sent by the browser right after its own
 * sign_up event (components/ConversionEvents.tsx). Only for an account made within the last half hour; the event id is
 * worked out here from the account, the same one the browser used, so Meta counts the sign-up once.
 */
import { clerkClient } from "@clerk/nextjs/server";
import { requireUser } from "@/lib/api";
import { reportToMeta, signupEventId } from "@/lib/meta-capi";

export async function POST() {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    if (!user.userId.startsWith("user_")) return new Response(null, { status: 204 });
    const account = await (await clerkClient()).users.getUser(user.userId).catch(() => null);
    if (account && Date.now() - account.createdAt < 30 * 60_000) {
      await reportToMeta({ name: "CompleteRegistration", id: signupEventId(user.userId), custom: { status: true } }, user.userId);
    }
  } catch (err) {
    console.error("Sign-up not reported to Meta", err);
  }
  return new Response(null, { status: 204 });
}
