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

const cache = await Deno.openKv();

export async function getAppUpgrades(cached = true): Promise<updateInfo> {
  try {
    if (!cached) {
      throw new Error("No cache");
    }
    const cachedData = await cache.get(["available_updates"]);
    if (!cachedData) {
      throw new Error("No cache");
    }

    return cachedData;
  } catch {
    const data = await _checkUpdates();
    await cache.set(["available_updates"], data, {
      expireIn: 60 * 5,
    });
    return data;
  }
}
