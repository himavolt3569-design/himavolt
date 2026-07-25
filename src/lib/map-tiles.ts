/**
 * One source of truth for Leaflet basemap tiles.
 *
 * Every map must use these. Pointing a production map at
 * `tile.openstreetmap.org` breaches the OSM Foundation's tile usage policy —
 * those servers are donated infrastructure for editing and light use, not a CDN
 * for a commercial app, and heavy traffic gets blocked. CARTO's basemaps are
 * built on the same OpenStreetMap data and are free to use at this scale.
 *
 * Attribution is legally required for both, so it ships alongside the URL rather
 * than being something each caller has to remember.
 */

export const MAP_TILE_URL_LIGHT =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

export const MAP_TILE_URL_DARK =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const MAP_MAX_ZOOM = 20;

/** Tile URL for the active theme. */
export function tileUrlFor(theme: string | undefined): string {
  return theme === "dark" ? MAP_TILE_URL_DARK : MAP_TILE_URL_LIGHT;
}

/** Spread straight into `L.tileLayer(url, { ... })`. */
export const MAP_TILE_OPTIONS = {
  maxZoom: MAP_MAX_ZOOM,
  attribution: MAP_TILE_ATTRIBUTION,
} as const;
