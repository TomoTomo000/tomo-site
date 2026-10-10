import { z } from "zod";

const imageSchema = z.object({
  url: z.url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  alt: z.string().max(1_000).optional(),
});

export const taxonomySchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(60),
});

export const postSchema = z.object({
  id: z.string().min(1).max(100),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  publishedAt: z.string().min(1).optional(),
  revisedAt: z.string().min(1).optional(),
  title: z.string().min(1).max(160),
  description: z.string().nullish(),
  content: z.string().default(""),
  coverImage: imageSchema.nullable().optional(),
  tags: z.array(taxonomySchema).max(5),
});

export const postListInputSchema = z.object({
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
  query: z.string().trim().max(100).default(""),
  tag: z.string().trim().max(80).default(""),
});

export type PostListInput = z.infer<typeof postListInputSchema>;
