# Dirección artística y producción de escenas

Estos briefs son instrucciones de producción futura. No se han generado renders ni modelos durante esta investigación. Leer el [orden de fases](README.md) antes de producir assets.

## Lenguaje común

**Recuerdos geográficos suspendidos en la noche.** Paisajes tridimensionales reconocibles, con profundidad de primer plano, monumento y horizonte. Arquitectura de detalle medio, proporciones cuidadas, materiales suaves y luz de hora azul. La fantasía aparece en la bruma, reflejos, distancias comprimidas y un horizonte que se disuelve; evitar tanto el realismo de un mapa como los edificios de juguete hechos de cubos indistintos.

Paleta base: casi negro `#05070D`, azul noche `#101A30`, bruma violeta `#74759B`, plata `#B8C5D6`; acentos cálidos `#D6A46F`. Son guías de dirección, no colores que deban aplicarse planos a todos los materiales. Cada ciudad conserva un acento propio. Una luz principal amplia, ambiente suave y pequeños puntos cálidos bastan para comenzar.

Composición inicial escritorio: espacio oscuro y poco contrastado a la izquierda para el relato; monumento en el centro/derecha; profundidad hasta el horizonte. Móvil tiene cámara propia y reserva la zona inferior para el texto. No escalar simplemente el encuadre horizontal hasta cortar el monumento.

Un movimiento reconocible por escena: reflejo del río, nubes sobre la Sierra, tranvía, agua del lago o bruma entre torres. El resto permanece tranquilo. Sin carteles 3D de biografía, logos inventados, meteoritos ni partículas por todas partes.

## Pipeline obligatorio de un asset

1. **Referencias y blockout.** Estudiar siluetas con fuentes oficiales; montar masas, cámara de llegada, cámara de reposo y márgenes para texto. Capturar escritorio y móvil. No detallar una composición que aún no funciona.
2. **Modelado.** Corregir proporciones y siluetas; añadir detalles que sobrevivan al tamaño final. Instanciar vegetación y ventanas. Evitar geometría subpíxel.
3. **Materiales y luz.** PBR sencillo; normales/AO y detalles estáticos horneados cuando convenga. Mantener reflejos metálicos dependientes de la vista para el arco. Comprobar que no parece plástico gris bajo luz plana.
4. **Exportación temprana.** Exportar un GLB de prueba y verlo con el mismo renderer, tone mapping y luces del proyecto. Blender y Three no se ven idénticos automáticamente.
5. **Acabado y optimización.** Solo después del control visual: atlas, reducción de polígonos, variantes de calidad y compresión justificada por mediciones.
6. **Entrega.** Fuente editable, modelo web, pósters, manifest, licencias y evidencia visual. El visor aislado es solo una ruta/herramienta de desarrollo; no añadirlo a la navegación pública.

Blender no estaba disponible en PATH durante la investigación. Prepararlo es un prerrequisito de la producción, no de la fase técnica de Tierra. Si no existe herramienta de modelado utilizable, entregar el blockout identificado como tal y explicar qué asset falta; no llamar render final a geometría provisional.

### Horneado y materiales: evitar trampas

- Aplicar transformaciones y revisar normales antes de exportar. Texturas de color con espacio sRGB; mapas de datos sin conversión sRGB.
- Preparar UV sin solapes para cualquier bake de iluminación. Atlas principal de 2K escritorio / 1K móvil como punto inicial; margen orientativo 16 px a 2K, ajustado a mipmaps y UV.
- La ruta inicial más segura es glTF PBR con base color, normales y AO/roughness/metalness, más luz sencilla en runtime. Hornear detalles estáticos; no hornear reflejos dependientes de cámara.
- Si se añade luz indirecta horneada, entregarla explícitamente en el manifest como textura separada, documentando intensidad y UV. Exportar la segunda UV (`TEXCOORD_1`), verificar que llega como `uv1` en Three 0.185.1 y asignar `lightMap.channel = 1`. No asumir que cualquier nodo de lightmap de Blender se convierte automáticamente a glTF.
- No mezclar un bake de iluminación completa en base color con otra iluminación runtime equivalente: puede oscurecer o iluminar dos veces la misma superficie. Para superficies deliberadamente unlit, separar el material y documentarlo.
- Procedurales, volúmenes y simulaciones de Blender deben convertirse a mapas/geometría/animaciones soportadas, o recrearse en Three. Verificar cada elemento exportado.
- Fusionar objetos estáticos por material cuando ayude, pero conservar separados tranvía, agua y nodos animados. No hornear el tranvía dentro de una textura.
- KTX2 y Meshopt son optimizaciones posteriores al piloto; probar decodificación, calidad y fallback antes de adoptarlas. Mantener los decodificadores localmente y compatibles con la versión instalada.

