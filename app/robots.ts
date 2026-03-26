export const dynamic = "force-static";

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/api-docs"],
    },
    sitemap: "https://bitbybit.com.ar/sitemap.xml",
  };
}
