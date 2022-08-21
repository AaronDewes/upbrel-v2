
import * as semver from "https://deno.land/x/semver@v1.4.1/mod.ts";
import { Octokit } from "https://esm.sh/@octokit/rest@19.0.4";
import checkHomeAssistant from "./special-apps/homeAssistant.ts";
import YAML from "./yaml-tools.ts";
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
  isPrerelease =
    isPrerelease || version.includes("rc") || version.includes("beta");
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

async function checkCommits(
  repository: string,
  octokit: InstanceType<typeof Octokit>
): Promise<string> {
  const { owner, repo } = getOwnerAndRepo(repository);

  // Get the repos default branch
  const repoInfo = await octokit.repos.get({
    owner,
    repo,
  });
  // Get the latest commit from the repo
  const appRepo = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: repoInfo.data.default_branch,
  });
  return appRepo.data.sha.substr(0, 7);
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

interface VersionDiff {
  app: string;
  id: string;
  citadel: string;
  current: string;
  success: true;
}

// IDs of apps which don't have releases which aren't prerelease
const appsInBeta: string[] = ["lightning-terminal"];

async function getUpdatesForApp(appDirName: string, octokit: Octokit): Promise<{
  app: string;
  id: string;
  success: boolean;
} | VersionDiff> {
  const appName = appDirName;
  const response = await fetch(`https://raw.githubusercontent.com/getumbrel/umbrel-apps/master/${appName}/umbrel-app.yml`);
  const appYmlData = YAML.parse(
    await response.text(),
  ) as YAML & { yaml: UmbrelApp };
  const app = appYmlData.yaml;
  if (typeof app.repo !== "string" || !app.repo?.startsWith("https://github.com/")) {
    return {
      id: app.id,
      app: app.name,
      success: false,
    };
  }
  const { owner, repo } = getOwnerAndRepo(app.repo as string);
  if (!repo || !owner) {
    return {
      id: app.id,
      app: app.name,
      success: false,
    };
  }
  const appVersion = app.version;
  if (appName === "lnbits") {
    const currentCommit = await checkCommits(app.repo as string, octokit);
    if (currentCommit !== app.version) {
      return {
        citadel: appVersion,
        current: currentCommit,
        app: app.name,
        id: appName,
        success: true,
      };
    }
  } else if (appName === "photoprism") {
    const tagList = await octokit.rest.repos.listTags({
      owner,
      repo,
    });
    // Tags are just dates as number
    // First, sort the tags by their number
    const sortedTags = tagList.data.sort((a: { name: string }, b: { name: string }) => {
      const aNum = parseInt(a.name);
      const bNum = parseInt(b.name);
      return aNum - bNum;
    });
    // Then, check if the highest number is higher than the number of the currently used version
    const highestNum = parseInt(sortedTags[sortedTags.length - 1].name);
    if (highestNum > parseInt(appVersion)) {
      return {
        citadel: appVersion,
        current: sortedTags[sortedTags.length - 1].name,
        app: app.name,
        id: appName,
        success: true
      };
    }
  } else if (appName === "home-assistant" || appName === "pi-hole") {
    const homeAssistantVersion = await checkHomeAssistant(
      octokit,
      owner,
      repo,
      app.version,
      app.name
    );
    if (homeAssistantVersion) {
      return { ...homeAssistantVersion, id: appName, success: true };
    }
  } else {
    if (!semver.valid(app.version)) {
      return {
        id: app.id,
        app: app.name,
        success: false,
      };
    }
    const tagList = await octokit.rest.repos.listTags({
      owner,
      repo,
    });
    // Remove all tags which aren't semver compatible or, then sort them by semver
    // Also remove all tags that contain a "-" and then letters at the end.
    const sortedTags = tagList.data
      .filter((tag: { name: string }) => {
        return appsInBeta.includes(appName) || !isPrerelease(tag.name);
      })
      .filter((tag: { name: string }) => {
        return isValidSemver(tag.name);
      })
      .sort((a: { name: string }, b: { name: string }) => {
        return semver.compare(
          a.name.replace("v", ""),
          b.name.replace("v", "")
        );
      });
    if (sortedTags.length == 0) {
      return {
        id: app.id,
        app: app.name,
        success: false,
      };
    }
    // Now compare the tag with the highest semver against the currently used version
    if (
      semver.gt(
        sortedTags[sortedTags.length - 1].name.replace("v", ""),
        app.version.replace("v", "")
      )
    ) {
      return {
        citadel: appVersion.replace("v", ""),
        current: sortedTags[sortedTags.length - 1].name.replace("v", ""),
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
  };
}

export async function getAppUpgrades(): Promise<({
  app: string;
  id: string;
  success: boolean;
} | VersionDiff)[]> {
  const octokitOptions = Deno.env.get("GITHUB_TOKEN")
    ? {
      auth: Deno.env.get("GITHUB_TOKEN"),
    }
    : {};
  const octokit = new Octokit(octokitOptions);
  const apps = (await octokit.rest.repos.getContent({
    repo: "umbrel-apps",
    owner: "getumbrel",
    path: ""
  })).data as ContentTree;
  const promises: Promise<{
    app: string;
    id: string;
    success: boolean;
  } | VersionDiff>[] = [];
  for (const appDir of apps) {
    if (appDir.type !== "dir") {
      continue;
    }
    promises.push(getUpdatesForApp(appDir.name, octokit));
  }
  return await Promise.all(promises);
}
