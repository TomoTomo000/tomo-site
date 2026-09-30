import { z } from "zod";
import type {
  MicroCmsListResponse,
  MicroCmsPost,
  MicroCmsTaxonomy,
} from "../types/microcms.types";
import type {
  PaginatedPosts,
  PostDetail,
  PostSummary,
  Taxonomy,
} from "../types/post.types";
import { postSchema, taxonomySchema, type PostListInput } from "./post.schema";
import { getCloudflareEnv } from "@/lib/cloudflare/env.server";
import { throwBlogDataError } from "./blog-data.error";
import { sanitizeMicroCmsArticle } from "./microcms-content.server";
import { createPostDescription } from "./post-description";

const contentIdPattern = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

const listResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    contents: z.array(itemSchema),
    totalCount: z.number().int().nonnegative(),
    offset: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
  });

function microCmsConfig(): { apiKey: string; baseUrl: string } {
  const environment = getCloudflareEnv();
  const serviceDomain = environment.MICROCMS_SERVICE_DOMAIN?.trim().toLowerCase();
  const apiKey = environment.MICROCMS_API_KEY?.trim();
  if (!serviceDomain || !/^[a-z0-9-]{3,100}$/.test(serviceDomain) || !apiKey) {
    throwBlogDataError("CONFIGURATION", 503);
  }
  return {
    apiKey,
    baseUrl: `https://${serviceDomain}.microcms.io/api/v1`,
  };
}

async function requestMicroCms<T>(input: {
  endpoint: "blog" | "tag";
  contentId?: string;
  query?: URLSearchParams;
  schema: z.ZodType<T>;
}): Promise<T | null> {
  const { apiKey, baseUrl } = microCmsConfig();
  const path = input.contentId
    ? `${input.endpoint}/${encodeURIComponent(input.contentId)}`
    : input.endpoint;
  const url = new URL(`${baseUrl}/${path}`);
  input.query?.forEach((value, key) => url.searchParams.append(key, value));

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-MICROCMS-API-KEY": apiKey,
      },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throwBlogDataError("CONNECTION", 502);
  }

  if (response.status === 404 && input.contentId) return null;
  if (!response.ok) {
    throwBlogDataError(
      response.status === 429 ? "RATE_LIMIT" : "UPSTREAM",
      response.status === 429 ? 503 : 502,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throwBlogDataError("INVALID_RESPONSE", 502);
  }

  const parsed = input.schema.safeParse(body);
  if (!parsed.success) {
    throwBlogDataError("INVALID_RESPONSE", 502);
  }
  return parsed.data;
}

function toTaxonomy(value: MicroCmsTaxonomy): Taxonomy {
  return { id: value.id, name: value.name, slug: value.id };
}

function toCover(value: MicroCmsPost["coverImage"]): PostSummary["cover"] {
  if (!value) return null;
  try {
    const url = new URL(value.url);
    if (url.protocol !== "https:" || url.hostname !== "images.microcms-assets.io") {
      return null;
    }
  } catch {
    return null;
  }
  return {
    id: value.url,
    displayUrl: value.url,
    width: value.width ?? 1200,
    height: value.height ?? 630,
    altText: value.alt?.slice(0, 300) ?? "",
  };
}

function toSummary(value: MicroCmsPost): PostSummary {
  return {
    id: value.id,
    slug: value.id,
    title: value.title,
    tags: value.tags.map(toTaxonomy),
    cover: toCover(value.coverImage),
    publishedAt: value.publishedAt ?? null,
    updatedAt: value.revisedAt ?? value.updatedAt,
    readingMinutes: 1,
  };
}

function toDetail(value: MicroCmsPost): PostDetail {
  const article = sanitizeMicroCmsArticle(value.content);
  return {
    ...toSummary(value),
    description: createPostDescription(value.description, article.text),
    contentHtml: article.html,
    readingMinutes: Math.max(1, Math.ceil(article.text.length / 500)),
    tableOfContents: article.tableOfContents,
  };
}

function listFields(): string {
  return [
    "id",
    "createdAt",
    "updatedAt",
    "publishedAt",
    "revisedAt",
    "title",
    "coverImage",
    "tags",
  ].join(",");
}

export async function listLatestMicroCmsPosts(limit = 4): Promise<PostSummary[]> {
  const query = new URLSearchParams({
    limit: String(Math.min(Math.max(limit, 1), 50)),
    orders: "-publishedAt",
    fields: listFields(),
    depth: "1",
  });
  const response = (await requestMicroCms({
    endpoint: "blog",
    query,
    schema: listResponseSchema(postSchema),
  })) as MicroCmsListResponse<MicroCmsPost>;
  return response.contents.map(toSummary);
}

export async function listMicroCmsPosts(input: PostListInput): Promise<PaginatedPosts> {
  const pageSize = Math.min(Math.max(input.pageSize, 1), 50);
  const query = new URLSearchParams({
    limit: String(pageSize),
    offset: String((input.page - 1) * pageSize),
    orders: "-publishedAt",
    fields: listFields(),
    depth: "1",
  });
  if (input.query) query.set("q", input.query);

  const filters: string[] = [];
  if (contentIdPattern.test(input.tag)) {
    filters.push(`tags[contains]${input.tag}`);
  }
  if (filters.length) query.set("filters", filters.join("[and]"));

  const response = (await requestMicroCms({
    endpoint: "blog",
    query,
    schema: listResponseSchema(postSchema),
  })) as MicroCmsListResponse<MicroCmsPost>;
  return {
    items: response.contents.map(toSummary),
    page: input.page,
    pageSize,
    total: response.totalCount,
    pageCount: Math.max(1, Math.ceil(response.totalCount / pageSize)),
  };
}

export async function findMicroCmsPostSummaryById(contentId: string): Promise<PostSummary | null> {
  if (!contentIdPattern.test(contentId)) return null;
  const response = await requestMicroCms({
    endpoint: "blog",
    contentId,
    query: new URLSearchParams({ depth: "1", fields: listFields() }),
    schema: postSchema,
  });
  return response ? toSummary(response) : null;
}

export async function findMicroCmsPostById(input: {
  contentId: string;
  draftKey?: string;
}): Promise<PostDetail | null> {
  if (!contentIdPattern.test(input.contentId)) return null;
  const query = new URLSearchParams({ depth: "1" });
  if (input.draftKey) query.set("draftKey", input.draftKey);
  const response = await requestMicroCms({
    endpoint: "blog",
    contentId: input.contentId,
    query,
    schema: postSchema,
  });
  return response ? toDetail(response) : null;
}

export async function listMicroCmsFeedPosts(): Promise<PostDetail[]> {
  const response = await requestMicroCms({
    endpoint: "blog",
    query: new URLSearchParams({ limit: "20", orders: "-publishedAt", depth: "1" }),
    schema: listResponseSchema(postSchema),
  });
  return response?.contents.map(toDetail) ?? [];
}

async function listTaxonomyEndpoint(endpoint: "tag"): Promise<Taxonomy[]> {
  const response = (await requestMicroCms({
    endpoint,
    query: new URLSearchParams({ limit: "100", orders: "name", fields: "id,name" }),
    schema: listResponseSchema(taxonomySchema),
  })) as MicroCmsListResponse<MicroCmsTaxonomy>;
  return response.contents.map(toTaxonomy);
}

export function listMicroCmsTags(): Promise<Taxonomy[]> {
  return listTaxonomyEndpoint("tag");
}
