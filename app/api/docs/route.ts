import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";

export async function GET() {
  try {
    const file = readFileSync(
      join(process.cwd(), "docs/openapi.yaml"),
      "utf8"
    );
    const spec = yaml.load(file);
    return NextResponse.json(spec);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al cargar la especificacion";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