### Contrato de entrega

Rutas propuestas para St. Louis:

```text
art-source/st-louis/scene.blend       # fuente fuera de public
art-source/st-louis/build.py          # si el modelado se automatiza; reproducible
art-source/st-louis/README.md         # versión de Blender y exportación
public/models/cities/st-louis/scene.glb
public/models/cities/st-louis/scene-mobile.glb
public/images/cities/st-louis/poster.webp
public/images/cities/st-louis/poster-mobile.webp
public/models/cities/st-louis/LICENSES.md
src/content/city-assets.ts           # manifest tipado propuesto
```

Antes de añadir fuentes grandes a Git, revisar la política del repositorio. Si se entregan fuera de Git, dejar ubicación reproducible y checksum; no perder la fuente. No introducir Git LFS o almacenamiento externo sin necesidad demostrada.

El manifest de cada ciudad contiene: ID existente de `places.ts`, versión del asset, URLs por calidad, dimensiones/bytes, bounds, altura del landmark, nombres de nodos requeridos, puntos de cámara y mirada, posiciones de niebla, materiales especiales, texturas externas/UV si existen, pósters y procedencia/licencia de cada recurso. Cámara y nombres deben validarse al cargar, con error legible si faltan.

Convención **en runtime tras exportación glTF**: Y arriba, X horizontal, Z profundidad, raíz `CityRoot`, suelo Y=0. Blender trabaja normalmente con Z arriba: convertir mediante el exportador y verificar, no rotar dos veces. Usar unidades artísticas consistentes; St. Louis define H=40 para la altura del arco. Entregar bounding box; no asumir escala idéntica entre ciudades.

Los puntos siguientes son coordenadas artísticas iniciales, no georreferenciación. Un blockout puede ajustarlos antes de bloquear la cámara; registrar los valores finales en el manifest.

## St. Louis — piloto

**Imagen:** un arco plateado emerge de la neblina; su reflejo se rompe lentamente en el Mississippi. Tras él, el estadio aporta un pequeño núcleo cálido y rojo. La ciudad es silenciosa y extensa, no una maqueta de juguete.

