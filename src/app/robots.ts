import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/kitchen/", "/pos/", "/dashboard/"],
    },
    sitemap: "https://himavolt.com/sitemap.xml",
  };
}
