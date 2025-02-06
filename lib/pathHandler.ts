import { promises as fs } from "fs";
import path from "path";
import { sanitize } from "sanitize-filename-ts";

export const resolveSafePath = (basePath: string, userInput: string) => {
  // Remove any leading slashes from userInput to prevent path resolution issues
  const cleanInput = userInput.replace(/^\/+/, "");
  const sanitized = sanitize(cleanInput);

  // Use path.join instead of resolve to properly handle relative paths
  const resolvedPath = path.join(basePath, sanitized);

  // Ensure the resolved path is within the base path
  if (!resolvedPath.startsWith(basePath)) {
    throw new Error("Path traversal detected");
  }

  return resolvedPath;
};

export const validateMarkdownPath = (fullPath: string) => {
  if (!fullPath.endsWith(".md")) {
    throw new Error("Invalid file extension");
  }

  // Additional security checks can be added here
  return true;
};

export const getDirectoryTree = async (dirPath: string): Promise<any> => {
  try {
    console.log("Reading directory:", dirPath);

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    console.log(
      "Found entries:",
      entries.map((e) => e.name)
    );

    const tree = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const children = await getDirectoryTree(fullPath);
          return {
            name: entry.name,
            type: "directory",
            path: fullPath,
            children,
          };
        }

        if (entry.isFile() && entry.name.endsWith(".md")) {
          return {
            name: entry.name,
            type: "file",
            path: fullPath,
          };
        }

        return null;
      })
    );

    return tree.filter(Boolean);
  } catch (error) {
    console.error("Error reading directory:", dirPath, error);
    throw error;
  }
};
