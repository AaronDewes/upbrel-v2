import satori, { init } from "https://esm.sh/satori@0.0.40/wasm";
import initYoga from "https://esm.sh/yoga-wasm-web@0.1.2";
import { HandlerContext } from "$fresh/server.ts";
import { getAppUpgrades } from "../../../appcheck/index.ts";

export const handler = async (
  _req: Request,
  _ctx: HandlerContext
): Promise<Response> => {
  const yoga = initYoga(
    await fetch("https://esm.sh/yoga-wasm-web@0.1.2/dist/yoga.wasm").then(
      (res) => res.arrayBuffer()
    )
  );
  init(yoga);
  const data = await getAppUpgrades();
  const amountOfApps =
    data.availableUpdates.length + data.upToDate.length + data.failed.length;
  const percentage = Math.round(
    (data.availableUpdates.length / amountOfApps) * 100
  );
  return new Response(
    await satori(
      <main tw="relative h-screen flex flex-col items-center justify-center">
        <h1 tw="text-9xl">{percentage}%</h1>
        <p>
          of {amountOfApps} apps on Umbrel are outdated (
          {data.failed.length} not checked)
        </p>
      </main>
    ), 
    {
      headers: new Headers({
        "content-type": "image/svg+xml"
      }),
    }
  );
};
