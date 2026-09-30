export const BOT_USER_AGENT_MARKERS = [
  "facebookexternalhit", "facebot", "twitterbot", "slackbot", "linkedinbot",
  "whatsapp", "telegrambot", "discordbot", "googlebot", "bingbot",
  "crawler", "spider", "bot/",
] as const;

export function isBotTap(userAgent: string | null, method = "GET"): boolean {
  if (method.toUpperCase() === "HEAD") return true;
  const agent = (userAgent ?? "").toLowerCase();
  return BOT_USER_AGENT_MARKERS.some(marker => agent.includes(marker));
}
