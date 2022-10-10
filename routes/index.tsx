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

export default function MainPage(props: PageProps<MainData>) {
  return (
    <div>
      <main class="relative h-full flex">
        <h1 class="text-6xl">{props.data.percentageOutdated}%</h1>
        <p>of {props.data.amountOfApps} apps</p>
        <a id="scrollTeaser" class="" href="#availableUpdates">
          <span></span>Scroll
        </a>
      </main>
    </div>
  );
}
