'use client'

import { Map, Marker, Overlay } from 'pigeon-maps'
import { useState } from 'react'

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
  position: [number, number]
  coffees: Coffee[]
}

interface CoffeeMapProps {
  coffees: Coffee[]
}

// Map coffee origins/regions to geographic coordinates
const regionCoordinates: Record<string, [number, number]> = {
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
  'India': [20.5937, 78.9629],
  'Vietnam': [14.0583, 108.2772],
  'Jamaica': [18.1096, -77.2975],
  'Bolivia': [-16.2902, -63.5887],
  'Ecuador': [-1.8312, -78.1834],
  // Generic regions
  'Africa': [1.0, 20.0],
  'South America': [-8.7832, -55.4915],
  'Central America': [12.7690, -85.6024],
  'Asia': [34.0479, 100.6197],
}

export default function CoffeeMap({ coffees }: CoffeeMapProps) {
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null)

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

  return (
    <div className="w-full h-full rounded-lg overflow-hidden">
      <Map
        defaultCenter={[20, 0]}
        defaultZoom={2}
        mouseEvents={true}
        touchEvents={true}
      >
        {regionData.map((region, idx) => (
          <Marker
            key={idx}
            anchor={region.position}
            onClick={() => setSelectedRegion(region)}
          />
        ))}

        {selectedRegion && (
          <Overlay anchor={selectedRegion.position} offset={[120, 79]}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-xs border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSelectedRegion(null)}
                className="float-right text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
              <h3 className="font-bold text-lg text-amber-900 dark:text-amber-400 mb-2">
                {selectedRegion.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                {selectedRegion.coffees.length} coffee{selectedRegion.coffees.length !== 1 ? 's' : ''} available
              </p>
              <div className="max-h-48 overflow-y-auto">
                {selectedRegion.coffees.slice(0, 5).map((coffee, i) => (
                  <div key={i} className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{coffee.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{coffee.roaster}</p>
                    {coffee.price && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">{coffee.price}</p>
                    )}
                  </div>
                ))}
                {selectedRegion.coffees.length > 5 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    +{selectedRegion.coffees.length - 5} more...
                  </p>
                )}
              </div>
            </div>
          </Overlay>
        )}
      </Map>
    </div>
  )
}
