/**
 * Extract client IP from request headers.
 * Takes the leftmost (client) IP from x-forwarded-for,
 * which is set by trusted reverse proxies (Vercel, Cloudflare).
 */
export function getClientIp(request: Request): string {
  // Vercel sets x-real-ip to the actual client IP
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // x-forwarded-for: client, proxy1, proxy2 — take leftmost
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return "unknown";
}
