'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import CoffeeFilters, { CoffeeFilterValues } from '@/components/CoffeeFilters'
import SubscriptionsTab from '@/components/SubscriptionsTab'
import ReadmeTab from '@/components/ReadmeTab'

// Dynamically import map component to avoid SSR issues with Leaflet
const CoffeeMap = dynamic(() => import('@/components/CoffeeMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />,
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

// Map country names to flag emojis
const getCountryFlag = (country?: string): string => {
  if (!country) return ''

  const flagMap: { [key: string]: string } = {
    'Ethiopia': '🇪🇹',
    'Kenya': '🇰🇪',
    'Colombia': '🇨🇴',
    'Brazil': '🇧🇷',
    'Guatemala': '🇬🇹',
    'Costa Rica': '🇨🇷',
    'Peru': '🇵🇪',
    'Honduras': '🇭🇳',
    'El Salvador': '🇸🇻',
    'Nicaragua': '🇳🇮',
    'Panama': '🇵🇦',
    'Mexico': '🇲🇽',
    'Rwanda': '🇷🇼',
    'Burundi': '🇧🇮',
    'Tanzania': '🇹🇿',
    'Uganda': '🇺🇬',
    'Yemen': '🇾🇪',
    'Indonesia': '🇮🇩',
    'India': '🇮🇳',
    'Vietnam': '🇻🇳',
    'Papua New Guinea': '🇵🇬',
    'Jamaica': '🇯🇲',
    'Bolivia': '🇧🇴',
    'Ecuador': '🇪🇨',
  }

  return flagMap[country] || '🌍'
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
    maxPrice: 0, // Will be set when data loads
    tastingNotes: '',
  })
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [activeTab, setActiveTab] = useState<'coffees' | 'subscriptions' | 'readme'>('coffees')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [regionFilterCollapsed, setRegionFilterCollapsed] = useState(true)

  useEffect(() => {
    fetchCoffees()
    // Check for saved theme preference or system preference
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    setIsDarkMode(shouldBeDark)
    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  // Update max price filter when data loads
  useEffect(() => {
    if (maxPrice > 0 && filters.maxPrice === 0) {
      setFilters(prev => ({ ...prev, maxPrice }))
    }
  }, [maxPrice, filters.maxPrice])

  const toggleDarkMode = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    if (newMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const fetchCoffees = async () => {
    try {
      setLoading(true)
      // Fetch from static JSON file generated at build time
      const response = await fetch('/data/coffees.json')

      if (!response.ok) {
        throw new Error('Failed to fetch coffees')
      }

      const data = await response.json()
      setCoffees(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching coffees:', err)
      setError('Failed to load coffees. The data file might not be generated yet.')
      setCoffees([])
    } finally {
      setLoading(false)
    }
  }

  // Extract unique roasters, regions, and max price for filter dropdowns
  const { roasters, regions, maxPrice } = useMemo(() => {
    const roasterSet = new Set<string>()
    const regionSet = new Set<string>()
    let calculatedMaxPrice = 0

    coffees.forEach((coffee) => {
      roasterSet.add(coffee.roaster)
      if (coffee.region) regionSet.add(coffee.region)
      if (coffee.origin) regionSet.add(coffee.origin)

      // Calculate max price
      if (coffee.price) {
        const price = parseFloat(coffee.price.replace(/[^0-9.]/g, ''))
        if (!isNaN(price) && price > calculatedMaxPrice) {
          calculatedMaxPrice = price
        }
      }
    })

    return {
      roasters: Array.from(roasterSet).sort(),
      regions: Array.from(regionSet).sort(),
      maxPrice: Math.ceil(calculatedMaxPrice) || 100, // Round up, default to 100 if no prices
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
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-900 dark:to-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-5xl font-bold text-amber-900 dark:text-amber-400 mb-2">
                UK Specialty Coffee Tracker
              </h1>
              <p className="text-gray-700 dark:text-gray-300 text-lg">
                Discover specialty coffee from top UK roasters, visualized by origin region
              </p>
            </div>
            <button
              onClick={toggleDarkMode}
              className="p-3 rounded-full bg-white dark:bg-gray-700 shadow-lg hover:shadow-xl transition-all"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-6 border-b border-gray-300 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('coffees')}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === 'coffees'
                  ? 'border-b-2 border-amber-600 text-amber-700 dark:text-amber-400 dark:border-amber-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400'
              }`}
            >
              Coffee List
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === 'subscriptions'
                  ? 'border-b-2 border-amber-600 text-amber-700 dark:text-amber-400 dark:border-amber-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400'
              }`}
            >
              Subscriptions
            </button>
            <button
              onClick={() => setActiveTab('readme')}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === 'readme'
                  ? 'border-b-2 border-amber-600 text-amber-700 dark:text-amber-400 dark:border-amber-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400'
              }`}
            >
              About
            </button>
          </div>
        </header>

        {/* Coffee List Tab */}
        {activeTab === 'coffees' && (
          <>
            {/* Filters */}
            <CoffeeFilters
              onFilterChange={setFilters}
              roasters={roasters}
              regions={regions}
              maxPrice={maxPrice}
              regionFilterCollapsed={regionFilterCollapsed}
              onToggleRegionFilter={() => setRegionFilterCollapsed(!regionFilterCollapsed)}
            />

            {/* View Toggle */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    viewMode === 'map'
                      ? 'bg-amber-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Map View
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-amber-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  List View
                </button>
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                Showing <span className="font-semibold text-amber-700 dark:text-amber-400">{filteredCoffees.length}</span> of{' '}
                <span className="font-semibold text-amber-700 dark:text-amber-400">{coffees.length}</span> coffees
              </p>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 dark:border-amber-400 mx-auto"></div>
                <p className="mt-4 text-gray-700 dark:text-gray-300">Loading coffees...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                <p className="text-red-800 dark:text-red-300">{error}</p>
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
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <p className="text-gray-600 dark:text-gray-400">
                      No coffees found matching your filters. Try adjusting your search criteria.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCoffees.map((coffee, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow border border-transparent dark:border-gray-700"
                      >
                        <h3 className="text-xl font-semibold text-amber-900 dark:text-amber-400 mb-2">
                          {coffee.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-2 font-medium">{coffee.roaster}</p>
                        {(coffee.origin || coffee.region) && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                            Origin: {coffee.region || coffee.origin}
                            <span className="ml-1">{getCountryFlag(coffee.origin || coffee.region)}</span>
                          </p>
                        )}
                        {coffee.tasting_notes.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tasting Notes:</p>
                            <div className="flex flex-wrap gap-2">
                              {coffee.tasting_notes.map((note, i) => (
                                <span
                                  key={i}
                                  className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs px-2 py-1 rounded"
                                >
                                  {note}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {coffee.price && (
                          <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-3">{coffee.price}</p>
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
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">In Stock</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && <SubscriptionsTab />}

        {/* README Tab */}
        {activeTab === 'readme' && <ReadmeTab />}
      </div>
    </main>
  )
}
