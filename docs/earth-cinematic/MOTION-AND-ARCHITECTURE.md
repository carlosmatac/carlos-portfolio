# Especificación de movimiento y arquitectura

Propuesta para la implementación posterior. Leer antes [el plan](README.md) y [la evidencia](RESEARCH.md). Los fragmentos son contratos orientativos; no constituyen código ya integrado.

## 1. Un reloj visual

Mantener scroll nativo. Separar tres valores:

- `rawPosition`: posición solicitada por scroll, en unidades de altura de viewport.
- `visualPosition`: posición amortiguada que gobierna cámara, transición, texto, navegación activa y animaciones vinculadas al recorrido.
- `ambientTime`: tiempo para agua, nubes y luces muy lentas. Nunca decide qué capítulo está activo.

Aplicar una sola amortiguación, independiente de FPS:

```ts
const alpha = 1 - Math.exp(-deltaSeconds / tau);
visualPosition += (rawPosition - visualPosition) * alpha;
// tau inicial: 0.42 s; rango de ajuste: 0.35–0.55 s.
```

Usar el tiempo transcurrido real en frames activos, con un límite razonable para pausas anómalas. Al volver de una pestaña oculta, reiniciar la marca temporal. No aplicar después otra interpolación independiente a cada cámara, tarjeta y planeta: genera desfases. La navegación activa representa lo que se ve, no el destino al que aún se está viajando.

No combinar esta amortiguación con Lenis, un `scrub` amortiguado de GSAP o scroll CSS suave al mover programáticamente un anchor. Los saltos de navegación tienen tratamiento propio.

La sensación de lentitud se construye también con distancias y espacio de scroll. No aumentar `tau` indefinidamente: más de aproximadamente 0.8 s puede sentirse como una interfaz que no obedece.

### Reposo, aceleración y mirada

Para iniciar o terminar un movimiento usar `smootherstep(t) = 6t⁵ - 15t⁴ + 10t³`, con `t` limitado a [0,1]. Su velocidad y aceleración son cero en ambos extremos. No aplicarlo a cada tramo diminuto: provocaría una sucesión de paradas. Los tramos de una misma llegada comparten tangentes y se sienten como un solo movimiento.

Separar curva de posición y curva de objetivo de mirada. Para ciudades empezar con Catmull–Rom centrípeta y `getPointAt(t)`; actualizar longitudes al editar puntos. Alternativa para un movimiento corto: Bézier cúbica con tangentes diseñadas. La Tierra conserva su rotación geográfica por quaternion.

Valores iniciales: cámara sin roll durante el trayecto; roll artístico máximo 1° si aporta algo al piloto. Adelanto de mirada de 10–20% del tramo en tránsitos, que se apaga suavemente al llegar. Sin jitter ni sacudidas. En reposo puede haber un desplazamiento total de cámara menor al 0.5% de la altura del monumento en un ciclo de 12–20 s; desactivarlo si dificulta la lectura.

## 2. Tierra más grande

Conservar el radio 3.3 y las proporciones de atmósfera, nubes y marcadores. Cambiar la distancia de cámara y el encuadre, no escalar por separado esas piezas. FOV vertical inicial 42°.

Para una esfera centrada y cámara apuntando a su centro:

```text
k = diámetro proyectado / altura del viewport
k = R / (tan(FOV / 2) · sqrt(d² − R²))
d = R · sqrt(1 + 1 / (k · tan(FOV / 2))²)
```

Es una base de cálculo, no una garantía de encuadre con desplazamiento de lente o cámara fuera de eje. Validar la caja visible mediante capturas.

| Perfil | Tierra en tránsito | Tierra en visita | Composición |
| --- | --- | --- | --- |
| Escritorio ≥ 1024 px | 90–110% de altura | 125–140% de altura | Centro horizontal al 60–64%; texto en el tercio izquierdo. |
| Tablet | Ajustar por espacio real libre | No tapar contenido | Evitar heredar sin más el desplazamiento de escritorio. |
| Móvil | 90–110% del ancho | Hasta 120% del ancho si el texto sigue libre | Tierra en la parte superior; relato inferior. |

