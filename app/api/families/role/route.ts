import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

export async function PATCH(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const db = getDb();

  try {
    const body = await request.json();
    const { family_id, user_id, new_role } = body as {
      family_id: string;
      user_id: string;
      new_role: "sponsor" | "kid";
    };

    if (!family_id || !user_id || !new_role) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "family_id, user_id, and new_role are required" },
        { status: 400 }
      );
    }

    if (new_role !== "sponsor" && new_role !== "kid") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "new_role must be 'sponsor' or 'kid'" },
        { status: 400 }
      );
    }

    // Check requester is a sponsor in this family
    const requesterMembership = await db`
      SELECT role FROM family_members
      WHERE family_id = ${family_id} AND user_id = ${session.user_id}
    `;

    if (requesterMembership.length === 0 || requesterMembership[0].role !== "sponsor") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Only sponsors can change roles" },
        { status: 403 }
      );
    }

    // Check target is a member
    const targetMembership = await db`
      SELECT role FROM family_members
      WHERE family_id = ${family_id} AND user_id = ${user_id}
    `;

    if (targetMembership.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "User is not a member of this family" },
        { status: 404 }
      );
    }

    // If demoting from sponsor, check there's at least one other sponsor
    if (targetMembership[0].role === "sponsor" && new_role === "kid") {
      const otherSponsors = await db`
        SELECT id FROM family_members
        WHERE family_id = ${family_id}
          AND user_id != ${user_id}
          AND role = 'sponsor'
      `;

      if (otherSponsors.length === 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Cannot demote the last sponsor" },
          { status: 400 }
        );
      }
    }

    await db`
      UPDATE family_members
      SET role = ${new_role}
      WHERE family_id = ${family_id} AND user_id = ${user_id}
    `;

    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error("Error changing role:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error changing member role" },
      { status: 500 }
    );
  }
}
