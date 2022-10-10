import { Handlers, PageProps } from "$fresh/server.ts";
import { getAppUpgrades, updateInfo } from "../appcheck/appcheck.ts";
import Counter from "../islands/Counter.tsx";
interface MainData {
  updateInfo: updateInfo;
  amountOfApps: number;
  percentageOutdated: number;
}

export const handler: Handlers<MainData> = {
  async GET(_req, ctx) {
    const data = await getAppUpgrades();
    const amountOfApps =
      data.availableUpdates.length + data.upToDate.length + data.failed.length;
    const percentage = Math.round(
      (data.availableUpdates.length / amountOfApps) * 100
    );

    return ctx.render({
      updateInfo: data,
      amountOfApps,
      percentageOutdated: percentage,
    });
  },
};

const TITLE = "Upbrel";
const DESCRIPTION = "See how many apps on Umbrel are outdated and should be updated.";


export default function MainPage(props: PageProps<MainData>) {
  return (
    <>
       <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://upbrel-og.vercel.app/percentage.png" />
      </Head>
    <div>
      <main class="relative h-screen flex flex-col items-center justify-center">
        <h1 class="text-9xl">{props.data.percentageOutdated}%</h1>
        <p>of {props.data.amountOfApps} apps on Umbrel are outdated ({props.data.updateInfo.failed.length} not checked)</p>
        <a id="scrollTeaser" class="absolute bottom-6" href="#availableUpdates">
          <span></span>Scroll
        </a>
      </main>
    </div>
      </>
  );
}
