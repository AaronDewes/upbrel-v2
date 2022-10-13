import satori, { init } from "https://esm.sh/satori@0.0.40/wasm.js";
import initYoga from "https://esm.sh/yoga-wasm-web@0.1.2";
import { HandlerContext } from "$fresh/server.ts";
import { getAppUpgrades } from "../../../appcheck/index.ts";

export const handler = async (
  _req: Request,
  _ctx: HandlerContext
): Promise<Response> => {
  const yoga = await initYoga(
    await fetch("https://esm.sh/yoga-wasm-web@0.1.2/dist/yoga.wasm").then(
      (res) => res.arrayBuffer()
    )
  );
  init(yoga);
  const data = await getAppUpgrades();
  const amountOfApps =
    data.availableUpdates.length + data.upToDate.length + data.failed.length;
  const percentage = Math.round(10
    (data.availableUpdates.length / amountOfApps) * 100
  );
  const roboto = Deno.readFileSync("static/Roboto-Regular.ttf").buffer;
  const robotoBold = Deno.readFileSync("static/Roboto-Bold.ttf").buffer;
  return new Response(
    await satori(
      <main   style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'url(https://unsplash.com/photos/JUFuI-kBtas/download?ixid=MnwxMjA3fDB8MXxhbGx8fHx8fHx8fHwxNjYxMDgyNDEy&force=true)',
        backgroundSize: "cover",
        fontSize: 32,
        fontWeight: 600,
        color: 'white'
      }}>
        <h1 tw="text-9xl">{percentage}%</h1>
        <p style={{
          textAlign: "center"
        }}>
          of {amountOfApps} apps on Umbrel are outdated</p><p>(
          {data.failed.length} not checked)
        </p>
      </main>,
        {
          width: 600,
          height: 400,
          fonts: [
            {
              name: 'Roboto',
              data: roboto,
              weight: 400,
              style: 'normal',
            },
            {
              name: 'Roboto Bold',
              data: robotoBold,
              weight: 700,
              style: 'bold',
            },
          ],
        },
    ), 
    {
      headers: new Headers({
        "content-type": "image/svg+xml"
      }),
    }
  );
};
