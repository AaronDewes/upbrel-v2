import { HandlerContext } from "$fresh/server.ts";
import { getAppUpgrades } from "../../../appcheck/index.ts";

export const handler = async (
  _req: Request,
  _ctx: HandlerContext
): Promise<Response> => {
  return new Response(JSON.stringify(await getAppUpgrades()), {
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    },
  });
};
