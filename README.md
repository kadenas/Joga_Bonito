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

Configura el directorio raíz apuntando a la carpeta del repositorio. Asegúrate de servir `index.html`, los módulos de `src/`, `sw.js` en la raíz y habilitar `Service-Worker-Allowed` si cambias la estructura.

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
src/
  main.js           # Bucle principal, estado y lógica del juego
  ui.js             # Renderizado y eventos de interfaz
  audio.js          # Síntesis WebAudio y control de audio
  save.js           # Guardado local, autosave y exportación
  balance.js        # Definición de mejoras y fórmulas
  sw.js             # Service worker cache-first
assets/
  README.txt        # Información sobre futuros assets
```

## Capa visual (Dársena)

La sección **Dársena** del `index.html` añade una representación tipo idle game de la actividad del astillero. Los elementos visuales son SVG inline reutilizados mediante símbolos definidos en `#sprite-defs`, evitando la carga de binarios externos.

- **Barcos en reparación**: aparece un barco por cada 5 niveles combinados de mejoras, hasta 20.
- **Aprendices**: muestra un obrero por nivel de la mejora `aprendices`.
- **Grúas y equipo**: genera una grúa por cada 3 niveles sumados entre `equipo de remachado` y `capataz veterano`.

Cada carril es horizontalmente desplazable en pantallas pequeñas y cuenta con un fondo animado de agua. El panel lateral **Resumen del astillero** resume los totales con contadores sincronizados. Para extender la Dársena añade nuevos símbolos SVG y usa `renderTokens` en `src/ui.js` para pintar las filas sin repintados completos.

## Rendimiento y futuras mejoras

- La UI se actualiza usando `requestAnimationFrame`, mientras el cálculo lógico ocurre cada 100 ms para mantener el consumo reducido.
- Todos los recursos actuales son texto; para añadir iconos PNG o audio externo colócalos en `assets/` y actualiza el service worker.
- El audio está sintetizado con WebAudio y se puede desactivar desde los ajustes.
- Para ampliar el juego, añade nuevas mejoras en `balance.js` y extiende la lógica de `ui.js` si se necesitan nuevas vistas.
