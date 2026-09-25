# Encargos preparados para el siguiente modelo

Usar **un encargo por tarea**, en orden. Copiar el encabezado común y el encargo elegido. Este archivo no pide ejecutar ahora ninguna fase.

## Encabezado común

> Trabaja en el repositorio local de Carlos. Lee `docs/earth-cinematic/README.md`, `RESEARCH.md`, `MOTION-AND-ARCHITECTURE.md` y `CITY-ART-BRIEFS.md`. Ejecuta solo la fase indicada debajo. Inspecciona primero git status, instrucciones del repositorio y archivos actuales: el plan describe el snapshot `a88d92c` y pueden existir cambios posteriores. Conserva trabajo ajeno. Mantén Next/React/Three actuales, scroll nativo, contenido de `src/content/places.ts`, intro del monitor y estrellas, y accesibilidad. No añadas dependencias, publiques, hagas push o copies assets del portfolio de referencia por iniciativa propia. No produzcas otras ciudades fuera del encargo. Los parámetros del plan son puntos iniciales que debes validar visualmente; documenta cualquier desviación importante. Termina con archivos cambiados, evidencia visual, comprobaciones ejecutadas y lo que falta. No pases automáticamente a la siguiente fase.

## Fase 1 — Tierra y movimiento actual

> Haz que la Tierra tenga más presencia y que el recorrido existente se sienta lento y suave. Antes de editar captura al menos una visita y un tránsito en escritorio y móvil. Revisa `DescentExperience.tsx`, `create-descent.ts`, `earth-journey.ts`, `create-earth.ts`, `journey.ts` y `globals.css`. Mantén las cinco paradas sobre la Tierra; aún no implementes ciudades ni compositor. Cambia el damping a una función temporal con tau inicial 0.42 s. Ajusta distancias y view offset según el apartado 2 de MOTION-AND-ARCHITECTURE: tránsito 90–110% de altura en escritorio, visitas 125–140%, perfil móvil por ancho. Conserva radio y geografía. Ajusta aceleración y frenada sin retrasar por separado texto, cámara y marcadores. No alargues aún la página a la propuesta completa de 38.7H. Verifica scroll inverso, navegación y movimiento reducido. Añade pruebas solo para nueva lógica de movimiento; ejecuta lint, test y build. Lanza o reutiliza localhost y presenta capturas antes/después y una revisión de movimiento en navegador. Detente para revisar el tacto antes de la fase 2.

Aceptación: Tierra visible también entre destinos, sin texto cortado ni cámara dentro de la esfera; resultado equivalente a distintas tasas de frames; intro y cinco enlaces siguen funcionando. Informar tamaños de viewport y parámetros finalmente usados.

## Fase 2 — Timeline y St. Louis provisional

> Implementa la configuración y sampler puros del apartado 3, con fases y anchors derivados de la misma fuente. Usa las cinco ciudades existentes, pero habilita una escena urbana solo para St. Louis; las otras conservan visita terrestre. Añade contrato de CityScene y un compositor mínimo con un renderer, dos escenas/cámaras y crossfade lineal; no añadas bloom ni shader artístico de bruma todavía. Crea St. Louis con geometría provisional que tenga arco, río y estadio para validar cámara y separación espacial; identifica ese asset como blockout. Implementa llegada, salida, marcha atrás y seek con fallback, según el apartado 4. Prueba boundaries, anchors, saltos largos, resize y desmontaje. Entrega una transición funcional y legible; no dediques la tarea a detallar edificios.

Aceptación: retroceder en mitad de una mezcla no provoca flashes ni estado residual; click en Madrid no obliga a atravesar todas las ciudades; navegación y scroll están sincronizados; no hay cinco escenas vacías ni nuevos datos biográficos inventados.

## Fase 3 — Asset final de St. Louis

> Produce únicamente el piloto artístico de St. Louis del CITY-ART-BRIEFS. Verifica primero la disponibilidad de Blender/herramienta de modelado; el entorno investigado no tenía Blender en PATH. Si la herramienta falta, resuelve ese prerrequisito dentro del alcance autorizado o deja claramente identificado el bloqueo; no sustituyas el GLB final por una imagen. Primero valida blockout y cámaras, luego materiales y luz, después optimiza. Usa referencias oficiales para proporciones y modelos originales. Entrega fuente editable, exportación reproducible, GLB escritorio/móvil, pósters y manifest de nodos/cámaras/licencias. Implementa un visor aislado de desarrollo con el mismo color management que la web para comprobar el asset. No integres todavía nuevos efectos de transición ni produzcas Granada. Presenta vistas de llegada/reposo en escritorio y móvil, bytes, triángulos, draw calls y dependencias del asset.

