/** 生のレスポンス・認証情報を保存せず、運用に必要な分類だけを残す。 */
export class SyncError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryable = true,
  ) {
    super(code);
    this.name = "SyncError";
  }
}
