# Earth → places: plan de producción

> Actualización posterior: Carlos solicitó implementar la corrección de fase 1 con avance de una parada por gesto. Ver [revisión implementada y verificaciones](PHASE-1-REVISION.md). Esta decisión sustituye la recomendación de scroll completamente libre que aparece en el plan original de abajo.

Investigación y propuesta, 24 de septiembre de 2026. **Este documento no autoriza ni contiene una implementación.** Se ha revisado la versión actual del repositorio y el portfolio de Alfonso Mayoral. Los números que siguen son valores iniciales de diseño, no resultados de rendimiento medidos.

## La experiencia que queremos

Tras atravesar las estrellas aparece una Tierra grande, casi tangible. Nos acercamos a Estados Unidos; una capa de nubes oscuras ocupa la vista y se convierte en la niebla de St. Louis. Al despejarse, el arco aparece sobre el Mississippi, con un estadio iluminado al fondo. La cámara termina de frenar y deja respirar la escena. Unas pocas líneas cuentan ese capítulo de la vida de Carlos.

Al continuar el scroll ascendemos a través de la bruma, recuperamos la Tierra y viajamos al siguiente lugar. Granada, Brno, Múnich y Madrid comparten ese lenguaje, pero cada una tiene su propio paisaje, luz y movimiento. El recorrido funciona también al retroceder.

La fantasía nace de la escala, la luz y el espacio: arquitectura reconocible sobre paisajes ligeramente irreales, horizontes que se pierden en la oscuridad y transiciones que parecen atravesar un recuerdo. Evitar convertirlo en un videojuego con paneles, controles o efectos constantes. La tipografía sigue siendo fina, limpia y en inglés; el contenido biográfico existente continúa siendo la fuente de verdad.

## Decisiones recomendadas

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Tecnología | Mantener Next, React y Three imperativo | La base actual ya tiene scroll, cámara, Tierra y accesibilidad. |
| Escenas | Dioramas 3D originales en Blender, exportados a GLB | Parallax real, cámara reversible y animación del tranvía. |
| Capas lejanas | Geometría sencilla o planos para montañas y bruma | Concentrar el detalle donde se aprecia. |
| Movimiento | Un reloj de scroll amortiguado, independiente de los FPS | Evitar tirones y acumulación de distintos sistemas de suavizado. |
| Transición | Acercamiento → nubes/bruma → paisaje → reposo | Oculta el cambio de escala sin exigir una Tierra con detalle urbano. |
| Postproducción | Niebla, color y brillo discretos | El modelado y la iluminación deben sostener la imagen por sí solos. |
| Producción | St. Louis primero; Granada valida el sistema; resto individualmente | No multiplicar cinco veces un acabado que todavía no funciona. |

No incorporar GSAP, Lenis, React Three Fiber, una segunda aplicación Astro ni un motor de física para este alcance. Tampoco copiar modelos o código minificado del portfolio de referencia. Un render 2D generado puede servir para dirección artística o fallback, pero no sustituye la geometría que necesita este recorrido.

## Orden de ejecución

Cada fase es una tarea independiente. El siguiente modelo debe ejecutar únicamente la fase que se le asigne y terminar mostrando evidencia de sus criterios de aceptación.

| Fase | Entrega concreta | Dependencia / punto de revisión |
| --- | --- | --- |
| 1. Tierra y ritmo | Tierra más protagonista; cámara y scroll suaves en las cinco paradas actuales | No necesita nuevos assets. Validar tamaño y comodidad antes de seguir. |
| 2. Recorrido y transición técnica | Máquina de fases, dos escenas y St. Louis en geometría provisional | Validar entrada, salida, scroll inverso y saltos de navegación. |
| 3. Piloto artístico | St. Louis terminado, fuente editable, GLB y póster; visor aislado de desarrollo | Necesita Blender o un asset original encargado. Validar imágenes de llegada y reposo. |
| 4. Piloto integrado | St. Louis aparece tras la Tierra con bruma, luz y rendimiento revisados | Debe funcionar sin una pausa de carga ni un corte visible. |
| 5. Segunda ciudad | Granada con el mismo contrato | Comprobar que el sistema admite otro paisaje sin rehacer la arquitectura. |
| 6a / 6b / 6c | Brno, Múnich, Madrid, una por tarea | Cada ciudad pasa el mismo control artístico y técnico. |
| 7. Cierre | Accesibilidad, móvil, navegación, recursos y pruebas del recorrido completo | No ampliar efectos antes de resolver regresiones. |

No activar las cinco escenas vacías en la fase 2. Las ciudades aún sin asset conservan su presentación actual sobre la Tierra. El compilador del recorrido debe admitir esa mezcla.

## Documentos de trabajo

1. [Investigación y diagnóstico](RESEARCH.md): qué hace realmente la referencia y qué limita nuestra versión.
2. [Movimiento y arquitectura](MOTION-AND-ARCHITECTURE.md): fórmulas, fases, estados, renderizado, carga y pruebas.
3. [Dirección artística y assets](CITY-ART-BRIEFS.md): pipeline de Blender y briefs de las cinco ciudades.
4. [Instrucciones para el siguiente modelo](HANDOFF.md): tareas copiables, archivos, límites y entregables.

## Riesgos que condicionan el plan

- **El acabado depende de los assets.** El código puede hacer una transición impecable entre modelos mediocres. El piloto necesita una revisión visual real, no solo que el GLB cargue.
- **Blender no está disponible en el PATH del entorno revisado.** La fase 1 y la fase 2 pueden hacerse sin él. Antes de la fase 3 hay que preparar esa herramienta en una tarea de producción u obtener los modelos originales. No se ha instalado nada durante esta investigación.
- **Scroll lento no significa scroll bloqueado.** Se puede diseñar una cámara calmada y dar más recorrido a cada visita, pero el usuario puede seguir desplazándose deprisa. No imponer segundos de espera ni secuestrar la rueda.
- **La Tierra actual es una esfera con texturas 2K.** Las ciudades serán escenas independientes. La bruma debe cubrir el cambio antes de que el mapa terrestre se vea pixelado.
- Las posiciones de los edificios en los dioramas serán composiciones artísticas comprimidas. Las coordenadas geográficas y el orden del recorrido sí deben conservarse.

## Definición de terminado

La Tierra domina la composición; todas las ciudades se reconocen por sus siluetas; el viaje tiene aceleración y frenada suaves; los cambios de escena se entienden al bajar y subir; no hay pantallas vacías por carga. El recorrido completo puede usarse con teclado, movimiento reducido y sin WebGL. Las fuentes de los assets y sus licencias están documentadas. Se presentan capturas y mediciones de dispositivos identificados, sin afirmar que un rendimiento objetivo ha sido conseguido si no se ha medido.
