/**
 * WardData.ts
 * 
 * Normalized ward data types and property extraction for the multi-city ward layer.
 * Handles the differing property schemas across Mumbai, Pune, and Navi Mumbai.
 */

export interface NormalizedWardProperties {
  wardId: string;
  wardName: string;
  wardCode: string;
  city: string;
}

/**
 * City-specific color configuration for boundary rendering.
 * Each city gets a distinct color so they don't visually blend at borders.
 */
export const CITY_COLORS = {
  mumbai: {
    outline: { r: 0.23, g: 0.51, b: 0.96, a: 0.85 },  // #3B82F6 Blue
    fill: { r: 0.23, g: 0.51, b: 0.96, a: 0.01 },       // Near-transparent for terrain draping
    fillActive: { r: 0.23, g: 0.51, b: 0.96, a: 0.15 },  // Glowing ground, lets buildings punch through
    highlight: { r: 0.4, g: 0.65, b: 1.0, a: 0.4 },      // Hover highlight
    label: '#3B82F6',
  },
} as const;

/**
 * City center coordinates for camera fly-to.
 */
export const CITY_CENTERS = {
  mumbai: { lng: 72.8777, lat: 19.076, altitude: 3000 },
} as const;

/**
 * Extracts normalized ward properties from an entity's raw properties.
 * Used by WardLayer when processing entities after GeoJsonDataSource loads.
 * 
 * The API route normalizer already injects ward_id, ward_name, ward_code, city
 * into the GeoJSON properties. This function reads those normalized fields.
 */
export function extractNormalizedProperties(rawProps: Record<string, any>, cityHint: string = 'mumbai'): NormalizedWardProperties {
  if (rawProps?.ward_id && rawProps.ward_id !== 'unknown') {
    return {
      wardId: String(rawProps.ward_id),
      wardName: String(rawProps.ward_name || rawProps.ward_id),
      wardCode: String(rawProps.ward_code || rawProps.ward_id),
      city: String(rawProps.city || cityHint),
    };
  }

  return normalizeWardProperties(cityHint, rawProps);
}

/**
 * Normalizer for raw and pre-normalized properties across Mumbai.
 */
export function normalizeWardProperties(city: string, rawProperties: any): NormalizedWardProperties {
  if (rawProperties?.ward_id && rawProperties.ward_id !== 'unknown') {
    return {
      wardId: String(rawProperties.ward_id),
      wardName: String(rawProperties.ward_name || rawProperties.ward_id),
      wardCode: String(rawProperties.ward_code || rawProperties.ward_id),
      city: String(rawProperties.city || city),
    };
  }

  const rawName = (rawProperties?.NAME2 || rawProperties?.Name || rawProperties?.ward || rawProperties?.WARD || rawProperties?.name || 'Unknown').toString().trim();
  const wardCode = rawName;
  const wardName = rawName;
  const wardId = rawName; // Primary key matches canonical ward code (e.g. "T", "K/W", "A", "D")

  return { wardId, wardName, wardCode, city: 'mumbai' };
}