Con R=3.3, FOV=42°, un diámetro del 135% de altura corresponde a distancia aproximada 7.2. Para el 90%, aproximadamente 10.1. Sustituir el alejamiento actual a 18 por ese rango como punto inicial. La llegada a una ciudad puede superar ese tamaño durante un instante, pero la bruma debe ocultar el mapa antes de ver falta de resolución.

En móvil convertir el objetivo de ancho a altura antes de aplicar la fórmula: `kHeight = kWidth * width / height`. Utilizar el perfil del área visible; no asumir que todos los dispositivos son 16:9.

La fase 1 mantiene la intro de monitor y estrellas, las cinco ciudades y su contenido. Solo ajusta encuadre, reloj y curva de vuelo actual. La nueva máquina de fases llega en la fase 2.

## 3. Recorrido declarativo

Crear una única configuración que genere duración de página, rangos de fases, navegación, destinos de anchors y muestreo. Dejar de derivarlos por separado mediante `FIRST_STOP` y `STOP_INTERVAL`.

Unidad `H`: altura del viewport usada por el sistema. Capturar una altura estable para la sesión móvil; no reconstruir todo con cada cambio de la barra del navegador. En cambios reales de orientación/tamaño, preservar fase y progreso local y recalcular la posición de scroll correspondiente.

Propuesta inicial **para el recorrido completo con cinco escenas terminadas**:

| Fase | Peso en H | Qué sucede |
| --- | ---: | --- |
| Intro | 4.25 | Monitor, entrada y estrellas. Preservar coreografía actual. |
| Descubrimiento de la Tierra | 1.50 | Planeta grande; aproximación inicial a Estados Unidos. |
| Llegada a ciudad × 5 | 1.80 cada una | Acercamiento, bruma, entrada del diorama y frenada. |
| Visita × 5 | 1.40 cada una | Lectura, paisaje y un gesto ambiental. |
| Salida × 4 | 1.20 cada una | Ascenso, bruma, recuperación de la Tierra en la ciudad actual. |
| Transferencia orbital × 4 | 2.60 cada una | Alejamiento moderado, giro y aproximación al siguiente lugar. |
| Final | 0.75 | Reposo en Madrid. No inventar aún otro planeta o sección de proyectos. |

Total: **37.7 H de recorrido**, sección de **38.7 H** al sumar la altura de la vista sticky. Es un presupuesto inicial, no una longitud innegociable: reducir pesos si el recorrido exige demasiados gestos. No activar esta longitud completa para un piloto de una ciudad. Una parada sin escena usa visita terrestre y omite su llegada/salida urbana.

```ts
type PhaseKind = 'intro' | 'earth-reveal' | 'arrival' | 'visit'
  | 'departure' | 'transfer' | 'earth-visit' | 'ending';
type JourneyPhase = {
  id: string;
  kind: PhaseKind;
  cityId?: string;
  nextCityId?: string;
  weightH: number;
};
// compileJourney(config) → fases con startH/endH, totalH y anchors.
// sampleJourney(positionH) → fase, t local, ciudad, cámara,
//                          mezcla, opacidad de texto y modo visual.
```

El array de ciudades respeta `src/content/places.ts`. No duplicar nombres, fechas o URLs en configuraciones de geometría. Cada anchor apunta al inicio estable de su visita. El sampler es puro, determinista y admite cualquier posición sin haber recorrido las anteriores.

## 4. Llegada, salida y salto

### Llegada: `t` local entre 0 y 1

| Intervalo inicial | Cámara / imagen | Interfaz |
| --- | --- | --- |
| 0–0.30 | Acercarse al marcador de la Tierra; mantener el norte y el sentido del desplazamiento | Texto de visita oculto. |
| 0.20–0.58 | Aumenta bruma azul oscura; desaparece detalle del mapa | Navegación permanece disponible. |
| 0.42–0.72 | Mezclar escena terrestre y urbana bajo la bruma; alinear centro de interés | Sin flashes blancos ni cambio brusco de exposición. |
| 0.62–0.94 | Aparece el monumento, la cámara completa la aproximación y frena | Texto comienza a entrar después de 0.84. |
| 0.94–1 | Reposo legible | Texto completamente visible al final. |

