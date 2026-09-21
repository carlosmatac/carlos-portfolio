import styles from "./VintageMonitor.module.css";

// La carcasa, el cristal y la luz que suelta. Lo que va dentro del tubo lo
// pone quien lo usa; de ahí que el contenido llegue como children.
export default function VintageMonitor({
  children,
  plate = "CARLOS MATA",
  className,
}: {
  children: React.ReactNode;
  plate?: string;
  className?: string;
}) {
  return (
    <div className={`monitor-stage ${styles.room}${className ? ` ${className}` : ""}`}>
      <div className={styles.halo} aria-hidden="true" />
      <div className={styles.desk} aria-hidden="true" />
      <div className={styles.set}>
        <div className={styles.hood} aria-hidden="true" />
        <div className={styles.body}>
          <div className={styles.well}>
            <div className={styles.screen}>
              <div className={styles.picture}>{children}</div>
              <div className={styles.scan} aria-hidden="true" />
              <div className={styles.roll} aria-hidden="true" />
              <div className={styles.glass} aria-hidden="true" />
              <div className={styles.flicker} aria-hidden="true" />
            </div>
          </div>
          <div className={styles.chin} aria-hidden="true">
            <span className={styles.engraved}>{plate}</span>
            <span className={styles.controls}>
              <span className={styles.dial} />
              <span className={styles.dial} />
              <span className={styles.led} />
            </span>
          </div>
        </div>
        <div className={styles.pedestal} aria-hidden="true" />
        <div className={styles.base} aria-hidden="true" />
        <span className={styles.pool} aria-hidden="true" />
        <span className={styles.contact} aria-hidden="true" />
      </div>
      <div className={styles.vignette} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />
    </div>
  );
}
