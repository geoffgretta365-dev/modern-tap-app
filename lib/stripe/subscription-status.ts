export function isTerminalSubscriptionStatus(status: string | null | undefined) {
  return status === "canceled" || status === "incomplete_expired";
}
