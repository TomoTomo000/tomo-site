import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  createSeoHead,
  serializeJsonLd,
  SITE_DESCRIPTION,
} from "../src/lib/seo";

const base = {
  siteUrl: "https://example.com",
  path: "/",
  title: "TOMO",
  description: "紹介",
};
const content = (head: ReturnType<typeof createSeoHead>, key: string) =>
  head.meta.find(
    (meta) =>
      ("name" in meta && meta.name === key) ||
      ("property" in meta && meta.property === key),
  )?.content;

describe("SEO metadata", () => {
  test("domain changes update canonical and both social image URLs", () => {
    const head = createSeoHead({
      ...base,
      siteUrl: "https://new.example.com/",
      path: "/blog?page=2",
    });
    expect(head.links).toEqual([
      { rel: "canonical", href: "https://new.example.com/blog?page=2" },
    ]);
    expect(content(head, "og:url")).toBe(head.links[0].href);
    expect(content(head, "og:image")).toBe(
      "https://new.example.com/img/ogp-image.png",
    );
    expect(content(head, "twitter:image")).toBe(content(head, "og:image"));
    expect(content(head, "robots")).not.toContain("noindex");
  });

  test("article covers replace default dimensions and alt text", () => {
    const head = createSeoHead({
      ...base,
      type: "article",
      image: {
        url: "https://images.microcms-assets.io/assets/cover.png",
        alt: "記事の画像",
        width: 800,
        height: 600,
      },
    });
    expect(content(head, "og:type")).toBe("article");
    expect(content(head, "og:image:width")).toBe("800");
    expect(content(head, "og:image:height")).toBe("600");
    expect(content(head, "twitter:image:alt")).toBe("記事の画像");
  });

  test("filtered pages opt out of indexing and empty descriptions have a fallback", () => {
    const head = createSeoHead({ ...base, noindex: true, description: "  " });
    expect(content(head, "robots")).toBe("noindex,follow");
    expect(content(head, "description")).toBe(SITE_DESCRIPTION);
  });

  test("JSON-LD cannot close its script element through CMS text", () => {
    const value = { headline: '</script><script>alert("x")</script>' };
    const json = serializeJsonLd(value);
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual(value);
  });

  test("the default social asset is a PNG with the advertised dimensions", () => {
    const png = readFileSync(
      new URL("../public/img/ogp-image.png", import.meta.url),
    );
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});
