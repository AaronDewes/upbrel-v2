import { serve } from "https://deno.land/std@0.152.0/http/server.ts";
import { getAppUpgrades } from "./appcheck.ts";
import { config } from "https://deno.land/x/dotenv@v3.2.0/mod.ts";
config();

serve(async (req: Request) => new Response(
    JSON.stringify(await getAppUpgrades())
));
