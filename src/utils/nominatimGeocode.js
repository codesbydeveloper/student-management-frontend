const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const USER_AGENT = 'SchoolManagementSuite/1.0 (transport pickup points)'

/** Build search string for map lookup from stop fields. */
export function buildPickupGeocodeQuery({ name, location, city, state }) {
  return [name, location, city, state].map((s) => String(s ?? '').trim()).filter(Boolean).join(', ')
}

/**
 * Forward geocode address → { lat, lng, displayName } (OpenStreetMap Nominatim, no Google).
 */
export async function geocodeAddress(query) {
  const q = String(query ?? '').trim()
  if (!q) return { ok: false, error: 'Enter a location to search.' }

  try {
    const params = new URLSearchParams({ format: 'json', limit: '1', q })
    const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !Array.isArray(data) || !data.length) {
      return { ok: false, error: 'Location not found on map. Try a different name or click the map.' }
    }
    const hit = data[0]
    const lat = Number(hit.lat)
    const lng = Number(hit.lon ?? hit.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ok: false, error: 'Invalid coordinates from search.' }
    }
    return {
      ok: true,
      lat,
      lng,
      displayName: String(hit.display_name ?? '').trim() || q,
    }
  } catch {
    return { ok: false, error: 'Could not reach map search. Check your connection.' }
  }
}

/**
 * Reverse geocode coordinates → short place label.
 */
export async function reverseGeocode(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: 'Invalid coordinates.' }
  }
  try {
    const params = new URLSearchParams({
      format: 'json',
      lat: String(lat),
      lon: String(lng),
    })
    const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data || typeof data !== 'object') {
      return { ok: false, error: 'Could not resolve address for this point.' }
    }
    const name = String(data.display_name ?? '').trim()
    return { ok: true, displayName: name }
  } catch {
    return { ok: false, error: 'Could not reach map search.' }
  }
}
