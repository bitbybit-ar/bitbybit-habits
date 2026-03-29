import { apiHandler, created, BadRequestError, NotFoundError, ConflictError } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { families, familyMembers } from "@/lib/db";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/families/join
 *
 * Join a family using an invite code. New members are assigned the kid role.
 */
export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { invite_code } = body as { invite_code: string };

  if (!invite_code || invite_code.trim().length === 0) {
    throw new BadRequestError("invite_code_required");
  }

  // MVP: Single-family mode — user can only belong to one family
  const existingMembership = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(eq(familyMembers.user_id, session.user_id));

  if (existingMembership.length > 0) {
    throw new ConflictError("already_has_family");
  }

  // Find the family by invite code
  const result = await db
    .select()
    .from(families)
    .where(eq(families.invite_code, invite_code.trim().toUpperCase()));

  if (result.length === 0) {
    throw new NotFoundError("invalid_invite_code");
  }

  const family = result[0];

  // Check if already a member
  const existing = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(and(eq(familyMembers.family_id, family.id), eq(familyMembers.user_id, session.user_id)));

  if (existing.length > 0) {
    throw new ConflictError("already_member");
  }

  // Users joining via invite code are always kids.
  // Only the family creator gets sponsor role (assigned at creation time).
  const members = await db
    .insert(familyMembers)
    .values({ family_id: family.id, user_id: session.user_id, role: "kid" })
    .returning();

  // Notify all sponsors in the family
  try {
    const sponsors = await db
      .select({ user_id: familyMembers.user_id })
      .from(familyMembers)
      .where(and(eq(familyMembers.family_id, family.id), eq(familyMembers.role, "sponsor")));

    const displayName = session.display_name || session.username;
    for (const sponsor of sponsors) {
      await createNotification(
        sponsor.user_id,
        "member_joined",
        "New member joined!",
        `${displayName} joined "${family.name}". You can now assign habits to them.`,
        { family_id: family.id, kid_user_id: session.user_id, kid_name: displayName }
      );
    }
  } catch (notifError) {
    console.error("Error creating join notification:", notifError);
  }

  return created({ family, member: members[0] });
});