La dirección dominante y el punto luminoso principal se conservan a ambos lados del cambio. No hace falta que los dos mundos compartan coordenadas reales. La máscara oculta esa discontinuidad espacial. Reservar el paso de estrellas rápido para la intro; los viajes terrestres deben ser más calmados.

Salida: recuperar bruma desde la ciudad, mezclar con la Tierra orientada todavía a ese lugar y solo después iniciar la transferencia al siguiente. Diseñar una salida semántica explícita; al retroceder, cada fase se evalúa en sentido contrario sin eventos de una sola ejecución.

### Saltos grandes y carga

Rueda y trackpad ordinarios usan el reloj. Click en navegación, Home/End, anchor externo o salto de más de 4H en un frame usan un modo `seek`: oscurecer con bruma durante 150–250 ms, establecer destino cuando está oculto y despejar durante 200–350 ms. Ese tiempo es un punto inicial. Actualizar también el scroll nativo para que el siguiente gesto continúe desde el destino. No hacer volar al usuario por todas las ciudades intermedias.

No esperar indefinidamente a un GLB: durante el seek, si el asset no está listo, mostrar el póster del destino y su texto. La descarga puede seguir en segundo plano, y el paso a 3D se hace con una mezcla discreta cuando esté disponible. La rueda sigue respondiendo; un nuevo destino cancela la transición anterior mediante un identificador de solicitud. Para movimiento reducido, el cambio es inmediato y sin vuelo.

## 5. Renderizado y módulos

Mantener **un WebGLRenderer y un contexto**. La escena actual conserva monitor, estrellas y Tierra. Cada ciudad tiene una escena y una cámara locales. Durante el solape se renderizan ambas a dos targets; fuera del solape solo la escena visible.

Archivos propuestos, no creados todavía:

| Archivo | Responsabilidad |
| --- | --- |
| `journey-config.ts` | Pesos y capacidades de cada parada. |
| `journey-timeline.ts` | Compilación y sampler puros. |
| `motion.ts` | Amortiguación temporal y easing compartido. |
| `cities/types.ts` | Contrato de asset y escena. |
| `cities/load-city.ts` | Carga, ownership, caché acotada y descarte. |
| `cities/create-city-scene.ts` | Luces, cámara, animación y recursos de una ciudad. |
| `transitions/create-transition.ts` | Render targets, mezcla, bruma y resize/dispose. |
| `src/content/city-assets.ts` | Manifest tipado de rutas, presupuestos y perfiles. |

Situarlos bajo `src/components/descent/`, salvo el manifest indicado en `src/content/`. `DescentExperience.tsx` mantiene el scroll, accesibilidad y DOM; `create-descent.ts` orquesta el renderer y delega, sin convertirse en otro archivo monolítico.

```ts
type CityScene = {
  update(frame: { visitT: number; arrivalT: number;
    departureT: number; ambientSeconds: number; reduced: boolean }): void;
  resize(width: number, height: number, quality: 'desktop' | 'mobile'): void;
  // Escena y cámara accesibles al compositor; no crear otro renderer.
  dispose(): void;
};
```

Definir valores de los tres progresos incluso fuera de su fase; evitar que un frame herede accidentalmente el estado anterior. En transferencias no se actualiza una ciudad invisible.

### Color y atmósfera

Fase 2: una mezcla lineal sencilla demuestra el circuito. Fase 4: máscara de ruido de baja frecuencia, bordes amplios y bruma animada muy lenta. Forzar matemáticamente `t=0 → escena A` y `t=1 → escena B` para evitar fantasmas persistentes.

Trabajar en espacio lineal en los render targets, mezclar, aplicar bloom opcional y hacer tone mapping / conversión a pantalla **una sola vez al final** mediante OutputPass o equivalente verificado. Auditar los shaders existentes de la Tierra: no conservar en ellos una conversión de salida y volver a aplicarla en el compositor. Las texturas de color son sRGB; normal, roughness y otros datos no lo son.

