# Revisión de fase 1 — 24 de septiembre de 2026

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
