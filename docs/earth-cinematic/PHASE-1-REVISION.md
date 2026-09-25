# Revisión de fase 1 — 24 de septiembre de 2026

## Actualización posterior: contemplación y nubes

La petición posterior de Carlos añade una parada estable `#earth` entre la intro y St. Louis. El primer gesto termina en la Tierra; otro gesto inicia el descenso. Esta actualización tiene prioridad sobre el comportamiento de la revisión original descrita debajo.

- Las entradas y salidas urbanas comparten un paso por nubes: cambio de escena completamente oculto, sin crossfade Tierra/ciudad; ascenso al salir y trayectoria reversible.
- Perfil urbano de 4.8 s: aceleración breve y frenada progresiva, con velocidad y aceleración nulas al final. La intro conserva 5.6 s y los viajes orbitales conservan su curva.
- El arco de Blender y su encuadre se mantienen. Los bancos de nubes WebGL usan densidad e iluminación volumétricas, erosión de detalle y deriva lenta; las imágenes aprobadas quedan como fallback. Movimiento reducido elimina el túnel y la animación ambiental.
- `journey-config.ts` incluye `observeH`; el sampler genera el anchor terrestre y omite ese intervalo de lectura durante los vuelos.
- Regeneración de volúmenes: `node art-source/clouds/build-volume.mjs`. Dimensiones, bytes y hashes están en `art-source/clouds/assets.json`. El cargador limita el tamaño descomprimido y cancela descargas descartadas.
- Verificación: `npm test -- --run`, `npx eslint src/components/descent art-source/clouds/build-volume.mjs`, `npm run build`. Los tests de shaders requieren además navegador con WebGL; los mocks unitarios no compilan GLSL.

## Granada — diorama procedural en Three.js

Granada es la segunda escena urbana (`granada-sky`); Brno, Múnich y Madrid siguen sobre la Tierra. Sustituye al matte proyectado anterior: **no carga imágenes**. Todo se genera en `cities/create-granada.ts` a partir del modelo puro `cities/granada-art.ts`.

- Vista desde el Albaicín: colina de la Sabika con la Alhambra (Alcazaba y Torre de la Vela con campanario, Comares, Carlos V con patio circular, Santa María, murallas almenadas y torres, Generalife), valle del Darro con farolas, Albaicín instanciado con ventanas cálidas, Vega con luces y Sierra Nevada con nieve irregular.
- Estética de maqueta topográfica: curvas de nivel en el relieve (desvanecidas a distancia y en ángulos rasantes), luz de luna fría y focos cálidos sobre la Alhambra. Todo con shaders propios; el compositor aplica tone mapping y conversión de color una sola vez.
- Interacción: el cursor (ratón o lápiz) mueve una linterna que calienta murallas y curvas de nivel, despeja la niebla y proyecta una celosía nazarí de estrellas de ocho puntas. La cámara hace un paralaje suave con el cursor. Con pantalla táctil, o sin cursor, la linterna patrulla la muralla norte. El picking combina un ray-march sobre `terrainHeight` con un raycast contra la malla de la Alhambra.
- Movimiento reducido: sin paralaje, patrulla, balanceo de cipreses, parpadeo ni deriva de la niebla. La cámara de llegada y salida es función pura de `arrivalT`/`departureT`, así que el recorrido es reversible.
- La escena solo espera al volumen de nubes compartido del paso entre mundos. El fallback HTML es un degradado CSS sin imágenes.
- Tests: `src/components/descent/__tests__/granada.test.ts` (encuadre de escritorio y móvil, relieve, picking, cursor y táctil, reversibilidad, liberación de recursos).
- Los anchors normalizados admiten el error de redondeo de coma flotante para no dejar Granada artificialmente en el último instante de llegada.

## Brno — matriz de puntos

Brno es la tercera escena urbana (`brno-pixel`); Múnich y Madrid siguen sobre la Tierra. La inspiración es el hero de castle.tech (Unicorn Studio: glyph dither + estela del ratón). La implementación es propia y no usa su código ni sus assets.

