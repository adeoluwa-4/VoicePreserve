import { getSessionUser } from "@/lib/auth/session";
import { issueCsrfToken } from "@/lib/auth/csrf";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ user: null }, { status: 401 });
  }

  const csrfToken = await issueCsrfToken();
  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName
    },
    csrfToken
  });
}
