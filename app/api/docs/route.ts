import { apiHandler } from "@/lib/api";
import { readFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";

/**
 * GET /api/docs
 *
 * Serve the OpenAPI YAML spec as parsed JSON.
 */
export const GET = apiHandler(async () => {
  const file = readFileSync(
    join(process.cwd(), "docs/openapi.yaml"),
    "utf8"
  );
  return yaml.load(file);
}, { auth: false });
