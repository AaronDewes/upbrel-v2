import {
  getAppUpgrades as _checkUpdates,
  type updateInfo,
} from "./appcheck.ts";
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

export async function getAppUpgrades(cached = true): Promise<updateInfo> {
  try {
    if (!cached) {
      throw new Error("No cache");
    }
    const cachedData = await cache.get("available_updates");
    if (!cachedData) {
      throw new Error("No cache");
    }

    return JSON.parse(cachedData);
  } catch {
    const data = await _checkUpdates();
    await cache.set("available_updates", JSON.stringify(data), {
      ex: 60 * 5,
    });
    return data;
  }
}
