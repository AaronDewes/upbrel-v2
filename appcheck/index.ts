import {
  getAppUpgrades as _checkUpdates,
  type updateInfo,
} from "./appcheck.ts";

const cache = await Deno.openKv();

export async function getAppUpgrades(cached = true): Promise<updateInfo> {
  try {
    if (!cached) {
      throw new Error("No cache");
    }
    const cachedData = await cache.get(["available_updates"]);
    if (!cachedData?.value) {
      throw new Error("No cache");
    }

    return cachedData.value;
  } catch {
    const data = await _checkUpdates();
    await cache.set(["available_updates"], data, {
      expireIn: 60 * 5,
    });
    return data;
  }
}
