import React from "react";
import { DirectoryList } from "./DirectoryList";
import { FileNode } from "../types/file";

interface DirectoryListDemoProps {
  currentDirContent: {
    folders: FileNode[];
    files: FileNode[];
  };
}

export function DirectoryListDemo({
  currentDirContent,
}: DirectoryListDemoProps) {
  return (
    <div className="demo-section">
      <h2>DirectoryList レイアウトパターン</h2>

      {/* 1. トップレベル: scroll */}
      <div className="layout-group">
        <h3>1. トップレベル: scroll</h3>
        <DirectoryList
          title="1.1. トップ: scroll, サブ: scroll"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="scroll"
          subFolder={{
            foldersLayout: "scroll",
            filesLayout: "scroll",
          }}
        />

        <DirectoryList
          title="1.2. トップ: scroll, サブ: grid"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="scroll"
          subFolder={{
            foldersLayout: "grid",
            filesLayout: "grid",
          }}
        />

        <DirectoryList
          title="1.3. トップ: scroll, サブ: collapse-open"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="scroll"
          subFolder={{
            foldersLayout: "collapse-open",
            filesLayout: "scroll",
          }}
        />

        <DirectoryList
          title="1.4. トップ: scroll, サブ: collapse-close"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="scroll"
          subFolder={{
            foldersLayout: "collapse-close",
            filesLayout: "scroll",
          }}
        />

        <DirectoryList
          title="1.5. トップ: scroll, サブ: false"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="scroll"
          subFolder={{
            foldersLayout: "false",
            filesLayout: "scroll",
          }}
        />
      </div>

      {/* 2. トップレベル: grid */}
      <div className="layout-group">
        <h3>2. トップレベル: grid</h3>
        <DirectoryList
          title="2.1. トップ: grid, サブ: scroll"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="grid"
          foldersLayout="grid"
          subFolder={{
            foldersLayout: "scroll",
            filesLayout: "scroll",
          }}
        />

        <DirectoryList
          title="2.2. トップ: grid, サブ: grid"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="grid"
          foldersLayout="grid"
          subFolder={{
            foldersLayout: "grid",
            filesLayout: "grid",
          }}
        />

        <DirectoryList
          title="2.3. トップ: grid, サブ: collapse-open"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="grid"
          foldersLayout="grid"
          subFolder={{
            foldersLayout: "collapse-open",
            filesLayout: "scroll",
          }}
        />

        <DirectoryList
          title="2.4. トップ: grid, サブ: collapse-close"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="grid"
          foldersLayout="grid"
          subFolder={{
            foldersLayout: "collapse-close",
            filesLayout: "scroll",
          }}
        />

        <DirectoryList
          title="2.5. トップ: grid, サブ: false"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="grid"
          foldersLayout="grid"
          subFolder={{
            foldersLayout: "false",
            filesLayout: "scroll",
          }}
        />
      </div>

      {/* 3. トップレベル: collapse-open */}
      <div className="layout-group">
        <h3>3. トップレベル: collapse-open</h3>
        <DirectoryList
          title="3.1. トップ: collapse-open, サブ: scroll"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="collapse-open"
          subFolder={{
            foldersLayout: "scroll",
            filesLayout: "scroll",
          }}
        />

        <DirectoryList
          title="3.2. トップ: collapse-open, サブ: grid"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="collapse-open"
          subFolder={{
            foldersLayout: "grid",
            filesLayout: "grid",
          }}
        />

        <DirectoryList
          title="3.3. トップ: collapse-open, サブ: collapse-open"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="collapse-open"
          subFolder={{
            foldersLayout: "collapse-open",
            filesLayout: "scroll",
          }}
        />

        <DirectoryList
          title="3.4. トップ: collapse-open, サブ: collapse-close"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="collapse-open"
          subFolder={{
            foldersLayout: "collapse-close",
            filesLayout: "scroll",
          }}
        />

        <DirectoryList
          title="3.5. トップ: collapse-open, サブ: false"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="collapse-open"
          subFolder={{
            foldersLayout: "false",
            filesLayout: "scroll",
          }}
        />
      </div>

      {/* 4. トップレベル: collapse-close */}
      <div className="layout-group">
        <h3>4. トップレベル: collapse-close</h3>
        <DirectoryList
          title="4.1. トップ: collapse-close, サブ: scroll"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="collapse-close"
          subFolder={{
            foldersLayout: "scroll",
            filesLayout: "scroll",
          }}
        />

        <DirectoryList
          title="4.2. トップ: collapse-close, サブ: grid"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="collapse-close"
          subFolder={{
            foldersLayout: "grid",
            filesLayout: "grid",
          }}
        />

        <DirectoryList
          title="4.3. トップ: collapse-close, サブ: collapse-open"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="collapse-close"
          subFolder={{
            foldersLayout: "collapse-open",
            filesLayout: "scroll",
          }}
        />

        <DirectoryList
          title="4.4. トップ: collapse-close, サブ: collapse-close"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="collapse-close"
          subFolder={{
            foldersLayout: "collapse-close",
            filesLayout: "scroll",
          }}
        />

        <DirectoryList
          title="4.5. トップ: collapse-close, サブ: false"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="collapse-close"
          subFolder={{
            foldersLayout: "false",
            filesLayout: "scroll",
          }}
        />
      </div>

      {/* 5. トップレベル: false */}
      <div className="layout-group">
        <h3>5. トップレベル: false</h3>
        <DirectoryList
          title="5.1. トップ: false, サブ: scroll"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="false"
          subFolder={{
            foldersLayout: "scroll",
            filesLayout: "scroll",
          }}
        />

        <DirectoryList
          title="5.2. トップ: false, サブ: grid"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="false"
          subFolder={{
            foldersLayout: "grid",
            filesLayout: "grid",
          }}
        />

        <DirectoryList
          title="5.3. トップ: false, サブ: collapse-open"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="false"
          subFolder={{
            foldersLayout: "collapse-open",
            filesLayout: "scroll",
          }}
        />

        <DirectoryList
          title="5.4. トップ: false, サブ: collapse-close"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="false"
          subFolder={{
            foldersLayout: "collapse-close",
            filesLayout: "scroll",
          }}
        />

        <DirectoryList
          title="5.5. トップ: false, サブ: false"
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          filesLayout="scroll"
          foldersLayout="false"
          subFolder={{
            foldersLayout: "false",
            filesLayout: "scroll",
          }}
        />
      </div>

      <style jsx>{`
        .demo-section {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .layout-group {
          padding: 1rem;
          background: white;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .layout-group h3 {
          margin: 0 0 1rem;
          font-size: 1.2rem;
          color: #555;
          border-bottom: 2px solid #eee;
          padding-bottom: 0.5rem;
        }
      `}</style>
    </div>
  );
}
