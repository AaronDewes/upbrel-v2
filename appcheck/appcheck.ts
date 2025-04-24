import * as semver from "https://deno.land/x/semver@v1.4.1/mod.ts";
import { Octokit } from "https://esm.sh/octokit?dts";
import checkHomeAssistant from "./special-apps/homeAssistant.ts";
import * as YAML from "https://deno.land/std@0.152.0/encoding/yaml.ts";
import { UmbrelApp } from "./appYml.ts";

// Check if a semver is valid
function isValidSemver(version: string): boolean {
  // If the version starts with a v, remove it
  if (version.startsWith("v")) {
    version = version.substring(1);
  }
  const isValid = semver.valid(version) !== null;
  return isValid;
}

// Check if a semver is a prerelease version
function isPrerelease(version: string): boolean {
  // If the version starts with a v, remove it
  if (version.startsWith("v")) {
    version = version.substring(1);
  }
  let isPrerelease = semver.prerelease(version) !== null;
  isPrerelease = isPrerelease || version.includes("rc") ||
    version.includes("beta");
  return isPrerelease;
}

// Get the owner and repo from a given github.com/* URL or github repo in username/repo format
function getOwnerAndRepo(repository: string): {
  owner: string;
  repo: string;
} {
  // If the repository is a URL, get the owner and repo from the URL
  if (repository.startsWith("http")) {
    const url = new URL(repository);
    const owner = url.pathname.split("/")[1];
    const repo = url.pathname.split("/")[2];
    return {
      owner,
      repo,
    };
  } else {
    // If the repository is in username/repo format, get the owner and repo from the string
    const owner = repository.split("/")[0];
    const repo = repository.split("/")[1];
    return {
      owner,
      repo,
    };
  }
}

type ContentTree = {
  type: string;
  size: number;
  name: string;
  path: string;
  content?: string;
  sha: string;
  /** Format: uri */
  url: string;
  /** Format: uri */
  git_url: string | null;
  /** Format: uri */
  html_url: string | null;
  /** Format: uri */
  download_url: string | null;
  _links: {
    /** Format: uri */
    git: string | null;
    /** Format: uri */
    html: string | null;
    /** Format: uri */
    self: string;
  };
}[];

export type AvailableUpdate = {
  app: string;
  id: string;
  umbrel: string;
  current: string;
  success: true;
};

export type UpToDate = {
  app: string;
  id: string;
  umbrel: string;
  success: true;
};

export type FailedUpdate = {
  app: string;
  id: string;
  umbrel: string;
  reason: string;
  success: false;
};

// IDs of apps which don't have releases which aren't prerelease
const appsInBeta: string[] = ["lightning-terminal", "lightning"];
const overwriteRepos: Record<string, {
  owner: string;
  repo: string;
}> = {
  "lightning-shell": {
    owner: "ibz",
    repo: "lightning-shell",
  },
  "syncthing": {
    owner: "syncthing",
    repo: "syncthing",
  },
  "electrs": {
    owner: "romanz",
    repo: "electrs",
  },
  "lightning": {
    owner: "lightningnetwork",
    repo: "lnd",
  },
  "core-lightning": {
    owner: "ElementsProject",
    repo: "lightning",
  },
};
const overwriteLatestVersions: Record<string, string> = {
  "snowflake": "2.3.0"
};