- `cities/create-brno.ts` renderiza fuera de pantalla una calle procedural: tranvía Tatra T3 rojo y crema con pantógrafo, catenaria, parada, fachadas, Petrov y Špilberk en silueta, y un cielo de hora azul. La pasa por una matriz de glifos de 5×5, ordenados por cobertura, conservando el tono de la imagen. Sin imágenes.
- El render intermedio y la estela se dibujan en `onBeforeRender` del quad de la escena (el mismo patrón que `Reflector` de three), así que el contrato `CityScene` y el compositor no cambian.
- Cursor: una estela (campo velocidad/densidad en ping-pong, con decaimiento por tiempo) desplaza la imagen con separación RGB y centellea. Alrededor del cursor la rejilla se divide a la mitad y actúa como lupa de resolución. En táctil no hay estela.
- El tranvía sigue un horario determinista (`brno-art.ts`: frena, para, arranca). Al llegar, su posición depende solo de `arrivalT` y entra en la parada justo al aterrizar. Durante la llegada y la salida los píxeles se engordan y se resuelven. Con movimiento reducido queda parado y sin estela.
- La lectura del relato: en escritorio se atenúa el tercio izquierdo y en vertical la mitad inferior. El fallback es CSS (matriz de puntos).
- Tests: `__tests__/brno.test.ts`.

## Múnich — pantalla de misión

Múnich es la cuarta escena urbana (`munich-mission`); solo Madrid sigue sobre la Tierra. Usa la misma tubería que Brno, extraída a `cities/dot-matrix.ts` (render fuera de pantalla, estela ping-pong, lupa, atenuación del relato), con otro lenguaje visual:

- Dígitos 0–9 en fuente de 5×7 ordenados por tinta (`munich-art.ts`), celdas de 6×8, tramado con ruido y paleta táctica: azul HAT → cian → blanco. Las fuentes cálidas se pintan en ámbar y las azules conservan el azul. Un barrido de radar recorre la pantalla y algunos dígitos cambian como datos en vivo.
- Escena: un Airbus H145 (cabina, cola Fenestron, patines, rotor de cuatro palas, foco de búsqueda) sobre la azotea de HAT.tec, con el rótulo del logo iluminado. El helipuerto lleva el triángulo azul en vez de la H. La ruta de misión son waypoints con forma del triángulo HAT. Detrás: una pareja de Eurofighter con estelas, Frauenkirche, Olympiaturm, el edificio de BMW, las luces de la ciudad y los Alpes con alpenglow de Föhn.
- Cursor: visor térmico (paleta white-hot) con corchetes de puntería. El H145 vuela hacia el punto bajo el cursor (`aimPoint` y un muelle críticamente amortiguado que inclina el morro y alabea) y, cuando está dentro del visor, los corchetes se bloquean en ámbar. La estela desordena los dígitos en ámbar. En táctil, el H145 hace un vuelo estacionario suave.
- Movimiento reducido: helicóptero quieto, rotor parado, sin estela ni barrido; cazas congelados.
- Tests: `__tests__/munich.test.ts`.

## Madrid — skyline de datos

Madrid es la quinta escena (`madrid-latent`). Todas las paradas aterrizan ya en una ciudad. Técnica distinta a Brno y Múnich: no hay render intermedio ni matriz; la escena se dibuja directamente como puntos-símbolo (punto, cruz, cuadrado, rombo) con blending aditivo.

- `cities/madrid-art.ts` muestrea las Cuatro Torres planta a planta con siluetas propias: la corona en arco de Cepsa, la planta trilobulada de PwC con corona abierta, el remate inclinado de Cristal y el giro de cuadrado a lente de Emperador. Las plantas se leen como filas de una tabla y las filas encendidas van en ámbar.
- Data Engineering: el suelo es un lago de datos en rejilla, con niebla de partículas entre las bases. Pipelines ETL en Bézier con paquetes que alimentan las torres, las conectan entre sí y suben al espacio latente; el tráfico de la Castellana son dos carriles de paquetes.
- AI Engineering: en el cielo hay clusters de embeddings. El cursor es un vector de consulta: `nearest` busca los k vecinos proyectados (con separación mínima para que el top‑k se abra), los ilumina y traza los enlaces desde el cursor. Las torres se apartan alrededor del cursor y un clic lanza una onda de consulta. En táctil o sin cursor, una consulta automática recorre los clusters.
- Llegada y salida: las torres se ensamblan desde puntos dispersos, primero las plantas bajas; al salir se disuelven. Movimiento reducido: ensamblado, sin flujos ni deriva.
- Tests: `__tests__/madrid.test.ts`.

