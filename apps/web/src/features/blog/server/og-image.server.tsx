import { Buffer } from "node:buffer";
import { ImageResponse } from "workers-og";
import { getCloudflareEnv } from "@/lib/cloudflare/env.server";
import { BLOG_OG_HEIGHT, BLOG_OG_WIDTH, layoutOgTitle } from "../og-image";

async function fetchFont(family: string, text: string): Promise<ArrayBuffer> {
  const url = new URL("https://fonts.googleapis.com/css2");
  url.search = new URLSearchParams({
    family: `${family}:wght@700`,
    text,
  }).toString();
  const key = new Request(url);
  const cache = await caches.open("blog-og-fonts-v1");
  const cached = await cache.match(key);
  if (cached) return cached.arrayBuffer();

  const css = await fetch(url, {
    // SatoriはWOFF2に対応していないため、TTFを取得する。
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!css.ok) throw new Error("OG font stylesheet unavailable");
  const fontUrl = (await css.text()).match(
    /src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/,
  )?.[1];
  if (!fontUrl) throw new Error("OG font URL unavailable");
  const response = await fetch(fontUrl, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error("OG font unavailable");
  const data = await response.arrayBuffer();
  await cache.put(
    key,
    new Response(data, {
      headers: { "Cache-Control": "public, max-age=604800" },
    }),
  );
  return data;
}

export async function renderBlogOgImage(
  title: string,
  request: Request,
): Promise<ArrayBuffer> {
  const { fontSize, lines } = layoutOgTitle(title);
  const text = [...new Set(lines.join(""))].join("");
  const latinText = text.replace(/[^\x20-\x7e]/g, "") || "TOMO";
  const [japanese, latin, background] = await Promise.all([
    fetchFont("Noto Sans JP", text),
    fetchFont("Figtree", latinText),
    getCloudflareEnv().ASSETS.fetch(
      new URL("/img/ogp-image-bg.png", request.url),
    ),
  ]);
  if (!background.ok) throw new Error("OG background unavailable");
  const backgroundUrl = `data:image/png;base64,${Buffer.from(await background.arrayBuffer()).toString("base64")}`;
  const response = new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        color: "#2A1915",
        fontFamily: "Figtree, Noto Sans JP",
        fontWeight: 700,
      }}
    >
      <img
        src={backgroundUrl}
        width={BLOG_OG_WIDTH}
        height={BLOG_OG_HEIGHT}
        style={{ position: "absolute", top: 0, left: 0 }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: 1020,
          fontSize,
          lineHeight: 1.45,
        }}
      >
        {lines.map((line, index) => (
          <div
            key={index}
            style={{ display: "flex", justifyContent: "center" }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>,
    {
      width: BLOG_OG_WIDTH,
      height: BLOG_OG_HEIGHT,
      emoji: "twemoji",
      fonts: [
        { name: "Figtree", data: latin, weight: 700, style: "normal" },
        { name: "Noto Sans JP", data: japanese, weight: 700, style: "normal" },
      ],
    },
  );
  // ここで描画ストリームを読み切り、失敗時は壊れたPNGをキャッシュせずエラーを返す。
  return response.arrayBuffer();
}