async function getUpdatesForApp(
  appDirName: string,
  octokit: Octokit,
): Promise<AvailableUpdate | UpToDate | FailedUpdate> {
  const appName = appDirName;
  const response = await fetch(
    `https://raw.githubusercontent.com/getumbrel/umbrel-apps/master/${appName}/umbrel-app.yml`,
  );
  let app;
  try {
  app = YAML.parse(
    await response.text(),
  ) as UmbrelApp;
  } catch {
    return {
        id: appName,
        app: appName,
        umbrel: "Unknown",
        reason: "Invalid YAML",
        success: false,
      };
  }
  const appVersion = app.version;
  if(!appVersion) {
    return {
        id: appName,
        app: appName,
        umbrel: "Unknown",
        reason: "No version set!",
        success: false,
      };
  };
  // Don't check for updates for disabled apps
  if (app.disabled) {
    return {
        id: appName,
        app: appName,
        umbrel: appVersion,
        success: true,
      };
  }
  let repo: {
    owner: string;
    repo: string;
  };
  if (overwriteRepos[appName]) {
    repo = overwriteRepos[appName];
  } else {
    if (
      typeof app.repo !== "string" ||
      !app.repo?.startsWith("https://github.com/") &&
        !overwriteLatestVersions[appName]
    ) {
      return {
        id: app.id,
        app: app.name,
        reason: "Repo is not a GitHub repository",
        umbrel: appVersion.replace("v", ""),
        success: false,
      };
    }
    repo = getOwnerAndRepo(app.repo as string);
  }
  if (!overwriteLatestVersions[appName] && !repo.repo || !repo.owner) {
    return {
      id: app.id,
      app: app.name,
      reason: "Failed to parse repository URL",
      umbrel: appVersion.replace("v", ""),
      success: false,
    };
  }
  if (appName === "photoprism") {
    const tagList = await octokit.rest.repos.listTags({
      ...repo,
    });
    // Tags are just dates as number
    // First, sort the tags by their number
    const sortedTags = tagList.data.sort(
      (a: { name: string }, b: { name: string }) => {
        const aNum = parseInt(a.name?.split("-")[0]);
        const bNum = parseInt(b.name?.split("-")[0]);
        return aNum - bNum;
      },
    );
    // Then, check if the highest number is higher than the number of the currently used version
    const highestNum = parseInt(sortedTags[sortedTags.length - 1].name.split("-")[0]);
    let currentVersion = parseInt(appVersion.split("-")[0]);
    currentVersion = currentVersion > 20000000 ? currentVersion - 20000000 : currentVersion;
    if (highestNum > currentVersion) {
      return {
        umbrel: appVersion,
        current: sortedTags[sortedTags.length - 1].name,
        app: app.name,
        id: appName,
        success: true,
      };
    }
  } else if (appName === "home-assistant" || appName === "pi-hole" || appName === "esphome") {
    const homeAssistantVersion = await checkHomeAssistant(
      octokit,
      repo.owner,
      repo.repo,
      app.version,
      app.name,
    );
    if (homeAssistantVersion) {
      return { ...homeAssistantVersion, id: appName, success: true };
    }
  } else if (appName === "woofbot") {
    const res = await fetch(
      "https://raw.githubusercontent.com/woofbotapp/woofbotapp/master/package.json",
    );
    const packageJson = await res.json();
    const latestVersion: string = packageJson.version;
    if (
      semver.gt(
        latestVersion.replace("v", ""),
        app.version.replace("v", ""),
      )
    ) {
      return {
        umbrel: appVersion.replace("v", ""),
        current: latestVersion.replace("v", ""),
        app: app.name,
        id: appName,
        success: true,
      };
    }
  } else {
    if (!semver.valid(app.version)) {
      return {
        id: app.id,
        app: app.name,
        umbrel: appVersion.replace("v", ""),
        reason: "Invalid semver version",
        success: false,
      };
    }
    const tagList = overwriteLatestVersions[appName]
      ? { data: [] }
      : await octokit.rest.repos.listTags({
        ...repo,
      });
    // Remove all tags which aren't semver compatible or, then sort them by semver
    // Also remove all tags that contain a "-" and then letters at the end.
    const sortedTags = tagList.data
      .filter((tag: { name: string }) => {
        if (appName === "lightning") {
          return !tag.name.includes("rc");
        }
        return appsInBeta.includes(appName) || !isPrerelease(tag.name);
      })
      .filter((tag: { name: string }) => {
        return isValidSemver(tag.name);
      })
      .filter((tag: { name: string }) => {
        // Tag only used for testing
        return !(app.id === "core-lightning" && tag.name === "v0.99.1")
      })
      .sort((a: { name: string }, b: { name: string }) => {
        return semver.compare(
          a.name.replace("v", ""),
          b.name.replace("v", ""),
        );
      });
    if (!overwriteLatestVersions[appName] && sortedTags.length == 0) {
      return {
        id: app.id,
        app: app.name,
        umbrel: appVersion.replace("v", ""),
        reason: "No tags found that are valid semvers",
        success: false,
      };
    }
    // Now compare the tag with the highest semver against the currently used version
    if (
      semver.gt(
        overwriteLatestVersions[appName] ||
          sortedTags[sortedTags.length - 1].name.replace("v", ""),
        app.version.replace("v", "").split("-")[0],
      )
    ) {
      return {
        umbrel: appVersion.replace("v", ""),
        current: overwriteLatestVersions[appName] ||
          sortedTags[sortedTags.length - 1].name.replace("v", ""),
        app: app.name,
        id: appName,
        success: true,
      };
    }
  }
  return {
    id: app.id,
    app: app.name,
    success: true,
    umbrel: appVersion.replace("v", ""),
  };
}

export type updateInfo = {
  availableUpdates: AvailableUpdate[];
  upToDate: UpToDate[];
  failed: FailedUpdate[];
};

export async function getAppUpgrades(): Promise<updateInfo> {
  const octokitOptions = Deno.env.get("GITHUB_TOKEN")
    ? {
      auth: Deno.env.get("GITHUB_TOKEN"),
    }
    : {};
  const octokit = new Octokit(octokitOptions);
  const apps = (await octokit.rest.repos.getContent({
    repo: "umbrel-apps",
    owner: "getumbrel",
    path: "",
  })).data as ContentTree;
  const promises: Promise<AvailableUpdate | UpToDate | FailedUpdate>[] = [];
  for (const appDir of apps) {
    if (appDir.type !== "dir") {
      continue;
    }
    promises.push(getUpdatesForApp(appDir.name, octokit));
  }
  const data = await Promise.all(promises);
  // @ts-expect-error TypeScript doesn't understand this
  const availableUpdates: AvailableUpdate[] = data.filter((version) =>
    // @ts-expect-error TypeScript doesn't understand this
    version.success && version.current && version.current !== version.umbrel
  );
  // @ts-expect-error TypeScript doesn't understand this
  const upToDate: UpToDate[] = data.filter((version) =>
    // @ts-expect-error TypeScript doesn't understand this
    version.success && !version.current
  );
  // @ts-expect-error TypeScript doesn't understand this
  const failed: FailedUpdate[] = data.filter((version) => !version.success);
  return { availableUpdates, upToDate, failed };
}
