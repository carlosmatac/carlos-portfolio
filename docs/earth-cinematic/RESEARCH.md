# Investigación: evidencia y límites

Revisión del 24 de septiembre de 2026. Base local: commit `a88d92cedd64825eb503864181ed575d379ec5e8`, rama `codex/portfolio-dark-descent`. Repositorio limpio al iniciar esta tarea. La investigación no cambia la web.

## Portfolio de referencia

Se ha abierto [la web de Alfonso Mayoral](https://alfonsomayoral.vercel.app/) en un navegador y se ha inspeccionado su repositorio. Snapshot del árbol consultado: [`735355f2600b55313971f1409d47667fd91186fc`](https://github.com/alfonsomayoral/portfolio-website/tree/735355f2600b55313971f1409d47667fd91186fc).

### Lo que se vio

- Inicio con montañas nevadas que llenan la vista, niebla entre planos y tipografía editorial grande.
- Educación con terreno verde, agua, horizonte cálido y vegetación en primer término. Al avanzar, el cambio de cámara revela profundidad y diferencia de escala.
- Trabajo con un campo de partículas azul, verde y violeta que ocupa todo el encuadre.

Esta inspección es cualitativa. No se han medido sus FPS, memoria, Core Web Vitals o rendimiento móvil. La escena marítima se identificó en los archivos; no se verificó visualmente en esta sesión.

### Lo que confirma el código

El [README](https://github.com/alfonsomayoral/portfolio-website/blob/735355f2600b55313971f1409d47667fd91186fc/README.md) describe una base procedente de una plantilla comercial Astro/Three y una escena de trabajo personalizada en `neural.js`. El repositorio contiene una salida estática compilada; no proporciona toda la aplicación Astro editable.

En [`neural.js`](https://github.com/alfonsomayoral/portfolio-website/blob/735355f2600b55313971f1409d47667fd91186fc/neural.js) se observan:

| Hallazgo | Aplicación a nuestro caso |
| --- | --- |
| Trayectoria Catmull–Rom con puntos de visita y tránsito | Diseñar posiciones y objetivos de mirada, no limitarse a interpolar un zoom. |
| Segmentos de visita y desplazamiento con pesos distintos | Dar espacio al paisaje y al texto después de llegar. |
| Smootherstep quíntico en visitas | Frenar en los extremos sin un cambio brusco de aceleración. |
| Mirada adelantada; `PEEK_FRACTION = 0.25` en el código | Anticipar suavemente la dirección del viaje. El comentario habla de otra proporción; usar el código como evidencia. |
| `smoothProgress += (rawProgress - smoothProgress) * 0.04` | Hay amortiguación. En nuestro caso debe depender del tiempo, no del número de frames. |
| Dimensiones de tarjetas cacheadas y actualizaciones de visibilidad limitadas | Evitar trabajo DOM innecesario en el bucle de render. |

La curva de la referencia usa `getPoint`, no `getPointAt`: tomar la idea de la coreografía, pero usar muestreo por longitud de arco cuando queramos velocidad espacial más uniforme. La tensión o una curva por sí sola no garantizan un movimiento agradable.

El [bundle de la aplicación](https://github.com/alfonsomayoral/portfolio-website/blob/735355f2600b55313971f1409d47667fd91186fc/_astro/GlobalApp.vK8XqYB9.js) y el árbol de assets muestran modelos GLB, texturas de materiales, mapas de iluminación por escena, un entorno EXR y soporte KTX2. Ejemplos de tamaños de archivo, **no memoria en GPU**:

| Asset de la referencia | Tamaño aproximado |
| --- | --- |
| `assets/models/mountains.glb` | 1.50 MB |
| `assets/models/homepage/earth-min.glb` | 6.85 MB |
| `assets/models/capital/capital-min.glb` | 0.36 MB |
| `assets/models/capital/grass-min.glb` | 1.20 MB |
| `assets/models/maritime/boat.glb` | 0.20 MB |
| `assets/textures/envmap-min.exr` | 0.11 MB |

**Conclusión de diseño:** la calidad visual procede en buena medida de escenas preparadas de antemano, materiales, iluminación y composición. Añadir una librería de scroll no produce ese acabado. La profundidad atmosférica observada inspira nuestra propuesta; no se ha reconstruido su shader exacto ni demostrado que use una técnica concreta de niebla volumétrica, SSR o bloom.

El árbol revisado no contenía un archivo de licencia que permita dar por reutilizables todos esos recursos, y el README menciona una plantilla comercial. Usar el repositorio como referencia técnica; producir nuestros propios modelos, texturas y composición.

## Diagnóstico de la versión local

Stack instalado: Next 16.1.1, React 19.2.3, Three 0.185.1. Hay Framer Motion; no hay GSAP, Lenis ni React Three Fiber. No hace falta incorporarlos para este plan.

| Archivo actual | Comportamiento relevante | Cambio propuesto |
| --- | --- | --- |
| `src/components/descent/DescentExperience.tsx` | Un RAF; amortiguación exponencial con coeficiente 9; progreso global; escrituras DOM por frame | Mantener un único reloj, bajar la respuesta inicial a `tau = 0.42 s`, actualizar DOM solo cuando cambie. |
| `src/components/descent/earth-journey.ts` | Entrada hasta 0.32; paradas cada 0.16; altitude y turn controlan viaje | Sustituir números repartidos por una configuración de fases que también produzca los anchors. |
| `src/components/descent/create-descent.ts` | FOV 42°, Tierra a distancia 8.8 en visita y 18 en tránsito; desplazamiento del centro a la derecha | Reducir distancia orbital, recentrar moderadamente, calcular encuadre por perfil. |
| `src/components/descent/create-earth.ts` | Radio 3.3; texturas día/noche 2K; nubes y atmósfera; orientación por quaternion | Conservar esfera y convención geográfica. Separar las escenas urbanas. |
| `src/app/globals.css` | Sección de 1800svh; texto a la izquierda en escritorio y abajo en móvil | Derivar longitud del timeline; mantener zonas de lectura. |
| `src/content/places.ts` | Datos reales de las cinco etapas | Fuente de verdad. No inventar biografía para acompañar el render. |

Con una respuesta exponencial de coeficiente 9, el 95% de un salto se alcanza en aproximadamente 0.33 s. El factor 0.04 por frame de la referencia equivale, **a 60 FPS**, a un coeficiente de 2.449 y unos 1.22 s al 95%. Esto explica parte de la diferencia de tacto, pero no toda: recorrido, distancias y reposos también cuentan. Nuestra propuesta `tau = 0.42 s` tarda unos 1.26 s al 95%, con independencia de la tasa de frames.

La esfera actual ocupa aproximadamente el 105% de la altura al estar a distancia 8.8, y solo el 49% al alejarse a 18, antes de considerar recortes y view offset. Por eso aumentar únicamente el tamaño en las paradas no resuelve la sensación de una Tierra pequeña durante el viaje.

## Fuentes técnicas para producción

- [Three: Curve](https://threejs.org/docs/pages/Curve.html): `getPointAt`, longitud de arco y actualización de la caché cuando cambia la curva.
- [Three: CatmullRomCurve3](https://threejs.org/docs/pages/CatmullRomCurve3.html): variantes de interpolación. Empezar con `centripetal` y validar el recorrido.
- [Three: GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html): carga y extensiones de glTF; integración de decodificadores.
- [Three: KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html): transcodificación de texturas; llamar a `detectSupport(renderer)` antes de cargar.
- [Three: color management](https://threejs.org/manual/pages/color-management.html), [post-processing](https://threejs.org/manual/pages/post-processing.html) y [OutputPass](https://threejs.org/docs/pages/OutputPass.html): espacio lineal de trabajo y conversión final de color.
- [Blender: render baking](https://docs.blender.org/manual/th/4.5/render/cycles/baking.html): página oficial recuperada en este locale, con contenido en inglés; UV, imagen activa, tipos de bake y márgenes.
- [Blender: exportación glTF](https://docs.blender.org/manual/en/5.0/addons/import_export/scene_gltf2.html): materiales soportados por el exportador. No todos los nodos procedurales o efectos de Blender sobreviven a GLB.

La documentación pública puede evolucionar. Antes de implementar, confirmar APIs con Three 0.185.1 instalado. Se verificaron localmente `Texture.channel` y el muestreo por longitud de arco de `Curve`; no actualizar dependencias como requisito de esta propuesta.

## Límites pendientes de validar

- El estilo definitivo se valida con el piloto, no con una promesa de que los edificios por sí solos producirán el acabado deseado.
- Los presupuestos de rendimiento de los siguientes documentos son objetivos iniciales. Falta medir los assets originales y los dispositivos de Carlos.
- Faltan modelos propios y sus fuentes editables. No se han descargado modelos de terceros, generado imágenes, instalado Blender ni tocado la implementación.
