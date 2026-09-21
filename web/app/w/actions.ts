"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/db";
import * as W from "@/lib/workspaces";

async function user(): Promise<string> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return userId;
}

export async function createWorkspaceAction(form: FormData) {
  const ws = await W.createWorkspace(await user(), { name: form.get("name"), industry: form.get("industry") });
  redirect(`/w/${ws.id}`);
}

export async function createGroupAction(form: FormData) {
  const wsId = String(form.get("ws"));
  const group = await W.createGroup(await user(), wsId, form.get("name"));
  redirect(`/w/${wsId}/g/${group.id}`);
}

export async function inviteAction(form: FormData) {
  const [wsId, groupId] = [String(form.get("ws")), String(form.get("group"))];
  await W.invite(await user(), groupId, { name: form.get("name"), email: form.get("email") });
  revalidatePath(`/w/${wsId}/g/${groupId}`);
}

export async function updateWorkspaceAction(form: FormData) {
  const wsId = String(form.get("ws"));
  await W.updateWorkspace(await user(), wsId, { name: form.get("name") ?? undefined, industry: form.get("industry"), hideEmotions: form.get("hideEmotions") === "on" });
  revalidatePath(`/w/${wsId}`);
}

export async function rotateJoinCodeAction(form: FormData) {
  const wsId = String(form.get("ws"));
  await W.updateWorkspace(await user(), wsId, { rotateJoinCode: true });
  revalidatePath(`/w/${wsId}`);
}

export async function setRoleAction(form: FormData) {
  const wsId = String(form.get("ws"));
  await W.setMemberRole(await user(), wsId, String(form.get("member")), String(form.get("role")) as Role | "remove");
  revalidatePath(`/w/${wsId}`);
}

/** Returns the new key so the page can show it once. */
export async function rotateApiKeyAction(wsId: string): Promise<string> {
  const key = await W.rotateApiKey(await user(), wsId);
  revalidatePath(`/w/${wsId}`);
  return key;
}

export async function erasePersonAction(form: FormData) {
  const [wsId, groupId, personId] = [String(form.get("ws")), String(form.get("group")), String(form.get("person"))];
  await W.requireParticipant(await user(), personId, "manager");
  await W.eraseParticipant(personId);
  redirect(`/w/${wsId}/g/${groupId}`);
}

export async function deleteGroupAction(form: FormData) {
  const wsId = String(form.get("ws"));
  await W.deleteGroup(await user(), String(form.get("group")));
  redirect(`/w/${wsId}`);
}

export async function joinAction(form: FormData) {
  const ws = await W.joinWorkspace(await user(), String(form.get("code")));
  redirect(`/w/${ws.id}`);
}

/** Public: someone on a group's open link or at a station typed their name. */
export async function enterOpenLinkAction(form: FormData) {
  const open = String(form.get("open"));
  const station = form.get("station") === "1";
  const person = await W.joinThroughOpenLink(open, form.get("name"), station);
  redirect(`/r/${person.token}${station ? `?station=${encodeURIComponent(open)}` : ""}`);
}
