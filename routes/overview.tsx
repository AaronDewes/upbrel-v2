import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import {
  AvailableUpdate,
  FailedUpdate,
  getAppUpgrades,
  UpToDate,
} from "../appcheck/appcheck.ts";
interface MainData {
  updateInfo: (AvailableUpdate | UpToDate | FailedUpdate)[];
  amountOfApps: number;
}

export const handler: Handlers<MainData> = {
  async GET(_req, ctx) {
    const data = await getAppUpgrades();
    const amountOfApps = data.availableUpdates.length + data.upToDate.length +
      data.failed.length;
    const percentage = Math.round(
      (data.failed.length / amountOfApps) * 100,
    );

    return ctx.render({
      updateInfo: [...data.availableUpdates, ...data.upToDate, ...data.failed]
        .sort((a, b) => (a.id < b.id) ? -1 : 1),
      amountOfApps,
    });
  },
};

const TITLE = "Upbrel";
const DESCRIPTION =
  "See how many apps on Umbrel are outdated and should be updated.";

export default function MainPage(props: PageProps<MainData>) {
  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://upbrel-og.vercel.app/percentage.png"
        />
        <link rel="stylesheet" href="/index.css" />
      </Head>
      <div class="text-white">
        <main class="relative h-screen flex flex-col items-center justify-center">
          <h1 class="text-9xl">{props.data.amountOfApps} apps</h1>
          <p>
            are available on Umbrel.
          </p>
          <a
            id="scrollTeaser"
            class="absolute bottom-12 pt-20"
            href="#failedUpdates"
          >
            <span class="absolute top-0 left-1/2 w-6 h-6"></span>Scroll
          </a>
        </main>
        <div
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 text-center mb-8 px-4"
          id="failedUpdates"
        >
          {props.data.updateInfo.map((app) => (
            <div class="flex flex-col h-56 items-center justify-center bg-gray-400/25 py-3 transparent-card rounded">
              <img
                class="h-16 mb-4 rounded"
                src={`https://getumbrel.github.io/umbrel-apps-gallery/${app.id}/icon.svg`}
              />
              <h2 class="text-2xl font-bold mb-4">{app.app}</h2>
              {app.reason
                ? (
                  <p>
                    Check failed.
                    <h5 class="font-bold">Reason:</h5>
                    {app.reason}
                  </p>
                )
                : app.current
                ? (
                  <p>
                    Could be updated from <b>{app.umbrel}</b> to{" "}
                    <b>{app.current}</b>.
                  </p>
                )
                : (
                  <p>
                    No update available.
                  </p>
                )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}