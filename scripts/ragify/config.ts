import { CombineFilesOptions } from "./ragify";

export const targets: Record<string, CombineFilesOptions> = {
    discord: {
      repoUrl: "https://github.com/discordjs/discord.js",
      fileExtensions: ["md"],
      includeFolders: ["packages/builders/src/*"],
      excludeFolders: [""],
    },
    elysia: {
      repoUrl: "https://github.com/elysiajs/documentation",
      includeFolders: ["docs"],
      excludeFolders: ["public", ".vitepress", "blog"],
      fileExtensions: ["md"],
    },
    // Add more targets as needed
  };

  // const repoName =
  //   repoUrl.split("com/").pop()?.replace(".git", "").replace("/", "-") ||
  //   "repo";

//     if (error instanceof Error && (error as any).code === "EBUSY") {
