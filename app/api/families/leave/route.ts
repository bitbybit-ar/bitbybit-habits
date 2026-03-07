import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
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
    const { family_id } = body as { family_id: string };

    if (!family_id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "family_id is required" },
        { status: 400 }
      );
    }

    // Check if user is a member
    const membership = await db`
      SELECT fm.id, fm.role FROM family_members fm
      WHERE fm.family_id = ${family_id} AND fm.user_id = ${session.user_id}
    `;

    if (membership.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "You are not a member of this family" },
        { status: 404 }
      );
    }

    const userRole = membership[0].role;

    // If sponsor, check that there's at least one other sponsor
    if (userRole === "sponsor") {
      const otherSponsors = await db`
        SELECT id FROM family_members
        WHERE family_id = ${family_id}
          AND user_id != ${session.user_id}
          AND role = 'sponsor'
      `;

      if (otherSponsors.length === 0) {
        // Check if there are other members at all
        const otherMembers = await db`
          SELECT id FROM family_members
          WHERE family_id = ${family_id}
            AND user_id != ${session.user_id}
        `;

        if (otherMembers.length > 0) {
          return NextResponse.json<ApiResponse>(
            { success: false, error: "Cannot leave: you are the last sponsor. Promote another member first or delete the family." },
            { status: 400 }
          );
        }
      }
    }

    // Remove the member
    await db`
      DELETE FROM family_members
      WHERE family_id = ${family_id} AND user_id = ${session.user_id}
    `;

    // Check if family is now empty — if so, delete it
    const remaining = await db`
      SELECT id FROM family_members WHERE family_id = ${family_id}
    `;

    if (remaining.length === 0) {
      // Deactivate habits
      await db`
        UPDATE habits SET active = false WHERE family_id = ${family_id}
      `;
      // Delete the family
      await db`DELETE FROM families WHERE id = ${family_id}`;
    }

    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error("Error leaving family:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error leaving family" },
      { status: 500 }
    );
  }
}
