import { jwtVerify, SignJWT } from "jose";
import { requireEnv } from "@/lib/utils/env";
import type { JWTPayload } from "jose";

const encoder = new TextEncoder();

function getSecretKey() {
  return encoder.encode(requireEnv("JWT_SECRET"));
}

export interface SessionPayload extends JWTPayload {
  sub: string;
  email: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload> {
  const result = await jwtVerify(token, getSecretKey());
  return result.payload as unknown as SessionPayload;
}
