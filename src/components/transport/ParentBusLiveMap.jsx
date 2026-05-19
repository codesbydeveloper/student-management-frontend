import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { OSM_TILE_ATTRIBUTION, OSM_TILE_LAYER_URL } from '../../modules/transport/transportMapConstants'
import { getBusMapIcon } from '../../modules/transport/transportBusMapIcon'

function MapFollowPosition({ center }) {
  const map = useMap()
  useEffect(() => {
    if (!center?.length) return
    map.panTo(center, { animate: true })
  }, [center, map])
  return null
}

/**
 * React Leaflet + OpenStreetMap (SOW parent map). No Google Maps.
 * @param {{ position: [number, number], routeLine?: [number, number][], label?: string, className?: string }} props
 */
export function ParentBusLiveMap({ position, routeLine = [], label = 'Bus', className = '' }) {
  const line = routeLine.length >= 2 ? routeLine : []
  const busIcon = useMemo(() => getBusMapIcon(), [])

  return (
    <div className={`space-y-1.5 ${className}`}>
      <MapContainer
        center={position}
        zoom={15}
        className="z-0 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
        style={{ minHeight: 'min(50vh, 22rem)' }}
        scrollWheelZoom
        aria-label="Map showing bus location"
      >
        <TileLayer attribution={OSM_TILE_ATTRIBUTION} url={OSM_TILE_LAYER_URL} />
        {line.length ? (
          <Polyline positions={line} pathOptions={{ color: '#6366f1', weight: 4, opacity: 0.75 }} />
        ) : null}
        <Marker position={position} icon={busIcon} keyboard={false} riseOnHover>
          <Tooltip direction="top" opacity={0.95}>
            {label}
          </Tooltip>
        </Marker>
        <MapFollowPosition center={position} />
      </MapContainer>
    </div>
  )
}
