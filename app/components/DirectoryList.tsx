import React, { useCallback } from "react";
import Link from "next/link";
import { FileNode } from "../types/file";
import { generateUrl } from "../lib/pathUtils";
import styles from "./DirectoryList.module.scss";
import { MenuTrigger } from "./MenuTrigger";
import { useContextMenu } from "../context/ContextMenuContext";

function ItemContent({
  icon,
  name,
  date,
  rightIcon,
  node,
  layout = "default",
}: {
  icon: string;
  name: string;
  date?: string;
  rightIcon?: string;
  node?: FileNode;
  layout?: "default" | "grid" | "scroll" | "collapse-open" | "collapse-close";
}) {
  const { openMenu } = useContextMenu();

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!node?.path) return;
      openMenu({ x: e.clientX, y: e.clientY }, node.path, node.type, node);
    },
    [node, openMenu]
  );

  return (
    <div
      className={`${styles["item-content"]} ${styles[`layout-${layout}`]}`}
      onContextMenu={handleContextMenu}
    >
      {layout === "scroll" ? (
        <>
          <div className={styles["item-top"]}>
            <span className={styles["item-icon"]}>{icon}</span>
            {node?.path && (
              <MenuTrigger path={node.path} type={node.type} node={node} />
            )}
          </div>
          <div className={styles["item-details"]}>
            <span className={styles["item-name"]}>{name}</span>
            {date && <span className={styles["item-date"]}>{date}</span>}
          </div>
        </>
      ) : (
        <>
          {rightIcon ? (
            <>
              <span className={styles["item-icon"]}>{icon}</span>
              <div className={styles["item-details"]}>
                <span className={styles["item-name"]}>{name}</span>
                {date && <span className={styles["item-date"]}>{date}</span>}
              </div>
              <div className={styles["toggle-icon"]}>
                {node?.path && (
                  <MenuTrigger path={node.path} type={node.type} node={node} />
                )}
                <span className={styles["toggle-icon-content"]}>
                  {rightIcon === "▶" ? "▸" : "▾"}
                </span>
              </div>
            </>
          ) : (
            <>
              <span className={styles["item-icon"]}>{icon}</span>
              <div className={styles["item-details"]}>
                <span className={styles["item-name"]}>{name}</span>
                {date && <span className={styles["item-date"]}>{date}</span>}
              </div>
              {node?.path && (
                <MenuTrigger path={node.path} type={node.type} node={node} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function FileList({
  files,
  filesLayout,
  showEmptyFolder,
}: {
  files: FileNode[];
  filesLayout: "scroll" | "grid";
  showEmptyFolder?: boolean;
}) {
  if (files.length === 0 && !showEmptyFolder) return null;

  return (
    <div className={`${styles["files-list"]} ${styles[filesLayout]}`}>
      {files.map((file) => (
        <Link
          key={file.path ?? file.name}
          href={generateUrl(file.path!)}
          className="file-item"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest(".menu-trigger")) {
              e.preventDefault();
            }
          }}
        >
          <ItemContent
            icon="📄"
            name={file.name}
            date={
              file.mtime
                ? new Date(file.mtime).toLocaleDateString("ja-JP")
                : undefined
            }
            node={file}
            layout={filesLayout}
          />
        </Link>
      ))}
    </div>
  );
}

/** サブフォルダ用の設定 */
interface SubFolderConfig {
  foldersLayout:
    | "scroll"
    | "grid"
    | "collapse-open"
    | "collapse-close"
    | "false";
  filesLayout: "scroll" | "grid";
  showEmptyFolder: boolean;
}

function FolderItem({
  folder,
  foldersLayout,
  filesLayout,
  showEmptyFolder,
  subFolder,
  level = 0,
}: {
  folder: FileNode;
  foldersLayout:
    | "scroll"
    | "grid"
    | "collapse-open"
    | "collapse-close"
    | "false";
  filesLayout: "scroll" | "grid";
  showEmptyFolder?: boolean;
  subFolder?: Partial<SubFolderConfig>;
  level?: number;
}) {
  const directories = folder.children?.filter((c) => c.type === "directory");
  const files = folder.children?.filter((c) => c.type === "file");

  const hasContent = (directories?.length || 0) + (files?.length || 0) > 0;
  if (!hasContent && !showEmptyFolder) {
    return null;
  }

  const childFoldersLayout = subFolder?.foldersLayout ?? foldersLayout;
  const childFilesLayout = subFolder?.filesLayout ?? filesLayout;
  const childShowEmpty = subFolder?.showEmptyFolder ?? showEmptyFolder;

  if (foldersLayout === "false") {
    return null;
  }

  if (foldersLayout === "collapse-open" || foldersLayout === "collapse-close") {
    return (
      <details
        open={foldersLayout === "collapse-open"}
        className={styles["details-summary"]}
      >
        <summary className={styles["folder-header"]}>
          <ItemContent
            icon="📁"
            name={folder.name}
            rightIcon="▶"
            node={folder}
            layout={foldersLayout}
          />
        </summary>
        <div className={styles["folder-content"]}>
          <FoldersList
            folders={directories ?? []}
            foldersLayout={childFoldersLayout}
            filesLayout={childFilesLayout}
            showEmptyFolder={childShowEmpty}
            subFolder={subFolder}
            level={level + 1}
          />
          <FileList
            files={files ?? []}
            filesLayout={childFilesLayout}
            showEmptyFolder={childShowEmpty}
          />
        </div>
      </details>
    );
  }

  return (
    <div className={`${styles["folder-item"]}`}>
      <Link
        href={generateUrl(folder.path!)}
        className={styles["folder-link"]}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest(".menu-trigger")) {
            e.preventDefault();
          }
        }}
      >
        <ItemContent
          icon="📁"
          name={folder.name}
          node={folder}
          layout={foldersLayout === "grid" ? "grid" : "default"}
        />
      </Link>
    </div>
  );
}

function FoldersList({
  folders,
  foldersLayout,
  filesLayout,
  showEmptyFolder,
  subFolder,
  level = 0,
}: {
  folders: FileNode[];
  foldersLayout:
    | "scroll"
    | "grid"
    | "collapse-open"
    | "collapse-close"
    | "false";
  filesLayout: "scroll" | "grid";
  showEmptyFolder?: boolean;
  subFolder?: Partial<SubFolderConfig>;
  level?: number;
}) {
  if (!folders || folders.length === 0) {
    return null;
  }

  const folderItems = folders.map((folder) => (
    <FolderItem
      key={folder.path ?? folder.name}
      folder={folder}
      foldersLayout={foldersLayout}
      filesLayout={filesLayout}
      showEmptyFolder={showEmptyFolder}
      subFolder={subFolder}
      level={level}
    />
  ));

  const className = `${styles["folders-list"]} ${styles[foldersLayout]}`;

  return <div className={className}>{folderItems}</div>;
}

/** DirectoryList Props */
interface DirectoryListProps {
  title: string;
  tree: {
    folders: FileNode[];
    files: FileNode[];
  };
  filesLayout?: "scroll" | "grid";
  foldersLayout?:
    | "scroll"
    | "grid"
    | "collapse-open"
    | "collapse-close"
    | "false";
  showEmptyFolder?: boolean;
  titleCollapse?: boolean;
  sectionLayout?: "list" | false;
  subFolder?: Partial<SubFolderConfig>;
}

/** ディレクトリ全体を表示するコンポーネント */
export function DirectoryList({
  title,
  tree,
  filesLayout = "scroll",
  foldersLayout = "scroll",
  showEmptyFolder = true,
  titleCollapse = false,
  sectionLayout = false,
  subFolder = {},
}: DirectoryListProps) {
  const folderContent = (
    <>
      <FoldersList
        folders={tree.folders}
        foldersLayout={foldersLayout}
        filesLayout={filesLayout}
        showEmptyFolder={showEmptyFolder}
        subFolder={subFolder}
      />
      <FileList
        files={tree.files}
        filesLayout={filesLayout}
        showEmptyFolder={showEmptyFolder}
      />
    </>
  );

  if (!titleCollapse) {
    return (
      <div className={styles["directory-section"]}>
        <div className={styles["section-header"]}>
          <h2>{title}</h2>
        </div>
        {folderContent}
      </div>
    );
  }

  return (
    <div className={styles["directory-section"]}>
      <details open className={styles["details-summary"]}>
        <summary className={styles["section-title"]}>
          <div className={styles["title-wrapper"]}>
            <h2>{title}</h2>
            <span className={styles["toggle-icon"]}>▾</span>
          </div>
        </summary>
        <div
          className={`${styles["section-content"]} ${
            sectionLayout === "list" ? styles["list"] : ""
          }`}
        >
          {folderContent}
        </div>
      </details>
    </div>
  );
}
