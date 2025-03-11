import React from "react";
import { Icon } from "@iconify/react";
import path from "path";
import { isDefaultPath } from "../lib/pathUtils";

interface SearchTriggerProps {
  folderPath: string;
  className?: string;
}

export const SearchTrigger = React.memo(
  ({ folderPath, className = "" }: SearchTriggerProps) => {
    const isRoot = isDefaultPath(folderPath);
    const placeholder = isRoot
      ? "ファイルを検索..."
      : `${path.basename(folderPath)} 内を検索...`;

    return (
      <div
        className={`search-trigger ${className}`}
        onClick={() => console.log("Open search modal")}
      >
        <Icon icon="ph:magnifying-glass" className="search-icon" />
        <span className="search-placeholder">{placeholder}</span>
        <style jsx>{`
          .search-trigger {
            padding: 0.5rem 1rem;
            border: solid 1px var(--bn-colors-hovered-background);
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          :global(.search-icon) {
            width: 1.2em;
            height: 1.2em;
          }
          .search-placeholder {
            font-size: 0.95rem;
          }
        `}</style>
      </div>
    );
  }
);

SearchTrigger.displayName = "SearchTrigger";
