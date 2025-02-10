"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { FileNode } from "../types/file";

interface ContextMenuState {
  opened: boolean;
  position: { x: number; y: number };
  path?: string;
  type?: "file" | "directory" | "background";
  node?: FileNode;
}

interface ContextMenuContextType {
  menuState: ContextMenuState;
  openMenu: (
    position: { x: number; y: number },
    path: string,
    type: "file" | "directory" | "background",
    node?: FileNode
  ) => void;
  closeMenu: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextType | undefined>(
  undefined
);

export function ContextMenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuState, setMenuState] = useState<ContextMenuState>({
    opened: false,
    position: { x: 0, y: 0 },
  });

  const openMenu = useCallback(
    (
      position: { x: number; y: number },
      path: string,
      type: "file" | "directory" | "background",
      node?: FileNode
    ) => {
      setMenuState({ opened: true, position, path, type, node });
    },
    []
  );

  const closeMenu = useCallback(() => {
    setMenuState((prev) => ({ ...prev, opened: false }));
  }, []);

  // クリックイベントでメニューを閉じる
  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".menu-trigger") &&
        !target.closest(".context-menu")
      ) {
        closeMenu();
      }
    },
    [closeMenu]
  );

  // ESCキーでメニューを閉じる
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    },
    [closeMenu]
  );

  React.useEffect(() => {
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClick, handleKeyDown]);

  return (
    <ContextMenuContext.Provider value={{ menuState, openMenu, closeMenu }}>
      {children}
    </ContextMenuContext.Provider>
  );
}

export function useContextMenu() {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error("useContextMenu must be used within a ContextMenuProvider");
  }
  return context;
}
