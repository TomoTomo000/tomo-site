export type BlogDataErrorCode =
  | "CONFIGURATION"
  | "CONNECTION"
  | "RATE_LIMIT"
  | "UPSTREAM"
  | "INVALID_RESPONSE";

const publicMessage =
  "記事データを取得できませんでした。時間をおいて、もう一度お試しください。";

const errorCodes: ReadonlySet<BlogDataErrorCode> = new Set([
  "CONFIGURATION",
  "CONNECTION",
  "RATE_LIMIT",
  "UPSTREAM",
  "INVALID_RESPONSE",
]);

export class BlogDataError extends Error {
  readonly code: BlogDataErrorCode;
  readonly status: 502 | 503;

  constructor(code: BlogDataErrorCode, status: 502 | 503) {
    super(publicMessage);
    this.name = "BlogDataError";
    this.code = code;
    this.status = status;
    delete this.stack;
  }
}

export function isBlogDataError(error: unknown): error is BlogDataError {
  if (!(error instanceof Error) || error.name !== "BlogDataError") return false;
  const candidate = error as Partial<BlogDataError>;
  return (
    typeof candidate.code === "string" &&
    errorCodes.has(candidate.code as BlogDataErrorCode) &&
    (candidate.status === 502 || candidate.status === 503)
  );
}

export function throwBlogDataError(
  code: BlogDataErrorCode,
  status: 502 | 503,
): never {
  // プレビューURLには秘密情報が含まれるため、リクエストURLや捕捉したエラーはログに出さない。
  console.error(`[blog:data] ${code}`);
  throw new BlogDataError(code, status);
}
