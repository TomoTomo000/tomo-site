import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { jobStore } from "../../src/features/crosspost/job-store";
import {
  publicationStore,
  type CrosspostDatabase,
} from "../../src/features/crosspost/publication-store";

export function crosspostTestDatabase(now?: () => Date) {
  const database = new Database(":memory:");
  database.run("PRAGMA foreign_keys = ON");
  database.run(
    readFileSync(
      new URL("../../migrations/0001_crosspost.sql", import.meta.url),
      "utf8",
    ),
  );
  const adapter: CrosspostDatabase = {
    prepare(sql) {
      let values: Array<string | number | null> = [];
      const statement = {
        bind(...parameters: Array<string | number | null>) {
          values = parameters;
          return statement;
        },
        async first<T>() {
          return database.query<T, typeof values>(sql).get(...values);
        },
        async all<T>() {
          return {
            results: database.query<T, typeof values>(sql).all(...values),
          };
        },
      };
      return statement;
    },
  };
  database.run(
    readFileSync(
      new URL("../../migrations/0002_crosspost_jobs.sql", import.meta.url),
      "utf8",
    ),
  );
  return {
    database,
    adapter,
    store: publicationStore(adapter),
    jobs: jobStore(adapter, now),
  };
}
