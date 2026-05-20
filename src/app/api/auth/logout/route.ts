import { cookies } from "next/headers";

export async function POST() {
  const jar = await cookies();
  jar.delete(process.env.COOKIE_NAME ?? "voicepreserve_session");
  jar.delete("vp_csrf");
  return Response.json({ ok: true });
}
