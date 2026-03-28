import { signOut } from "next-auth/react";

export async function fetchWithAuth(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const res = await fetch(url, options);

  if (res.status === 401) {
    signOut({ callbackUrl: "/login" });
    throw new Error("Session expired. Redirecting to login...");
  }

  return res;
}
