import { apiHandler } from "@/lib/api";
import { readFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";

export const GET = apiHandler(async () => {
  const file = readFileSync(
    join(process.cwd(), "docs/openapi.yaml"),
    "utf8"
  );
  return yaml.load(file);
}, { auth: false });
