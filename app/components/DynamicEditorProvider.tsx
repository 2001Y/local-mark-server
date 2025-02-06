"use client";

import dynamic from "next/dynamic";
import { EditorProvider } from "@/app/context/EditorContext";

// EditorProviderを動的にインポート
const DynamicEditorProvider = dynamic(() => Promise.resolve(EditorProvider), {
  ssr: false,
  loading: () => <div>Loading editor...</div>,
});

export { DynamicEditorProvider };
