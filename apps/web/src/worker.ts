import { handle } from "@astrojs/cloudflare/handler";
import {
  queuedCrosspost,
  scheduledCrosspost,
} from "./features/crosspost/runtime.server";
import type { AppEnv } from "./lib/cloudflare/env.server";
export default {
  fetch: handle,
  async queue(batch: MessageBatch<unknown>, env: AppEnv) {
    await queuedCrosspost(batch, env, fetch);
  },
  async scheduled(_controller: ScheduledController, env: AppEnv) {
    await scheduledCrosspost(env, fetch);
  },
} satisfies ExportedHandler<AppEnv>;
