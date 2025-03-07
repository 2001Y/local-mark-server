import React, { useCallback } from "react";
import Link from "next/link";
import { FileNode } from "../types/file";
import { generateUrl } from "../lib/pathUtils";
import styles from "./DirectoryList.module.scss";
import { MenuTrigger } from "./MenuTrigger";
import { useContextMenu } from "../context/ContextMenuContext";

type LayoutType =
  | "scroll"
  | "grid"
  | "default"
  | "collapse-open"
  | "collapse-close";
type FolderLayoutType = LayoutType | "false";

interface ItemContentProps {
  icon: string;
  name: string;
  date?: string;
  rightIcon?: string;
  node?: FileNode;
  layout?: LayoutType;
}

function ItemContent({
  icon,
  name,
  date,
  rightIcon,
  node,
  layout = "default",
}: ItemContentProps) {
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

  // アイコンの表示を決定
  const displayIcon = rightIcon ? (
    <span className={styles["toggle-icon-content"]}>
      {layout === "collapse-open" ? "▼" : "▶"}
    </span>
  ) : (
    <span className={styles["item-icon-content"]}>{icon}</span>
  );

  return (
    <div
      className={`${styles["item-content"]} ${styles[`layout-${layout}`]}`}
      onContextMenu={handleContextMenu}
    >
      {layout === "scroll" ? (
        // スクロールレイアウトの場合：上下に2分割
        <>
          <div className={styles["item-top"]}>
            <span className={styles["item-icon"]}>{displayIcon}</span>
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
        // それ以外（通常 or collapse or grid）
        <>
          <span className={styles["item-icon"]}>{displayIcon}</span>
          <div className={styles["item-details"]}>
            <span className={styles["item-name"]}>{name}</span>
            {date && <span className={styles["item-date"]}>{date}</span>}
          </div>
          {rightIcon ? (
            <div className={styles["toggle-icon"]}>
              {node?.path && (
                <MenuTrigger path={node.path} type={node.type} node={node} />
              )}
            </div>
          ) : node?.path ? (
            <MenuTrigger path={node.path} type={node.type} node={node} />
          ) : null}
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------
   FileList
-------------------------------------------------- */
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
      {files.map((file) => {
        // パスのログ出力
        console.log(`[DirectoryList] ファイルパス:`, {
          originalPath: file.path,
          generatedUrl: file.path ? generateUrl(file.path) : null,
        });

        return (
          <Link
            key={file.path ?? file.name}
            href={file.path ? generateUrl(file.path) : "#"}
            className="file-item"
            onClick={(e) => {
              // MenuTrigger をクリックした時はページ遷移しない
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
        );
      })}
    </div>
  );
}

/* --------------------------------------------------
   サブフォルダ用の設定
-------------------------------------------------- */
interface SubFolderConfig {
  foldersLayout: FolderLayoutType;
  filesLayout: "scroll" | "grid";
  showEmptyFolder: boolean;
}

/* --------------------------------------------------
   FolderItem
   - フォルダ1つの表示
-------------------------------------------------- */
function FolderItem({
  folder,
  foldersLayout,
  filesLayout,
  showEmptyFolder,
  subFolder,
  level = 0,
}: {
  folder: FileNode;
  foldersLayout: FolderLayoutType;
  filesLayout: "scroll" | "grid";
  showEmptyFolder?: boolean;
  subFolder?: Partial<SubFolderConfig>;
  level?: number;
}) {
  const directories = folder.children?.filter((c) => c.type === "directory");
  const files = folder.children?.filter((c) => c.type === "file");
  const hasContent = (directories?.length || 0) + (files?.length || 0) > 0;

  if (!hasContent && !showEmptyFolder) return null;
  if (foldersLayout === "false") return null;

  // サブフォルダの設定があれば優先使用
  const childFoldersLayout = subFolder?.foldersLayout ?? foldersLayout;
  const childFilesLayout = subFolder?.filesLayout ?? filesLayout;
  const childShowEmpty = subFolder?.showEmptyFolder ?? showEmptyFolder;

  // "collapse-open" / "collapse-close" → <details> で包む
  if (foldersLayout === "collapse-open" || foldersLayout === "collapse-close") {
    const isOpen = foldersLayout === "collapse-open";
    const [isDetailsOpen, setIsDetailsOpen] = React.useState(isOpen);

    return (
      <details
        open={isOpen}
        className={styles["details-summary"]}
        onToggle={(e) => {
          const details = e.currentTarget as HTMLDetailsElement;
          setIsDetailsOpen(details.open);
        }}
      >
        <summary className={styles["folder-header"]}>
          <ItemContent
            icon="📁"
            name={folder.name}
            rightIcon="▶"
            node={folder}
            layout={isDetailsOpen ? "collapse-open" : "collapse-close"}
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

  // 通常 or scroll or grid
  return (
    <div className={styles["folder-item"]}>
      {/* パスのログ出力 */}
      {(() => {
        console.log(`[DirectoryList] フォルダパス:`, {
          originalPath: folder.path,
          generatedUrl: folder.path ? generateUrl(folder.path) : null,
        });
        return null;
      })()}
      <Link
        href={folder.path ? generateUrl(folder.path) : "#"}
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

/* --------------------------------------------------
   FoldersList
   - フォルダ一覧のラッパー
-------------------------------------------------- */
function FoldersList({
  folders,
  foldersLayout,
  filesLayout,
  showEmptyFolder,
  subFolder,
  level = 0,
}: {
  folders: FileNode[];
  foldersLayout: FolderLayoutType;
  filesLayout: "scroll" | "grid";
  showEmptyFolder?: boolean;
  subFolder?: Partial<SubFolderConfig>;
  level?: number;
}) {
  if (!folders || folders.length === 0) return null;

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

  return (
    <div className={`${styles["folders-list"]} ${styles[foldersLayout]}`}>
      {folderItems}
    </div>
  );
}

/* --------------------------------------------------
   DirectoryList Props
-------------------------------------------------- */
interface DirectoryListProps {
  title: string;
  tree: {
    folders: FileNode[];
    files: FileNode[];
  };
  filesLayout?: "scroll" | "grid";
  foldersLayout?: FolderLayoutType;
  showEmptyFolder?: boolean;
  titleCollapse?: boolean;
  /**
   * セクション全体のレイアウトを「一覧風(list)」にまとめて
   * 線で囲むようなスタイルにするかどうか (初期値 false)
   */
  sectionLayout?: "list" | false;
  subFolder?: Partial<SubFolderConfig>;
}

/* --------------------------------------------------
   DirectoryList
   - ディレクトリ全体を表示
-------------------------------------------------- */
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

  // --- タイトル折りたたみ「しない」場合 ---
  if (!titleCollapse) {
    return (
      <div className={styles["directory-section"]}>
        <div className={styles["section-header"]}>
          <h2>{title}</h2>
        </div>
        <div
          // ここで必ず "section-content" を出力
          className={`${styles["section-content"]} ${
            sectionLayout === "list" ? styles["list"] : ""
          }`}
        >
          {folderContent}
        </div>
      </div>
    );
  }

  // --- タイトル折りたたみ「する」場合 ---
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
