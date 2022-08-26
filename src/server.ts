import { serve } from "https://deno.land/std@0.152.0/http/server.ts";
import { getAppUpgrades } from "./appcheck.ts";
import { config } from "https://deno.land/x/dotenv@v3.2.0/mod.ts";
import { connect } from "https://deno.land/x/redis@v0.26.0/mod.ts";

const isDenoDeploy = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;

if (!isDenoDeploy) {
  config();
}

const cache = await connect({
  name: Deno.env.get("REDIS_DATABASE"),
  port: Number(Deno.env.get("REDIS_PORT")),
  hostname: Deno.env.get("REDIS_HOST") as string,
  username: Deno.env.get("REDIS_USERNAME"),
  password: Deno.env.get("REDIS_PASSWORD"),
});

serve(async (_req: Request) => {
  try {
    const cached = await cache.get("available_updates");
    if (!cached) {
      console.debug("No cache found!");
      throw new Error("No cache");
    }

    console.debug("Cached response!");
    return new Response(
      cached,
      {
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
        },
      },
    );
  } catch {
    const result = JSON.stringify(await getAppUpgrades());
    await cache.set("available_updates", result, {
        ex: 60 * 5
    });
    return new Response(
      result,
      {
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
        },
      },
    );
  }
});
