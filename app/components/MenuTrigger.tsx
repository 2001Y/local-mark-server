"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { useContextMenu } from "../context/ContextMenuContext";
import { FileNode } from "../types/file";

interface MenuTriggerProps {
  path: string;
  type?: "file" | "directory" | "background";
  node?: FileNode;
}

export function MenuTrigger({ path, type = "file", node }: MenuTriggerProps) {
  const { openMenu } = useContextMenu();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    openMenu({ x: rect.right, y: rect.top }, path, type, node);
  };

  return (
    <div className="menu-trigger" onClick={handleClick}>
      <Icon
        icon="ph:dots-three-vertical-bold"
        width={16}
        height={16}
        color="#cfcfcf"
      />
      <style jsx>{`
        .menu-trigger {
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s ease;
        }
      `}</style>
    </div>
  );
}
