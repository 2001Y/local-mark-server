"use client";

import { Toaster } from "sonner";
import { MantineProvider, createTheme } from "@mantine/core";
import { SidebarProvider } from "../context/SidebarContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster />
      <MantineProvider
        theme={createTheme({
          primaryColor: "blue",
          fontFamily: "Inter, sans-serif",
        })}
      >
        <SidebarProvider>{children}</SidebarProvider>
      </MantineProvider>
    </>
  );
}
