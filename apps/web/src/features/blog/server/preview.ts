import { z } from "zod";
async function secretsEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

const schema = z.object({
  contentId: z.string().regex(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/),
  draftKey: z.string().max(200),
  secret: z.string().max(200),
});
export async function validatePreview(
  contentId: string,
  params: URLSearchParams,
  configuredSecret: string | undefined,
) {
  const configured = configuredSecret?.trim();
  const result = schema.safeParse({
    contentId,
    draftKey: params.get("draftKey") ?? "",
    secret: params.get("secret") ?? "",
  });
  if (
    !configured ||
    configured.length < 32 ||
    !result.success ||
    !(await secretsEqual(result.data.secret, configured))
  )
    return null;
  return result.data;
}
