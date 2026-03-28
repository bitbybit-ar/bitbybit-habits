import { apiHandler, BadRequestError, RateLimitError } from "@/lib/api";
import { users } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

// Rate limiter: 3 attempts per 15 minutes per IP
const registerRateLimiter = createRateLimiter(3, 15 * 60 * 1000);

/**
 * POST /api/auth/register
 *
 * Register a new user account. Rate limited (3/15min).
 */
export const POST = apiHandler(async (request, { db }) => {
  const clientIp = getClientIp(request);
  const rateLimitResult = registerRateLimiter.check(clientIp);

  if (!rateLimitResult.success) {
    throw new RateLimitError(rateLimitResult.retryAfterMs ?? 0);
  }

  const { email, username, password, display_name, locale } = await request.json();

  if (!email || !username || !password || !display_name) {
    throw new BadRequestError("missing_fields");
  }

  const password_hash = await hashPassword(password);

  const result = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password_hash,
      display_name,
      locale: locale ?? "es",
    })
    .returning({
      id: users.id,
      email: users.email,
      username: users.username,
      display_name: users.display_name,
      locale: users.locale,
      created_at: users.created_at,
    });

  return result[0];
}, { auth: false });