Referencias: [Gateway Arch, materiales](https://www.nps.gov/jeff/planyourvisit/materials-and-techniques.htm), [proporciones y construcción](https://www.nps.gov/jeff/planyourvisit/gateway-arch-still-a-modern-engineering-marvel.htm), [Busch Stadium](https://www.mlb.com/cardinals/ballpark). Las páginas sirven para estudiar formas; no implican permiso para reutilizar sus imágenes o modelos.

### Elementos y geometría

- `Landmark_Arch`: imprescindible, centro `(0,0,0)`, altura H=40 y luz entre pies aproximadamente H. Perfil de catenaria invertida, sección triangular que se estrecha hacia la cima, acero cepillado. **No usar un torus o tubo circular.**
- `Water_River`: franja de primer plano, aproximadamente Z=35..70 y extendida en X. Superficie continua con reflejos suaves, normales animadas y bruma baja. No hace falta simulación física.
- `Landmark_Stadium`: centro inicial `(-43,0,-18)`, huella aproximada 36×28, altura 7. Gradas reconocibles y campo de béisbol con diamante, no campo rectangular de fútbol.
- `Skyline`: masas secundarias detrás, centro inicial `(-20,0,-45)`, alturas aproximadas hasta 15. Menor contraste que el arco.
- `Ground`, árboles y orilla: conectan las piezas y evitan objetos flotando sin contexto. Escena útil aproximada 180×140 unidades.

Para un blockout paramétrico del arco, usar `x ∈ [-1,1]`, `k = 2.5` inicial:

```text
X = H · x / 2
Y = H · (cosh(k) − cosh(k · x)) / (cosh(k) − 1)
Z = 0
```

Barrido triangular con unas 128 secciones; anchura orientativa desde 0.04H en bases a 0.013H arriba. Es una aproximación artística, no la reproducción exacta de la catenaria ponderada del monumento. Revisar la referencia de frente y tres cuartos antes de dar el modelo por bueno.

### Cámara y luz

Punto de llegada inicial `(90,48,110)`, reposo `(65,26,86)`, mirada alrededor de `(-5,16,0)`. Validar que se ven simultáneamente arco, río y estadio; ajustar cámara/bounds si hace falta. No aceptar esos números sin capturas. La cámara móvil debe mostrar el arco entero o un recorte claramente intencional y conservar una pista del río/estadio.

Azul profundo y violeta en el agua, horizonte cobre muy tenue, borde plateado del arco, gradas cálidas sin focos quemados. La neblina separa skyline y monumento. El único movimiento protagonista son las ondas/reflejos del río; bruma secundaria de ciclo 15–25 s. No añadir barcos o fuegos artificiales al piloto.

### Aceptación del piloto

- En una captura sin texto se reconoce St. Louis por el arco; se identifica río y estadio.
- El arco no parece una herradura de plástico ni atraviesa el campo de visión al llegar.
- La escena tiene al menos tres planos distinguibles, sin depender de bloom para esconder materiales planos.
- En el visor Three se parece a la dirección aprobada en Blender, incluyendo exposición y sombras.
- Póster y cámara 3D coinciden lo suficiente para que el fallback no dé un salto de composición.
- Funciona a dos tamaños de pantalla y dentro de los presupuestos del documento de movimiento.

## Granada — segunda validación

**Imagen:** la Alhambra, cálida y terracota, emerge entre cipreses; la Sierra aparece al fondo como una sucesión de masas azuladas y cumbres pálidas. Nubes bajas separan arquitectura y montaña.

Referencia principal: [Patronato de la Alhambra y Generalife](https://www.alhambra-patronato.es/). Composición artística condensada; no prometer un punto de vista geográfico exacto sin comprobarlo.

Obligatorio: murallas y torres con silueta reconocible de la Alcazaba, ladera con vegetación, ritmo de cipreses y Sierra en segundo/fondo. Evitar un palacio oriental genérico con cúpulas inventadas. La Sierra puede usar mallas de pocos polígonos bien iluminadas; reservar planos con textura para capas muy lejanas que no revelen su planitud durante la cámara.

Cámara: atravesar el margen de una rama/ciprés en primer plano y abrir una vista oblicua del conjunto; terminar con arquitectura completa y lectura clara. No introducir un recorrido por interiores. Acento ámbar en piedra, atmósfera malva, nieve fría; movimiento protagonista: nubes lentas entre laderas. Nodos: `Landmark_Alhambra`, `Sierra`, `Cypress`, `Ground`.

Aceptación adicional: Sierra y Alhambra se distinguen en móvil; el relieve aporta parallax; cambiar de St. Louis a Granada no exige modificar el compositor o duplicar la lógica de timeline.

## Brno — gesto animado

**Imagen:** una plaza centroeuropea a última hora, fachadas de luz suave y adoquines ligeramente reflectantes. Un tranvía rojo y crema cruza tranquilamente entre cámara y edificios.

Referencia: [guía oficial de Brno](https://www.gotobrno.cz/wp-content/uploads/2025/04/doBrna-2025_EN_web.pdf). Tomar náměstí Svobody como referencia de ambiente y forma urbana. Antes de modelar el vehículo, verificar fotografías y escoger un tranvía concreto como referencia; la investigación no certifica modelo, ruta o horario.

Obligatorio: fachadas con variación de tejados y huecos, plaza con profundidad, vías y tranvía reconocible. No llenar la escena de carteles o texto ilegible. Nodos: `Tram_Root`, `Tram_Wheels`, `Rails`, `Square`, `Facades`.

La cámara llega ligeramente elevada y desciende a una vista de tres cuartos. El tranvía cruza durante la visita, no durante el cambio entre mundos. Vincular su posición a `visitT` con una trayectoria acotada: al retroceder el scroll se recorre la animación al revés. Sin física, loop que teletransporta el vehículo ni dependencia de haber reproducido un evento anterior. En movimiento reducido se muestra detenido. Paleta: piedra fría, rojo crema y luz cálida de ventanas.

Aceptación adicional: no atraviesa edificios, postes o cámara; sus ruedas siguen las vías; un seek a mitad de visita muestra inmediatamente la posición correcta.

## Múnich — estructuras ligeras

**Imagen:** lago oscuro de Olympiapark, cubiertas tensadas casi translúcidas y, detrás, los cuatro cilindros de BMW. La arquitectura parece ligera dentro de una bruma verde grisácea.

Referencias: [Olympiapark](https://www.olympiapark.de/en/the-olympic-park/park-overview/olympic-tower), [BMW headquarters](https://www.bmwgroup.com/en/general/approach-headquarters.html), [descripción oficial de los cuatro cilindros](https://www.press.bmwgroup.com/middle-east/article/detail/T0403244EN/built-to-shape-tomorrow%3A-an-international-icon-celebrates-its-50th-birthday-karl-schwanzer-s-bmw-headquarters-as-symbol-for-a-new-era-spectacular-performance-by-us-vertical-dancers-bandaloop?language=en).

Obligatorio: cubierta ondulante con mástiles y cables, lago y silueta del edificio de cuatro cilindros. Olympiaturm puede ayudar a la lectura si no satura. Nodos: `Olympic_Roof`, `BMW_Cylinders`, `Water_Lake`, `Ground`; `Olympic_Tower` opcional.

Cámara: ascenso suave desde el borde del lago; la cubierta ocupa el plano medio y BMW se revela detrás. Evitar cables demasiado finos que parpadeen y una cubierta de cristal que multiplique transparencias. Simular transmisión si hace falta con material controlado, no perseguir físicamente cada panel. Movimiento protagonista: reflejo del lago. Acento jade tenue y metal azul frío.

Aceptación adicional: las membranas no parecen una colina sólida; BMW se distingue como cuatro cilindros, no cuatro torres separadas al azar.

## Madrid — cierre vertical

**Imagen:** cuatro siluetas altas surgen de una capa de niebla, con pequeñas ventanas cálidas. La cámara asciende y se detiene; el horizonte oscuro deja una sensación de continuación.

Referencia: [Cuatro Torres, turismo oficial de Madrid](https://www.esmadrid.com/informacion-turistica/cuatro-torres-business-area). Estudiar las cuatro siluetas por separado: coronación inclinada, volumen redondeado, estructura y hueco superior, volumen prismático/facetado. No usar cuatro extrusiones idénticas. Los nombres comerciales no son necesarios en el render.

Nodos: `Tower_01` a `Tower_04`, `Ground`, `LowCity`. Comprimir la ciudad secundaria y reducir su contraste. Recorte artístico centrado en las cuatro torres solicitadas, sin añadir otros edificios protagonistas.

Cámara: aproximación oblicua con ligera subida; las torres deben separarse en silueta y no alinearse una detrás de otra. Movimiento protagonista: niebla entre las bases. Azul violeta, ventanas ámbar y reflejos metálicos suaves. Final en reposo, sin salto a otra dimensión todavía.

Aceptación adicional: cuatro siluetas diferenciadas en escritorio y móvil; el último frame mantiene relato y navegación estables.

## Prompts de concepto opcionales, no ejecutados

Sirven para explorar una imagen objetivo antes del modelado. **No generan GLB ni demuestran viabilidad 3D.** Si se usan, guardar la imagen seleccionada junto al brief y traducir cada elemento a geometría, material o capa antes de producir.

Base común en inglés:

> Art direction frame for an original cinematic 3D portfolio environment. A dreamlike memory of [CITY], recognizable architecture, carefully composed foreground, midground and distant atmosphere. Blue hour, near-black background, soft violet mist, restrained warm accents, realistic material response with subtly stylized forms. Quiet, spacious, mysterious. Wide oblique camera view, dark low-detail negative space on the left for a separate HTML story, main landmark center-right. No typography, no interface, no logos, no neon cyberpunk, no toy-like low-poly blocks. The scene must be feasible as a lightweight real-time 3D diorama.

| Ciudad | Añadir a la base |
| --- | --- |
| St. Louis | Tapered triangular stainless-steel Gateway Arch, Mississippi reflections in the foreground, a recognizable baseball stadium with red seating behind, distant subdued skyline. |
| Granada | Terracotta Alhambra walls and Alcazaba towers on a wooded slope, cypress silhouettes in the foreground, layered Sierra Nevada peaks and low clouds behind. |
| Brno | Central European square inspired by náměstí Svobody, articulated facade rhythm, cobbled tram tracks, a red-and-cream tram crossing the plaza. |
| Múnich | Olympiapark lake and tensile membrane roofs with masts, BMW four-cylinder headquarters in the background, pale jade mist and cool metal. |
| Madrid | Four distinct Madrid business-district tower silhouettes rising through violet-blue ground fog, sparse warm windows, elegant vertical composition. |

Para móvil pedir una composición vertical independiente, monumento en los dos tercios superiores y espacio oscuro abajo. No recortar automáticamente el concepto horizontal.
