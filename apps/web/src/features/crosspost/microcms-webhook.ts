import { z } from "zod";
import { microCmsContentId } from "./microcms-source";

const eventSchema = z.object({
  service: z.string(),
  api: z.string(),
  id: microCmsContentId.nullable(),
  type: z.enum(["new", "edit", "delete"]),
  contents: z
    .object({
      old: z.object({ id: microCmsContentId }).nullable(),
      new: z
        .object({
          id: microCmsContentId,
          status: z.array(z.enum(["PUBLISH", "DRAFT", "CLOSED"])).min(1),
        })
        .nullable(),
    })
    .nullable(),
});

const bodyLimit = 10 * 1024 * 1024;

async function readBody(request: Request): Promise<Uint8Array<ArrayBuffer>> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > bodyLimit) {
        await reader.cancel();
        throw new Error("通知が大きすぎます。");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function reply(status: number, result: string): Response {
  return Response.json(
    { result },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * acceptは記事IDを永続保存してから返すこと。
 * 本文・下書きキーは渡さず、処理時に公開APIを読み直す。
 */
export function microCmsWebhook(
  config: { service: string; secret: string },
  accept: (contentId: string) => Promise<void>,
): (request: Request) => Promise<Response> {
  z.string()
    .regex(/^[a-z0-9][a-z0-9-]*$/)
    .parse(config.service);
  z.string().trim().min(1).parse(config.secret);
  return async (request) => {
    if (request.method !== "POST")
      return new Response(null, { status: 405, headers: { Allow: "POST" } });
    const signature = request.headers.get("x-microcms-signature");
    if (!signature || !/^[a-f0-9]{64}$/i.test(signature))
      return reply(401, "unauthorized");
    let body: Uint8Array<ArrayBuffer>;
    try {
      body = await readBody(request);
    } catch {
      return reply(413, "invalid_body");
    }
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(config.secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const bytes = Uint8Array.from(signature.match(/../g)!, (hex) =>
      parseInt(hex, 16),
    );
    if (!(await crypto.subtle.verify("HMAC", key, bytes, body)))
      return reply(401, "unauthorized");

    let event: z.infer<typeof eventSchema>;
    try {
      event = eventSchema.parse(
        JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)),
      );
    } catch {
      return reply(400, "invalid_event");
    }
    if (event.service !== config.service || event.api !== "blog")
      return reply(403, "wrong_source");
    if (!event.id || event.type === "delete") return reply(200, "ignored");
    if (!event.contents?.new || event.contents.new.id !== event.id)
      return reply(400, "invalid_event");
    // ID変更を新規記事として投稿しない。既存の対応付けの移行が必要。
    if (event.contents.old && event.contents.old.id !== event.id)
      return reply(409, "source_id_changed");
    if (!event.contents.new.status.includes("PUBLISH"))
      return reply(200, "ignored");
    try {
      await accept(event.id);
      return reply(202, "accepted");
    } catch {
      return reply(503, "unavailable");
    }
  };
}
