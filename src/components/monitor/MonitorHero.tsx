import { site } from "@/content/site";
import VintageMonitor from "./VintageMonitor";
import styles from "./VintageMonitor.module.css";

export default function MonitorHero() {
  return (
    <VintageMonitor>
      <p className={styles.mark}>CM</p>
      <h1 className={styles.name}>{site.name}</h1>
      <p className={styles.hint}>Scroll to discover</p>
      <span className={styles.tick} aria-hidden="true" />
    </VintageMonitor>
  );
}
