'use client'

import { useEffect, useState, useMemo } from 'react'
import CoffeeFilters, { CoffeeFilterValues } from '@/components/CoffeeFilters'
import CoffeeMap from '@/components/CoffeeMap'
import SubscriptionsTab from '@/components/SubscriptionsTab'
import ReadmeTab from '@/components/ReadmeTab'

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
  const [activeTab, setActiveTab] = useState<'coffees' | 'subscriptions' | 'readme'>('coffees')
  const [isDarkMode, setIsDarkMode] = useState(false)

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

  // Extract unique roasters, regions, max price, and tasting notes for filter dropdowns
  const { roasters, regions, maxPrice, tastingNotes } = useMemo(() => {
    const roasterSet = new Set<string>()
    const regionSet = new Set<string>()
    const tastingNotesSet = new Set<string>()
    let calculatedMaxPrice = 0

    coffees.forEach((coffee) => {
      roasterSet.add(coffee.roaster)
      if (coffee.region) regionSet.add(coffee.region)
      if (coffee.origin) regionSet.add(coffee.origin)

      // Collect all tasting notes
      coffee.tasting_notes.forEach(note => {
        if (note) tastingNotesSet.add(note.toLowerCase())
      })

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
      tastingNotes: Array.from(tastingNotesSet).sort(),
    }
  }, [coffees])

  // Update max price filter when data loads
  useEffect(() => {
    if (maxPrice > 0 && filters.maxPrice === 0) {
      setFilters(prev => ({ ...prev, maxPrice }))
    }
  }, [maxPrice])

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
    <main className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      <div className="max-w-[1600px] mx-auto p-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-5xl font-bold text-amber-900 dark:text-amber-400 mb-2 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-12 h-12">
                  <path d="M16 24 L16 42 C16 48, 20 52, 26 52 L38 52 C44 52, 48 48, 48 42 L48 24 Z" fill="currentColor"/>
                  <path d="M48 28 L52 28 C54 28, 56 30, 56 32 L56 36 C56 38, 54 40, 52 40 L48 40" fill="currentColor" opacity="0.7"/>
                  <path d="M24 18 Q24 14, 26 14 Q28 14, 28 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>
                  <path d="M32 16 Q32 12, 34 12 Q36 12, 36 16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>
                  <path d="M40 18 Q40 14, 42 14 Q44 14, 44 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>
                </svg>
                UK Specialty Coffee Tracker
              </h1>
              <p className="text-gray-700 dark:text-gray-300 text-lg">
                Discover specialty coffee from top UK roasters, visualized by origin region
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Tab Navigation */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('coffees')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'coffees'
                      ? 'bg-amber-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Coffee List
                </button>
                <button
                  onClick={() => setActiveTab('subscriptions')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'subscriptions'
                      ? 'bg-amber-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Subscriptions
                </button>
                <button
                  onClick={() => setActiveTab('readme')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'readme'
                      ? 'bg-amber-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  About
                </button>
              </div>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-md hover:shadow-lg transition-all"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Coffee List Tab */}
        {activeTab === 'coffees' && (
          <>
            {/* Filters and Map Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Left: Filters */}
              <CoffeeFilters
                onFilterChange={setFilters}
                roasters={roasters}
                regions={regions}
                maxPrice={maxPrice}
                tastingNotes={tastingNotes}
              />

              {/* Right: Map */}
              <div className="sticky top-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-transparent dark:border-gray-700 overflow-hidden" style={{ height: '500px' }}>
                  <CoffeeMap coffees={filteredCoffees} />
                </div>
              </div>
            </div>

            {/* Coffee Count */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-amber-900 dark:text-amber-400">
                All Coffees
              </h2>
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

            {/* Coffee List */}
            {!loading && !error && (
              <div>
                {filteredCoffees.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400">
                      No coffees found matching your filters. Try adjusting your search criteria.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCoffees.map((coffee, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-xl transition-shadow border border-transparent dark:border-gray-700"
                      >
                        <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-400 mb-1">
                          {coffee.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1 font-medium">{coffee.roaster}</p>
                        {(coffee.origin || coffee.region) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            {coffee.region || coffee.origin}
                            <span className="ml-1">{getCountryFlag(coffee.origin || coffee.region)}</span>
                          </p>
                        )}
                        {coffee.tasting_notes.length > 0 && (
                          <div className="mb-2">
                            <div className="flex flex-wrap gap-1">
                              {coffee.tasting_notes.map((note, i) => (
                                <span
                                  key={i}
                                  className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs px-2 py-0.5 rounded"
                                >
                                  {note}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {coffee.price && (
                          <p className="text-base font-bold text-amber-600 dark:text-amber-400 mb-2">{coffee.price}</p>
                        )}
                        <div className="flex gap-2 items-center">
                          <a
                            href={coffee.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-amber-600 text-white text-sm px-3 py-1.5 rounded hover:bg-amber-700 transition-colors"
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
