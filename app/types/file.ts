export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  lastModified?: Date;
  mtime?: Date; // Used in FileList component
}

export interface PageInfo {
  path: string;
  title?: string;
  description?: string;
}

export interface FileNode {
  name: string;
  type: "file" | "directory";
  path?: string;
  children?: FileNode[];
}
