import { execSync } from "child_process";
import { SimpleGit, simpleGit } from "simple-git";
import * as fs from "fs";
import * as path from "path";
import { targets } from "./config"; // Adjust the import path if needed

export type CombineFilesOptions = {
  repoUrl: string;
  includeFolders: string[];
  excludeFolders: string[];
  fileExtensions: string[];
};

async function combineFilesFromRepo({
  repoUrl,
  includeFolders,
  excludeFolders,
  fileExtensions,
}: CombineFilesOptions): Promise<void> {
  const git: SimpleGit = simpleGit();
  const repoName =
    repoUrl.split("com/").pop()?.replace(".git", "").replace("/", "-") ||
    "repo";
  const gitUrl = repoUrl.includes(".git") ? repoUrl : `${repoUrl}.git`;
  const tempDir = path.resolve("public", "in", `${repoName}`);
  const outDir = path.resolve("public", "out");
  const date = new Date().toISOString().split("T")[0];

  const gitEnv = process.env.GITHUB_TOKEN
    ? {
        GIT_ASKPASS: "echo",
        GIT_TERMINAL_PROMPT: "0",
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      }
    : {};

  try {
    if (fs.existsSync(tempDir)) {
      console.log(
        `Directory ${tempDir} already exists. Pulling latest changes...`
      );
      try {
        await git.cwd(path.normalize(tempDir)).pull();
      } catch (pullError) {
        console.error(
          `Failed to pull latest changes: ${(pullError as Error).message}`
        );
        return;
      }
    } else {
      console.log(`Cloning repository from ${repoUrl}...`);
      if (process.env.GITHUB_TOKEN) {
        await git
          .env(gitEnv)
          .clone(
            `https://${process.env.GITHUB_TOKEN}@${repoUrl.replace(
              "https://",
              ""
            )}`,
            tempDir
          );
      } else {
        await git.clone(repoUrl, tempDir);
      }
      console.log(`Repository cloned to ${tempDir}`);
    }
    const filesToCombine: string[] = [];

    // Recursively find matching files
    function findFiles(dir: string): void {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          findFiles(filePath);
        } else {
          const extension = path.extname(file).slice(1);
          const relativePath = path.relative(tempDir, filePath);
          const isIncluded = includeFolders.some((folder) =>
            relativePath.includes(folder)
          );
          const isExcluded =
            excludeFolders.length > 0 &&
            excludeFolders.some((folder) => relativePath.includes(folder));

          if (isIncluded && !isExcluded && fileExtensions.includes(extension)) {
            // console.log(`Found file: ${relativePath}`);
            filesToCombine.push(filePath);
          }
        }
      }
    }

    console.log(`Searching for files in ${path.normalize(tempDir)}...`);
    findFiles(path.normalize(tempDir));
    console.log(`Found ${filesToCombine.length} file(s) to combine.`);

    // Combine files into one markdown file
    let combinedContent = "";
    for (const filePath of filesToCombine) {
      const relativePath = path.relative(tempDir, filePath);
      const content = fs.readFileSync(filePath, "utf-8");
      combinedContent += `# ${relativePath}\n\n\`\`\`${path
        .extname(filePath)
        .slice(1)}\n${content}\n\`\`\`\n\n`;
    }

    if (!combinedContent) {
      console.log("No files to combine.");
      return;
    }

    // Save the combined file
    const tokenCount = combinedContent.split(/\s+/).length;
    const outputFilePath = path.join(
      outDir,
      `${repoName}-${date}-${tokenCount}.md`
    );

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(outputFilePath, combinedContent);

    console.log(`Combined file created at: ${outputFilePath}`);
  } finally {
    return;
    // Clean up the temporary directory
    let retryCount = 0;
    const maxRetries = 5;
    while (retryCount < maxRetries) {
      try {
        fs.rmdirSync(tempDir, { recursive: true });
        break;
      } catch (error) {
        if (error instanceof Error && (error as any).code === "EBUSY") {
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          throw error;
        }
      }
    }
    if (retryCount === maxRetries) {
      console.error(`Failed to remove temporary directory: ${tempDir}`);
    } else {
      console.log(`Temporary directory ${tempDir} removed.`);
    }
  }
}

// Parse command line arguments
const targetName = process.argv[2];
if (!targetName) {
  console.error("Please provide a target name.");
  process.exit(1);
}

const target = targets[targetName];
if (!target) {
  console.error(`No configuration found for target: ${targetName}`);
  process.exit(1);
}

combineFilesFromRepo(target)
  .then(() => {
    console.log("Operation completed successfully.");
  })
  .catch((err) => {
    console.error("Error:", err);
  });
