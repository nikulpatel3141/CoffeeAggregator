'use client'

import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'

interface Coffee {
  name: string
  roaster: string
  origin?: string
  region?: string
  tasting_notes: string[]
  price?: string
  url: string
  in_stock: boolean
  scraped_at: string
}

interface RegionData {
  name: string
  position: LatLngExpression
  coffees: Coffee[]
}

interface CoffeeMapProps {
  coffees: Coffee[]
}

// Map coffee origins/regions to geographic coordinates
const regionCoordinates: Record<string, LatLngExpression> = {
  'Ethiopia': [9.145, 40.4897],
  'Kenya': [0.0236, 37.9062],
  'Colombia': [4.5709, -74.2973],
  'Brazil': [-14.235, -51.9253],
  'Costa Rica': [9.7489, -83.7534],
  'Guatemala': [15.7835, -90.2308],
  'Rwanda': [-1.9403, 29.8739],
  'Burundi': [-3.3731, 29.9189],
  'Peru': [-9.19, -75.0152],
  'Honduras': [15.2, -86.2419],
  'El Salvador': [13.7942, -88.8965],
  'Nicaragua': [12.8654, -85.2072],
  'Panama': [8.538, -80.7821],
  'Mexico': [23.6345, -102.5528],
  'Indonesia': [-0.7893, 113.9213],
  'Papua New Guinea': [-6.314993, 143.95555],
  'Yemen': [15.552727, 48.516388],
  'Tanzania': [-6.369028, 34.888822],
  'Uganda': [1.373333, 32.290275],
  // Generic regions
  'Africa': [1.0, 20.0],
  'South America': [-8.7832, -55.4915],
  'Central America': [12.7690, -85.6024],
  'Asia': [34.0479, 100.6197],
}

export default function CoffeeMap({ coffees }: CoffeeMapProps) {
  const centerPosition: LatLngExpression = [20, 0] // Center on equator for coffee belt

  // Group coffees by region
  const regionData: RegionData[] = Object.entries(
    coffees.reduce((acc, coffee) => {
      const region = coffee.region || coffee.origin || 'Unknown'
      if (!acc[region]) {
        acc[region] = []
      }
      acc[region].push(coffee)
      return acc
    }, {} as Record<string, Coffee[]>)
  ).map(([name, coffees]) => ({
    name,
    position: regionCoordinates[name] || [0, 0],
    coffees,
  })).filter(region => region.position[0] !== 0 || region.position[1] !== 0)

  useEffect(() => {
    // Fix for Leaflet default icon issue in Next.js
    if (typeof window !== 'undefined') {
      const L = require('leaflet')
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
    }
  }, [])

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={centerPosition}
        zoom={2}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {regionData.map((region, idx) => (
          <CircleMarker
            key={idx}
            center={region.position}
            radius={Math.min(10 + region.coffees.length * 2, 30)}
            fillColor="#d97706"
            color="#92400e"
            weight={2}
            opacity={0.8}
            fillOpacity={0.6}
          >
            <Popup maxWidth={300}>
              <div className="p-2">
                <h3 className="font-bold text-lg text-amber-900 mb-2">{region.name}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {region.coffees.length} coffee{region.coffees.length !== 1 ? 's' : ''} available
                </p>
                <div className="max-h-48 overflow-y-auto">
                  {region.coffees.slice(0, 5).map((coffee, i) => (
                    <div key={i} className="mb-2 pb-2 border-b border-gray-200 last:border-b-0">
                      <p className="font-semibold text-sm">{coffee.name}</p>
                      <p className="text-xs text-gray-600">{coffee.roaster}</p>
                      {coffee.price && (
                        <p className="text-xs text-amber-700 font-medium">{coffee.price}</p>
                      )}
                    </div>
                  ))}
                  {region.coffees.length > 5 && (
                    <p className="text-xs text-gray-500 italic">
                      +{region.coffees.length - 5} more...
                    </p>
                  )}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
