import { Suspense } from "react";
import { ClientPage } from "./components/ClientPage";
import { FileTreeServer } from "./components/FileTreeServer";
import styles from "./page.module.css";

export default async function Home() {
  const { initialTree, updateTree } = await FileTreeServer();

  return (
    <div className={styles["home-page"]}>
      <Suspense fallback={<div>Loading...</div>}>
        <ClientPage initialTree={initialTree} updateTree={updateTree} />
      </Suspense>
    </div>
  );
}
