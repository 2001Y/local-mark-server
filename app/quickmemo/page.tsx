import { QuickmemoEditor } from "./QuickmemoEditor";
import styles from "./quickmemo.module.css";

export default function QuickmemoPage() {
  return (
    <div className={styles["quickmemo-container"]}>
      <div className={styles["quickmemo-header"]}>
        <h1>クイックメモ</h1>
      </div>
      <div className={styles["editor-container"]}>
        <QuickmemoEditor />
      </div>
    </div>
  );
}
