import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ApiResponse, Family } from "@/lib/types";

interface FamilyMemberWithUser {
  id: string;
  role: string;
  joined_at: string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

interface FamilyWithMembers extends Family {
  members: FamilyMemberWithUser[];
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  const db = getDb();

  try {
    // Get families the user belongs to
    const families = await db`
      SELECT f.* FROM families f
      INNER JOIN family_members fm ON fm.family_id = f.id
      WHERE fm.user_id = ${session.user_id}
      ORDER BY f.created_at DESC
    ` as Family[];

    // Get members for each family
    const familiesWithMembers: FamilyWithMembers[] = [];

    for (const family of families) {
      const members = await db`
        SELECT fm.id, fm.role, fm.joined_at,
               u.id AS user_id, u.display_name, u.username, u.avatar_url
        FROM family_members fm
        INNER JOIN users u ON u.id = fm.user_id
        WHERE fm.family_id = ${family.id}
        ORDER BY fm.joined_at ASC
      `;

      familiesWithMembers.push({
        ...family,
        members: members as FamilyWithMembers["members"],
      });
    }

    return NextResponse.json<ApiResponse<FamilyWithMembers[]>>({
      success: true,
      data: familiesWithMembers,
    });
  } catch (error) {
    console.error("Error al obtener familias:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al obtener las familias" },
      { status: 500 }
    );
  }
}

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
    const { name } = body as { name: string };

    if (!name || name.trim().length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El nombre de la familia es obligatorio" },
        { status: 400 }
      );
    }

    const inviteCode = generateInviteCode();

    const families = await db`
      INSERT INTO families (name, invite_code, created_by)
      VALUES (${name.trim()}, ${inviteCode}, ${session.user_id})
      RETURNING *
    ` as Family[];

    const family = families[0];

    // Add the sponsor as a member
    await db`
      INSERT INTO family_members (family_id, user_id, role)
      VALUES (${family.id}, ${session.user_id}, 'sponsor')
    `;

    return NextResponse.json<ApiResponse<Family>>({
      success: true,
      data: family,
    }, { status: 201 });
  } catch (error) {
    console.error("Error al crear familia:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al crear la familia" },
      { status: 500 }
    );
  }
}
