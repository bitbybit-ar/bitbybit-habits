import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ApiResponse, Family, FamilyMember } from "@/lib/types";

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  const db = getDb();

  try {
    const body = await request.json();
    const { invite_code } = body as { invite_code: string };

    if (!invite_code || invite_code.trim().length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El codigo de invitacion es obligatorio" },
        { status: 400 }
      );
    }

    // Find the family by invite code
    const families = await db`
      SELECT * FROM families
      WHERE invite_code = ${invite_code.trim().toUpperCase()}
    ` as Family[];

    if (families.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Codigo de invitacion invalido" },
        { status: 404 }
      );
    }

    const family = families[0];

    // Check if already a member
    const existing = await db`
      SELECT id FROM family_members
      WHERE family_id = ${family.id}
        AND user_id = ${session.user_id}
    `;

    if (existing.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Ya sos miembro de esta familia" },
        { status: 409 }
      );
    }

    // Add user as member with their role
    const members = await db`
      INSERT INTO family_members (family_id, user_id, role)
      VALUES (${family.id}, ${session.user_id}, ${session.role})
      RETURNING *
    ` as FamilyMember[];

    return NextResponse.json<ApiResponse<{ family: Family; member: FamilyMember }>>({
      success: true,
      data: {
        family,
        member: members[0],
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error al unirse a la familia:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al unirse a la familia" },
      { status: 500 }
    );
  }
}
