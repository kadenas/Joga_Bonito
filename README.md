# Astillero Idle

Astillero Idle es un idle clicker web optimizado para dispositivos móviles. Remacha cascos, compra mejoras y activa la Marea viva para duplicar la producción del astillero.

## Ejecutar el proyecto

El juego está construido con HTML, CSS y JavaScript sin bundlers. Para servirlo basta con un servidor estático.

### Servidor rápido con Python

```bash
python -m http.server 8080
```

Abre <http://localhost:8080/public/index.html> en tu navegador.

### Servir con Nginx u otro servidor

Configura el directorio raíz apuntando a la carpeta `public/` del repositorio. Asegúrate de servir `/index.html`, los módulos de `/src/*.js` y `/sw.js` en la raíz pública y habilitar `Service-Worker-Allowed` si cambias la estructura.

## Instalación como PWA

1. Abre la aplicación en un navegador compatible (Chrome, Edge, Firefox Android).
2. Acepta el aviso "Añadir a pantalla de inicio" o usa el menú del navegador para instalarla.
3. El manifest y el service worker permiten ejecutar el juego offline una vez cargado.

## Guardado y migración de progreso

- El juego realiza un guardado automático cada 10 segundos y al cerrar la pestaña.
- Usa **Exportar progreso** para copiar un JSON con tu partida.
- Para restaurarla, pulsa **Importar progreso**, pega el JSON y confirma.
- El archivo incluye un campo de versión para facilitar migraciones futuras.

## Estructura del proyecto

```
public/
  index.html        # Entrada principal con layout y registro del service worker
  manifest.webmanifest
  sw.js             # Service worker cache-first
  src/
    main.js         # Bucle principal, estado y lógica del juego
    ui.js           # Renderizado y eventos de interfaz
    audio.js        # Síntesis WebAudio y control de audio
    save.js         # Guardado local, autosave y exportación
    balance.js      # Definición de mejoras y fórmulas
assets/
  README.txt        # Información sobre futuros assets
```

## Capa visual (Dársena)

La sección **DÁRSENA** del `index.html` añade una representación tipo idle game de la actividad del astillero. Los elementos visuales son SVG inline reutilizados mediante símbolos definidos en `#sprite-defs`, evitando la carga de binarios externos y permitiendo animaciones ligeras.

- **Barcos en reparación**: aparece un barco por cada 5 niveles combinados de todas las mejoras (`Math.floor(total / 5)`), con un máximo de 20 unidades.
- **Aprendices**: muestra un obrero por nivel de la mejora `aprendices`.
- **Grúas y equipo**: genera una grúa por cada 3 niveles sumados entre `equipo de remachado` y `capataz veterano` (`Math.floor((equipo + capataz) / 3)`).

Las cifras se calculan en `getTotalsForVisuals` (`public/src/main.js`), apoyándose en el helper `getUpgradeLevel` de `public/src/balance.js`. Cada carril es horizontalmente desplazable en pantallas pequeñas y cuenta con un fondo animado de agua, mientras que el panel lateral **Resumen del astillero** muestra los totales sincronizados. Para extender la Dársena añade nuevos símbolos SVG y usa `renderTokens` en `public/src/ui.js` para pintar las filas sin repintados completos.

## UI móvil

- La barra inferior fija agrupa la activación de **Marea viva**, un acceso rápido a la tienda y un acceso directo a los ajustes, respetando las `view-inset`/`safe-area` para no superponer controles del dispositivo.
- El botón de tap se ha sustituido por un barco SVG grande dentro del HUD. Al tocarlo cabecea con más fuerza, ejecuta `doTap()` y lanza partículas naranjas que simulan remaches sin usar imágenes externas.
- La Dársena y la Tienda se presentan como acordeones (`<details>`) con la Dársena plegada por defecto en móviles. El contenido de la tienda permanece abierto por accesibilidad.
- Las partículas y el layout mantienen un enfoque mobile-first con tamaños fluidos (`clamp()`) y animaciones CSS puras.

## Desbloqueos por Jornales/s

Algunas mejoras de la tienda permanecen ocultas hasta que la producción automática alcanza un umbral de **Jornales por segundo (J/s)**. Cada entrada de `upgradesDef` admite un campo opcional `unlockJps`; si el jugador no llega al valor, la carta se oculta. Cuando se supera el 80 % del requisito aparece un placeholder gris con un candado y el texto “Desbloquea al alcanzar X J/s” para avisar que el desbloqueo está cerca.

Los desbloqueos actuales son:

- `equipo`: visible a partir de 10 J/s.
- `capataz`: visible a partir de 25 J/s.
- `dique`: visible a partir de 60 J/s.

## Logros y recompensas

El estado del juego incluye `state.achievements`, con dos bloques:

- `claimed`: mapa de logros ya reclamados (`true`).
- `progress`: contadores acumulados (`taps`, `totalJornales`, `maxJps`, `compras`, `barcos`).

Los logros se definen en `public/src/balance.js` mediante `achievementsDef`, cada uno con título, descripción, condición (`cond`) y recompensa (`reward`). Las condiciones disponibles son:

- `taps`: cantidad total de toques manuales.
- `maxJps`: máximo histórico de Jornales/s.
- `compras`: total de compras realizadas en la tienda.
- `barcos`: número de barcos simultáneos en la dársena (derivado de `getTotalsForVisuals`).

Cuando se cumple una condición, aparece un banner superior con sonido armónico y botón **Reclamar**. Al pulsarlo se aplican dos tipos de recompensa:

- `flat`: añade jornales inmediatos a la reserva actual.
- `mult`: incrementa un multiplicador permanente (`state.bonus.permaMult`), que afecta a los jornales ganados por tap y a los J/s pasivos. Si es mayor que 1 se muestra en el HUD con formato `x1.05`, `x1.10`, etc.

El panel **Logros** (debajo de la tienda) lista todas las metas, señalando si están bloqueadas, listas para reclamar o ya reclamadas.

## Rendimiento y futuras mejoras

- La UI se actualiza usando `requestAnimationFrame`, mientras el cálculo lógico ocurre cada 100 ms para mantener el consumo reducido.
- Todos los recursos actuales son texto; para añadir iconos PNG o audio externo colócalos en `assets/` y actualiza el service worker.
- El audio está sintetizado con WebAudio y se puede desactivar desde los ajustes.
- Para ampliar el juego, añade nuevas mejoras en `balance.js` y extiende la lógica de `ui.js` si se necesitan nuevas vistas.
