import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ApiResponse, Wallet } from "@/lib/types";

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
    const wallets = await db`
      SELECT * FROM wallets
      WHERE user_id = ${session.user_id} AND active = true
      LIMIT 1
    ` as Wallet[];

    return NextResponse.json<ApiResponse<Wallet | null>>({
      success: true,
      data: wallets[0] ?? null,
    });
  } catch (error) {
    console.error("Error al obtener wallet:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al obtener la wallet" },
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
    const { nwc_url, label } = body as { nwc_url: string; label?: string };

    if (!nwc_url || !nwc_url.startsWith("nostr+walletconnect://")) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "URL de NWC inválida" },
        { status: 400 }
      );
    }

    // Upsert: if user already has a wallet, update it
    const existing = await db`
      SELECT id FROM wallets WHERE user_id = ${session.user_id}
    `;

    let wallet: Wallet[];

    if (existing.length > 0) {
      wallet = await db`
        UPDATE wallets
        SET nwc_url = ${nwc_url}, label = ${label ?? null}, active = true
        WHERE user_id = ${session.user_id}
        RETURNING *
      ` as Wallet[];
    } else {
      wallet = await db`
        INSERT INTO wallets (user_id, nwc_url, label)
        VALUES (${session.user_id}, ${nwc_url}, ${label ?? null})
        RETURNING *
      ` as Wallet[];
    }

    return NextResponse.json<ApiResponse<Wallet>>({
      success: true,
      data: wallet[0],
    }, { status: 201 });
  } catch (error) {
    console.error("Error al guardar wallet:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al guardar la wallet" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  const db = getDb();

  try {
    await db`
      UPDATE wallets SET active = false
      WHERE user_id = ${session.user_id}
    `;

    return NextResponse.json<ApiResponse>({
      success: true,
    });
  } catch (error) {
    console.error("Error al desconectar wallet:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al desconectar la wallet" },
      { status: 500 }
    );
  }
}
