-- 本文や下書きキーは保存せず、処理時に公開記事を取得する。
CREATE TABLE crosspost_jobs (
  provider TEXT NOT NULL,
  content_id TEXT NOT NULL,
  generation INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'done', 'review')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL,
  token TEXT,
  error_code TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (provider, content_id)
);
CREATE INDEX crosspost_jobs_pending ON crosspost_jobs(provider, status, available_at);
