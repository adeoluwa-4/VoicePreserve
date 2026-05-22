import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { createSessionToken } from "@/lib/auth/jwt";
import { hashPassword } from "@/lib/auth/password";

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  email_verified?: boolean;
}

const STATE_COOKIE = "vp_google_oauth_state";

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing ${key}`);
  }
  return value;
}

function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export function googleRedirectUri(): string {
  return `${appUrl()}/api/auth/google/callback`;
}

export async function createGoogleState(): Promise<string> {
  const state = crypto.randomBytes(24).toString("hex");
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10
  });
  return state;
}

export async function validateGoogleState(state: string): Promise<boolean> {
  const jar = await cookies();
  const saved = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  return Boolean(saved && state && saved === state);
}

export function buildGoogleAuthUrl(state: string): string {
  const clientId = requiredEnv("GOOGLE_CLIENT_ID");
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: requiredEnv("GOOGLE_CLIENT_ID"),
    client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
    redirect_uri: googleRedirectUri(),
    grant_type: "authorization_code"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error("Google token exchange failed");
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error("Google userinfo request failed");
  }

  return (await response.json()) as GoogleProfile;
}

export async function signInWithGoogleProfile(profile: GoogleProfile, token: GoogleTokenResponse) {
  const existingAccount = await prisma.oauthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId: profile.sub
      }
    },
    include: { user: true }
  });

  let userId: string;

  if (existingAccount) {
    userId = existingAccount.userId;
    await prisma.oauthAccount.update({
      where: { id: existingAccount.id },
      data: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: new Date(Date.now() + token.expires_in * 1000)
      }
    });
  } else {
    const existingUser = await prisma.user.findUnique({ where: { email: profile.email } });
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const randomPassword = crypto.randomBytes(24).toString("hex");
      const passwordHash = await hashPassword(randomPassword);
      const created = await prisma.user.create({
        data: {
          email: profile.email,
          passwordHash,
          displayName: profile.name ?? profile.email.split("@")[0]
        }
      });
      userId = created.id;
    }

    await prisma.oauthAccount.create({
      data: {
        userId,
        provider: "google",
        providerAccountId: profile.sub,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: new Date(Date.now() + token.expires_in * 1000)
      }
    });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const sessionToken = await createSessionToken({ sub: user.id, email: user.email });
  const jar = await cookies();
  jar.set(process.env.COOKIE_NAME ?? "voicepreserve_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return user;
}

export async function signInWithGoogleProfileWithoutDatabase(profile: GoogleProfile) {
  const fallbackSub = `google:${profile.sub}`;
  const sessionToken = await createSessionToken({ sub: fallbackSub, email: profile.email });
  const jar = await cookies();
  jar.set(process.env.COOKIE_NAME ?? "voicepreserve_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return {
    id: fallbackSub,
    email: profile.email,
    displayName: profile.name ?? profile.email.split("@")[0]
  };
}
