# Click2Cash
Extensión de navegador que convierte montos monetarios visibles en una página, similar a “Traducir página” pero para monedas. Al activarla desde el icono, detecta precios con símbolos comunes y agrega la conversión en tu moneda local o preferida entre paréntesis.

Ejemplo:
22€ → 22€ (CLP $22.500)

## Características
- Conversión bajo demanda: solo cuando el usuario hace clic en el icono.
- WebExtension compatible con Chrome/Edge/Brave y Firefox.
- Detección de símbolos: €, $, £, ¥.
- No rompe el layout: agrega el valor convertido como anotación.
- Persistencia de moneda preferida usando almacenamiento del navegador.
- Permisos mínimos: activeTab, scripting, storage.

## Instalación (sin publicar)
1. Abre la página de extensiones del navegador.
2. Activa el modo desarrollador.
3. Carga la carpeta del proyecto como extensión sin empaquetar.

## Uso
1. Abre cualquier página con precios visibles.
2. Haz clic en el icono de Click2Cash.
3. Elige la moneda destino si quieres cambiarla.
4. Presiona “Convert current page”.

## Configuración
La extensión detecta la moneda por IP con un endpoint público y guarda una preferencia local. Puedes cambiar la moneda objetivo desde el popup.

Endpoints usados (placeholders):
- Geolocalización: https://ipapi.co/json/
- Tasas de cambio: https://open.er-api.com/v6/latest/USD

## Estructura del proyecto
- manifest.json
- background.js
- content.js
- popup.html
- popup.js
- styles.css
- utils/currency.js
- utils/domScanner.js

## Notas
- Solo se escanean nodos de texto visibles.
- Se evita procesar inputs, scripts y estilos.
- La conversión se agrega una sola vez para evitar duplicados.
