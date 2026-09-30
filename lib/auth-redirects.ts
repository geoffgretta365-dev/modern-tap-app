import "server-only";

// Configuration only: never derive email destinations from request headers or query strings.
export function authOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const candidate = env.VERCEL_ENV === "preview" && env.VERCEL_URL
    ? `https://${env.VERCEL_URL}`
    : env.MODERNTAP_APP_URL || (env.VERCEL_ENV === "production"
      ? "https://modern-tap-app.vercel.app" : env.NODE_ENV === "production" && env.VERCEL_URL
        ? `https://${env.VERCEL_URL}` : "http://localhost:3000");
  const url = new URL(candidate);
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    (env.VERCEL_ENV === "production" && local)) throw new Error("Invalid ModernTap app URL configuration");
  return url.origin;
}
export function authEmailRedirect(purpose: "signup" | "recovery") {
  return `${authOrigin()}/auth/confirm?next=${purpose === "recovery" ? "/auth/update-password" : "/onboarding"}`;
}
export function authDestination(value: string | null) {
  return value === "/auth/update-password" ? value : "/onboarding";
}
