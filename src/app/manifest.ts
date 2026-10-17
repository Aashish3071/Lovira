import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lovira",
    short_name: "Lovira",
    description: "Dating for everyone, with only verified profiles.",
    start_url: "/discover",
    display: "standalone",
    background_color: "#fbf7f8",
    theme_color: "#e11d48",
    icons: [{ src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