Empezar con FogExp2 y dos o tres capas de bruma. Transparencias con `depthWrite=false`, orden estable y sin atravesar edificios de forma evidente. No empezar por ray marching volumétrico, SSR, desenfoque de movimiento, profundidad de campo o aberración cromática. Bloom tenue solo si ya funcionan iluminación y materiales; excluir el texto HTML.

### Carga y memoria

- Precargar St. Louis mientras se completa el tramo terrestre anterior, sin competir con el primer render del monitor. Cargar un solo destino adicional a la vez.
- Mantener Tierra + una ciudad activa en GPU. Prefetch de la siguiente como bytes/caché de red; no crear todos sus materiales y texturas en GPU de antemano.
- Liberar ciudad anterior después de abandonar el solape. El cache de descargas puede conservar bytes con límite; documentar ese límite.
- AbortController donde el mecanismo de carga lo admita; en todo caso token de generación para descartar resultados tardíos. Disponer también assets cargados después de desmontar el componente.
- Inventariar ownership de geometrías, materiales, texturas, ImageBitmaps, render targets y listeners. No disponer recursos compartidos mientras otra escena los usa.
- Reducir resolución de targets durante mezcla en perfil móvil si el coste se duplica. Los targets solo se reasignan por resize/calidad, nunca por frame.
- Error de asset: póster + relato + navegación. Error de WebGL/context loss: fallback HTML de la experiencia; no un canvas negro ni un bucle de reintentos.

## 6. Calidad y pruebas

Presupuestos iniciales por ciudad: 2–4 MB de descarga objetivo, 6 MB máximo de partida; móvil 1–2 MB. Geometría 120–200k triángulos escritorio y 60–80k móvil. Draw calls de escena ≤80 escritorio / ≤45 móvil. DPR inicial máximo 1.5 / 1.25. Objetivo 60 FPS escritorio y al menos 30 FPS móvil en dispositivos de referencia identificados.

Presupuesto provisional residente: 256 MB GPU escritorio / 128 MB móvil, incluyendo Tierra y targets. La memoria GPU no se deduce solo del peso del GLB ni de `renderer.info.memory`, que cuenta recursos y no sus bytes. Estimar texturas descomprimidas, mipmaps y targets; registrar dimensiones, formatos y conteos. Ajustar con medidas del navegador y del dispositivo cuando estén disponibles.

Pruebas necesarias:

1. Unitarias: mismo damping a 30/60/120 Hz durante igual tiempo; límites de sampler; orden y anchors; continuidad de cámara/mezcla en fronteras; easing con derivadas esperadas; último frame de Madrid estable.
2. Recorrido manual: avanzar despacio, rápido, retroceder a mitad de mezcla, saltar de St. Louis a Madrid, Home/End y scroll desde anchor inicial. Sin volver por error a una ciudad intermedia.
3. Carga: caché fría/caliente, red lenta, un GLB inexistente, desmontaje durante descarga. Siempre hay una imagen legible o fallback.
4. Pantallas: 1440×900, 1920×1080, 390×844 y 844×390. Cambiar tamaño en mitad del viaje conservando capítulo y progreso local.
5. Accesibilidad: teclado y foco, enlaces reales, headings y relato en DOM, capítulo inactivo no enfocable; `prefers-reduced-motion` elimina túnel, vuelos y bruma animada; contenido disponible sin WebGL.
6. Recursos: diez recorridos ida/vuelta no aumentan continuamente recursos residentes. Pausar trabajo al ocultar pestaña; desmontar sin RAF/listeners vivos.
7. Verificación artística: capturas de Tierra, llegada, mitad de mezcla y reposo de cada ciudad. Grabar un recorrido si la herramienta disponible lo permite. Un screenshot no demuestra suavidad.

Tras cada fase de código: `npm run lint`, `npm run test -- --run`, `npm run build`. No ampliar suites sin motivo; añadir pruebas donde haya nueva lógica de timeline o recursos, no tests que repliquen valores de CSS. Reportar fallos y limitaciones de entorno de forma explícita.
