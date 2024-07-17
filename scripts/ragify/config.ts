import { CombineFilesOptions } from "./ragify";

export const targets: Record<string, CombineFilesOptions> = {
    discord: {
      repoUrl: "https://github.com/discordjs/discord.js",
      fileExtensions: ["ts"],
      includeFolders: ["builders"],
      excludeFolders: [],
    },
    discordGuide: {
      repoUrl: "https://github.com/discordjs/guide",
      fileExtensions: ["md"],
      includeFolders: ["guide"],
      excludeFolders: ["branding", "vuepress", "additional-info", "sequelize"],
    },
    elysia: {
      repoUrl: "https://github.com/elysiajs/documentation",
      includeFolders: ["docs"],
      excludeFolders: ["public", ".vitepress", "blog"],
      fileExtensions: ["md"],
    },
    // Add more targets as needed
  };