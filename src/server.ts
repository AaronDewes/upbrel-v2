import { serve } from "https://deno.land/std@0.152.0/http/server.ts";
import { getAppUpgrades } from "./appcheck.ts";
import { config } from "https://deno.land/x/dotenv@v3.2.0/mod.ts";

const isDenoDeploy = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;

if (!isDenoDeploy)
    config();

serve(async (_req: Request) => new Response(
    JSON.stringify(await getAppUpgrades()), {
    headers: { "content-type": "application/json" },
}
));
