"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ENTITY_COOKIE, isEntityKey } from "@/lib/entities";

export async function setActiveEntity(value: string) {
  if (!isEntityKey(value)) return;
  const cookieStore = await cookies();
  cookieStore.set(ENTITY_COOKIE, value, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/");
}
