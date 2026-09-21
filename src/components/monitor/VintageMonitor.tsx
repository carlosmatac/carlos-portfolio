import styles from "./VintageMonitor.module.css";

// La carcasa, el cristal y la luz que suelta. Lo que va dentro del tubo lo
// pone quien lo usa; de ahí que el contenido llegue como children.
//
// Para meterlo en una escena que ya existe (por ejemplo un hero en el que el
// scroll te mete dentro de la pantalla) se usa con room={false}: entonces solo
// dibuja el aparato, sin sala, sin viñeteado y sin ocupar la pantalla entera.
//
// El viaje hacia dentro se conduce desde fuera con la variable --enter, de 0 a
// 1, puesta sobre este elemento o cualquier antecesor: el conjunto se acerca
// tomando como centro el cristal y el mueble se desvanece, de modo que al
// llegar a 1 solo queda la imagen. Quien la anima (scroll, framer-motion, lo
// que sea) decide el ritmo; aquí no hay JavaScript.
export default function VintageMonitor({
  children,
  plate = "CARLOS MATA",
  room = true,
  className,
}: {
  children: React.ReactNode;
  plate?: string;
  room?: boolean;
  className?: string;
}) {
  const set = (
    <div className={styles.set}>
      <div className={styles.hood} aria-hidden="true" />
      <div className={styles.body}>
        <div className={styles.well}>
          <div className={`monitor-screen ${styles.screen}`}>
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
  );

  const extra = className ? ` ${className}` : "";
  if (!room) return <div className={`monitor-set ${styles.vars} ${styles.bare}${extra}`}>{set}</div>;

  return (
    <div className={`monitor-stage monitor-set ${styles.vars} ${styles.room}${extra}`}>
      <div className={styles.halo} aria-hidden="true" />
      <div className={styles.desk} aria-hidden="true" />
      {set}
      <div className={styles.vignette} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />
    </div>
  );
}
