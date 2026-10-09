import { z } from "zod";
export const blogSearchSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).catch(1),
  query: z.string().trim().max(100).catch(""),
  tag: z.string().trim().max(80).catch(""),
});
export function parseBlogSearch(params: URLSearchParams) {
  return blogSearchSchema.parse(Object.fromEntries(params));
}
