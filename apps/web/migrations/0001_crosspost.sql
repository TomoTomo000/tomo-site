-- CMSを変更してもidと投稿先の対応を引き継ぐ。
CREATE TABLE crosspost_articles (
  id TEXT PRIMARY KEY NOT NULL,
  source_provider TEXT NOT NULL,
  source_content_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (source_provider, source_content_id)
);

CREATE TABLE crosspost_publications (
  article_id TEXT NOT NULL REFERENCES crosspost_articles(id) ON DELETE RESTRICT,
  target TEXT NOT NULL CHECK (target IN ('zenn', 'qiita')),
  remote_id TEXT,
  remote_url TEXT,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN (
    'idle', 'pending', 'syncing', 'submitted', 'synced', 'simplified',
    'failed', 'blocked', 'paused', 'missing_remote'
  )),
  last_attempt_hash TEXT,
  last_synced_hash TEXT,
  last_synced_at TEXT,
  warnings_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(warnings_json) AND json_type(warnings_json) = 'array'),
  error_code TEXT,
  error_message TEXT,
  next_retry_at TEXT,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (article_id, target),
  UNIQUE (target, remote_id),
  CHECK (status NOT IN ('synced', 'simplified') OR (remote_id IS NOT NULL AND last_synced_hash IS NOT NULL AND last_synced_at IS NOT NULL))
);