Aceptación: arco triangular y afilado reconocible, río y estadio visibles, profundidad de tres planos, buen acabado sin exceso de bloom, sin texturas perdidas. No etiquetar como acabado final si sigue siendo un blockout. El control artístico es una condición real antes de multiplicar ciudades.

## Fase 4 — Integración y bruma

> Integra el St. Louis validado con la Tierra. Añade la coreografía de llegada/salida y la máscara de bruma según MOTION-AND-ARCHITECTURE. Alinea dirección de cámara, punto de interés y exposición a ambos lados del cambio. Mantén la bruma suficientemente presente para ocultar el salto de escala, pero no tan larga que parezca una pantalla de carga. Revisa color lineal, render targets y una sola conversión final. Precarga el piloto sin retrasar el primer render; implementa póster y texto en carga/error. Mide el solape, que es el caso de GPU más costoso. Verifica ida/vuelta, seek, red lenta, WebGL perdido, resize, móvil y movimiento reducido. No añadas otra ciudad.

Aceptación: no se aprecia corte del mapa a la maqueta, no hay fogonazo ni mapa pixelado antes de ocultarse; los extremos de la mezcla son puros; no aumenta continuamente la memoria al repetir el viaje; desktop y móvil tienen evidencia separada.

## Fase 5 — Granada

> Produce e integra Granada siguiendo su brief, contratos y pipeline ya validados. Conserva Sierra, Alhambra y vegetación como planos legibles; no construyas interiores. Reutiliza sampler, compositor, carga y accesibilidad sin duplicarlos. Activa únicamente la capacidad urbana de Granada en la configuración. Actualiza navegación/longitud mediante el compilador. Entrega fuente, variantes, pósters, manifest, pruebas y capturas. Si necesitas una excepción al contrato, explica por qué y resuélvela de forma pequeña antes de extender a otras ciudades.

Aceptación: la segunda ciudad encaja sin reescribir la transición y el cambio de longitud no rompe anchors. St. Louis y las visitas terrestres restantes siguen funcionando.

## Fases 6a / 6b / 6c — Una ciudad por encargo

Copiar el siguiente encargo y sustituir `[CIUDAD]` por **Brno**, después **Múnich**, después **Madrid**, en tareas separadas:

> Produce e integra solo [CIUDAD], siguiendo su brief y los contratos ya probados. No alteres la dirección artística global. Entrega los mismos recursos y evidencias que St. Louis y Granada. Usa el movimiento protagonista previsto: tranvía ligado a visitT para Brno; agua para Múnich; bruma de torres para Madrid. Activa la ciudad en la configuración sin hardcodear nuevas posiciones globales. Comprueba navegación desde cualquier otra parada y marcha atrás. Termina al completar esta ciudad; no continúes con la siguiente.

Aceptación particular: Brno sin teletransporte o colisiones del tranvía; Múnich con membranas y cuatro cilindros legibles; Madrid con cuatro siluetas distintas y un final estable. Biografía, orden y coordenadas permanecen en la fuente existente.

## Fase 7 — Revisión final

> Revisa el recorrido completo con la matriz de pruebas de MOTION-AND-ARCHITECTURE. Prioriza errores de transición, rendimiento, carga y accesibilidad. Ajusta los pesos del scroll si la experiencia es demasiado larga. Comprueba teclado, anchors directos, Home/End, viewport móvil y orientación, diez viajes ida/vuelta, red lenta, fallo de un asset, contexto WebGL perdido y movimiento reducido. Presenta resultados con dispositivo/navegador, resolución, DPR, caché, carga y métricas observadas. Corrige problemas antes de añadir efectos. Ejecuta lint/test/build y registra limitaciones. No desarrolles la futura dimensión de proyectos personales.

## Formato mínimo del informe de cada fase

```text
Fase completada:
Archivos y assets cambiados:
Decisiones/parámetros finales y motivo de desviaciones:
Capturas de escritorio y móvil:
Verificación de movimiento en navegador:
Pruebas y resultado:
Rendimiento medido (o no medido; explicar):
Problemas pendientes:
Siguiente fase recomendada, sin ejecutarla:
```

No sustituir evidencia por frases como «cinemático», «optimizado» o «smooth». Mostrar qué se ha comprobado y en qué condiciones.
