import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const { id: familyId } = await params;
  const db = getDb();

  try {
    // Check the user is the creator
    const families = await db`
      SELECT * FROM families WHERE id = ${familyId}
    `;

    if (families.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Family not found" },
        { status: 404 }
      );
    }

    if (families[0].created_by !== session.user_id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Only the creator can delete this family" },
        { status: 403 }
      );
    }

    // Deactivate related habits
    await db`UPDATE habits SET active = false WHERE family_id = ${familyId}`;

    // Remove all members
    await db`DELETE FROM family_members WHERE family_id = ${familyId}`;

    // Delete family
    await db`DELETE FROM families WHERE id = ${familyId}`;

    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error("Error deleting family:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error deleting family" },
      { status: 500 }
    );
  }
}
