import type { MetadataRoute } from "next";

/** Lets members add 파트노트 to the home screen and open it full screen, like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "파트노트",
    short_name: "파트노트",
    description: "아이노스 합창단 파트 연습",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#14213d",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
