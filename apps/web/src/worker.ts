import { handle } from "@astrojs/cloudflare/handler";
import { scheduledCrosspost } from "./features/crosspost/runtime.server";
import type { AppEnv } from "./lib/cloudflare/env.server";
export default {
  fetch: handle,
  async scheduled(_controller: ScheduledController, env: AppEnv) {
    await scheduledCrosspost(env, fetch);
  },
} satisfies ExportedHandler<AppEnv>;
