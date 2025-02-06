import { promises as fs } from "fs";
import path from "path";
import { sanitize } from "sanitize-filename-ts";

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