## Revisión original


Carlos pidió corregir la Tierra pixelada y que un gesto fuerte no saltara varias ciudades. Esta petición posterior cambia la recomendación original de scroll completamente libre del plan: rueda, teclado de desplazamiento y gestos táctiles ahora conducen de una parada a la siguiente. No deshacer ese comportamiento al implementar fases posteriores.

## Comportamiento implementado

- Un gesto entra desde el monitor hasta St. Louis; después cada gesto visita una sola ciudad adyacente. El sentido inverso vuelve a la anterior.
- La fuerza de la rueda no aumenta la distancia ni la velocidad del viaje. El detector consume la cola de inercia y descarta nuevos impulsos durante el vuelo; no los pone en cola.
- Viaje entre ciudades: 4.8 s. Intro y navegación explícita entre destinos alejados: 5.6 s. Curva temporal quíntica, independiente de FPS, sin un segundo damping durante el vuelo.
- Giro terrestre distribuido entre el 12% y el 92% del segmento. Acercamiento desde las estrellas continuo a distancia inicial 18, evitando el salto al tamaño de tránsito.
- Los enlaces permiten seleccionar directamente otra ciudad. La barra de scroll sigue disponible y cancela el vuelo si se arrastra. Ctrl+rueda conserva zoom. Con movimiento reducido, scroll nativo y sin vuelos guiados.
- La pestaña oculta pausa el reloj de vuelo. El cambio de preferencia de movimiento cancela la animación.

## Tierra

- Mapa de superficie WebP de 8192×4096 para escritorio compatible; variante 4096×2048 para móvil; 2K si el hardware no admite 4K o falla la carga detallada.
- Nubes WebP 4K en escritorio, 2K en móvil. Textura nocturna 2K retenida.
- Imágenes originales de Solar System Scope, CC BY 4.0, con URLs y transformaciones en `public/textures/earth/ATTRIBUTION.md`.
- Colores menos saturados, halo más discreto, geometría de esfera más densa y DPR máximo 2 en escritorio / 1.5 móvil.
- Assets nuevos: aproximadamente 2.6 MB superficie 8K, 706 KB superficie 4K y 2.7 MB nubes 4K. El peso de descarga no equivale a memoria GPU; no se ha medido memoria ni FPS de un dispositivo móvil real.

## Verificación

- 40 tests pasan, incluidos impulsos extremos, cola de inercia, bloqueo de cola durante vuelo, retroceso, navegación explícita, cancelación por scrollbar, gesto táctil y movimiento reducido.
- ESLint de `src/components/descent` pasa. El lint global conserva 11 errores y 2 warnings en archivos ajenos a esta revisión.
- Compilación final de producción y TypeScript correctos. Turbopack necesitó ejecución fuera del aislamiento para abrir su puerto local de procesamiento.
- Inspección real en navegador de localhost: Tierra con nuevo detalle, rueda fuerte St. Louis → Granada, llegada estable, retroceso a St. Louis y repetición de impulsos sin acumular ciudades. Capturas revisadas en St. Louis y Granada.
- La interacción táctil y movimiento reducido tienen pruebas de integración; no se afirma verificación en un móvil físico.
- Navegación explícita a Madrid comprobada en navegador: destino correcto, render WebGL y vuelo detenido al finalizar.

Archivos centrales: `scroll-journey.ts` (gestos y tiempos), `DescentExperience.tsx` (integración), `earth-journey.ts` (curvas), `create-earth.ts` (mapas/materiales) y `create-descent.ts` (encuadre y render).
