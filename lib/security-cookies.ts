const production = process.env.NODE_ENV === "production";

export function sessionCookieOptions(
  expiresAt: Date,
  sameSite: "lax" | "strict" = "lax",
) {
  return {
    httpOnly: true,
    maxAge: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
    sameSite,
    secure: production,
    path: "/",
    priority: "high" as const,
  };
}

export function temporarySecurityCookieOptions(maxAge: number, path: string) {
  return {
    httpOnly: true,
    maxAge,
    sameSite: "lax" as const,
    secure: production,
    path,
    priority: "high" as const,
  };
}

export function expireSecurityCookie(path = "/") {
  return {
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: production,
    path,
    priority: "high" as const,
  };
}
