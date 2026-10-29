import "server-only";
import { headers } from "next/headers";

/** The address the hosting platform vouches for (x-real-ip on Vercel), not one the client can append. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
}
