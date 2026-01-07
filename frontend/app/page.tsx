'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import CoffeeFilters, { CoffeeFilterValues } from '@/components/CoffeeFilters'

// Dynamically import map component to avoid SSR issues with Leaflet
const CoffeeMap = dynamic(() => import('@/components/CoffeeMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-gray-100 rounded-lg animate-pulse" />,
})

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

export default function Home() {
  const [coffees, setCoffees] = useState<Coffee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<CoffeeFilterValues>({
    search: '',
    roaster: '',
    region: '',
    minPrice: 0,
    maxPrice: 100,
    tastingNotes: '',
  })
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')

  useEffect(() => {
    fetchCoffees()
  }, [])

  const fetchCoffees = async () => {
    try {
      setLoading(true)
      // Get API URL from environment or construct from window location
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ||
                    (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8080` : '')

      const response = await fetch(`${apiUrl}/api/coffees`)

      if (!response.ok) {
        throw new Error('Failed to fetch coffees')
      }

      const data = await response.json()
      setCoffees(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching coffees:', err)
      setError('Failed to load coffees. The scraper might not have run yet.')
      // Set some mock data for development
      setCoffees([])
    } finally {
      setLoading(false)
    }
  }

  // Extract unique roasters and regions for filter dropdowns
  const { roasters, regions } = useMemo(() => {
    const roasterSet = new Set<string>()
    const regionSet = new Set<string>()

    coffees.forEach((coffee) => {
      roasterSet.add(coffee.roaster)
      if (coffee.region) regionSet.add(coffee.region)
      if (coffee.origin) regionSet.add(coffee.origin)
    })

    return {
      roasters: Array.from(roasterSet).sort(),
      regions: Array.from(regionSet).sort(),
    }
  }, [coffees])

  // Apply filters to coffees
  const filteredCoffees = useMemo(() => {
    return coffees.filter((coffee) => {
      // Search filter
      if (filters.search && !coffee.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }

      // Roaster filter
      if (filters.roaster && coffee.roaster !== filters.roaster) {
        return false
      }

      // Region filter
      if (filters.region) {
        const matchesRegion = coffee.region === filters.region || coffee.origin === filters.region
        if (!matchesRegion) return false
      }

      // Price filter
      if (coffee.price) {
        const price = parseFloat(coffee.price.replace(/[^0-9.]/g, ''))
        if (!isNaN(price)) {
          if (price < filters.minPrice || price > filters.maxPrice) {
            return false
          }
        }
      }

      // Tasting notes filter
      if (filters.tastingNotes) {
        const hasMatchingNote = coffee.tasting_notes.some((note) =>
          note.toLowerCase().includes(filters.tastingNotes.toLowerCase())
        )
        if (!hasMatchingNote) return false
      }

      return true
    })
  }, [coffees, filters])

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-5xl font-bold text-amber-900 mb-2">
            UK Specialty Coffee Tracker
          </h1>
          <p className="text-gray-600 text-lg">
            Discover specialty coffee from top UK roasters, visualized by origin region
          </p>
        </header>

        {/* Filters */}
        <CoffeeFilters
          onFilterChange={setFilters}
          roasters={roasters}
          regions={regions}
        />

        {/* View Toggle */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Map View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              List View
            </button>
          </div>
          <p className="text-gray-600">
            Showing <span className="font-semibold text-amber-900">{filteredCoffees.length}</span> of{' '}
            <span className="font-semibold text-amber-900">{coffees.length}</span> coffees
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading coffees...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchCoffees}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Map View */}
        {!loading && !error && viewMode === 'map' && (
          <div className="mb-8">
            <CoffeeMap coffees={filteredCoffees} />
          </div>
        )}

        {/* List View */}
        {!loading && !error && viewMode === 'list' && (
          <div>
            {filteredCoffees.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-600">
                  No coffees found matching your filters. Try adjusting your search criteria.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCoffees.map((coffee, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <h3 className="text-xl font-semibold text-amber-900 mb-2">
                      {coffee.name}
                    </h3>
                    <p className="text-gray-600 mb-2 font-medium">{coffee.roaster}</p>
                    {(coffee.origin || coffee.region) && (
                      <p className="text-sm text-gray-500 mb-3">
                        Origin: {coffee.region || coffee.origin}
                      </p>
                    )}
                    {coffee.tasting_notes.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Tasting Notes:</p>
                        <div className="flex flex-wrap gap-2">
                          {coffee.tasting_notes.map((note, i) => (
                            <span
                              key={i}
                              className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded"
                            >
                              {note}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {coffee.price && (
                      <p className="text-lg font-bold text-amber-600 mb-3">{coffee.price}</p>
                    )}
                    <div className="flex gap-2 items-center">
                      <a
                        href={coffee.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 transition-colors"
                      >
                        View Coffee
                      </a>
                      {coffee.in_stock && (
                        <span className="text-xs text-green-600 font-medium">In Stock</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
