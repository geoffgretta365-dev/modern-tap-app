import "server-only";

// Explicit server opt-in only. Never expose this as NEXT_PUBLIC or accept it from requests.
export function plaqueEntitlementsEnabled(): boolean {
  return process.env.MODERNTAP_PLAQUE_ENTITLEMENTS_ENABLED === "true";
}
