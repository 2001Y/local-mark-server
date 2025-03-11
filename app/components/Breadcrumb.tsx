"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import path from "path";
import { cleanPathForComparison } from "../lib/pathUtils";

export interface PathSegment {
  name: string;
  path: string;
}

export interface BreadcrumbProps {
  currentPath: string;
  defaultPath?: string;
  segments?: PathSegment[];
  fullPath?: string;
  specialPaths?: Record<string, string>;
  showOnHover?: boolean;
}

export function Breadcrumb({
  currentPath,
  defaultPath = process.env.NEXT_PUBLIC_DEFAULT_MD_PATH || "/content",
  segments: customSegments,
  fullPath: customFullPath,
  specialPaths = { "/quickmemo": "Quick Memo" },
  showOnHover = false,
}: BreadcrumbProps) {
  const [isCompact, setIsCompact] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [segmentsWidth, setSegmentsWidth] = useState(0);
  const parentSegmentsRef = useRef<HTMLDivElement>(null);

  const segments =
    customSegments ??
    (() => {
      const cleanDefaultPath = cleanPathForComparison(defaultPath);
      const cleanCurrentPath = cleanPathForComparison(
        decodeURIComponent(currentPath)
      );

      // 特別なパスの処理
      const specialPathEntry = Object.entries(specialPaths).find(
        ([path]) => currentPath === path
      );
      if (specialPathEntry) {
        return [{ name: specialPathEntry[1], path: specialPathEntry[0] }];
      }

      // 通常のパスの処理
      return cleanCurrentPath
        .replace(cleanDefaultPath, "")
        .split("/")
        .filter(Boolean)
        .map((segment, index, array) => ({
          name: segment,
          path:
            "/" + [cleanDefaultPath, ...array.slice(0, index + 1)].join("/"),
        }));
    })();

  const fullPath = customFullPath ?? decodeURIComponent(currentPath);

  useEffect(() => {
    const checkWidth = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const parentWidth = container.parentElement?.offsetWidth || 0;
      setIsCompact(container.scrollWidth > parentWidth);
    };

    const updateSegmentsWidth = () => {
      if (!parentSegmentsRef.current) return;
      const width = parentSegmentsRef.current.scrollWidth;
      setSegmentsWidth(width);
    };

    checkWidth();
    updateSegmentsWidth();
    window.addEventListener("resize", checkWidth);
    window.addEventListener("resize", updateSegmentsWidth);
    return () => {
      window.removeEventListener("resize", checkWidth);
      window.removeEventListener("resize", updateSegmentsWidth);
    };
  }, [segments]);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  const shouldShow = !showOnHover || isHovered;

  return (
    <div
      className="breadcrumb-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={fullPath}
      ref={containerRef}
    >
      <div className="breadcrumb">
        <div className={`parent-segments-wrapper ${shouldShow ? "show" : ""}`}>
          <div className="parent-segments">
            <span className="breadcrumb-item">
              <Link href="/" className="home-link">
                🏠
              </Link>
            </span>
            {segments.slice(0, -1).map((segment, index) => (
              <span key={segment.path} className="breadcrumb-item">
                <span className="separator">/</span>
                <Link href={segment.path} className="segment-link">
                  {isCompact ? path.basename(segment.name) : segment.name}
                </Link>
              </span>
            ))}
            <span className="separator">/</span>
          </div>
        </div>
        <span className="current-segment">
          {segments[segments.length - 1]?.name}
        </span>
      </div>
      <style jsx>{`
        .breadcrumb-container {
          flex: 1;
          min-width: 0;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          flex-wrap: nowrap;
          font-size: 0.9rem;
          white-space: nowrap;
          gap: 0.25rem;
        }

        .parent-segments-wrapper {
          position: relative;
          max-width: 0;
          transition: max-width 0.2s;
          overflow: hidden;
        }

        .parent-segments-wrapper.show {
          max-width: 1000px;
        }

        .parent-segments {
          display: flex;
          align-items: center;
          opacity: 0;
          transform: translateX(-20px);
          transition: all 0.2s ease-in-out;
        }

        .parent-segments-wrapper.show .parent-segments {
          opacity: 1;
          transform: translateX(0);
        }

        .breadcrumb-item {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .separator {
          opacity: 0.3;
          padding: 0 0.25rem;
          flex-shrink: 0;
        }

        .current-segment {
          padding: 0.25rem 0.4rem;
          color: inherit;
          flex-shrink: 0;
        }

        :global(.segment-link) {
          color: inherit;
          text-decoration: none;
          padding: 0.25rem 0.4rem;
          border-radius: 4px;
          flex-shrink: 0;
        }

        :global(.segment-link:hover) {
          background: #f5f5f5;
        }

        :global(.home-link) {
          color: inherit;
          text-decoration: none;
          padding: 0.25rem 0.4rem;
          border-radius: 4px;
          flex-shrink: 0;
        }

        :global(.home-link:hover) {
          background: #f5f5f5;
        }

        @media (max-width: 768px) {
          .breadcrumb {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
