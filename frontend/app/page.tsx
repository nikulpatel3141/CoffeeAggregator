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
  weight?: string
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

// Map tasting notes to emojis
const getTastingNoteEmoji = (note: string): string => {
  const lowerNote = note.toLowerCase()

  // Fruits
  if (lowerNote.includes('berry') || lowerNote.includes('berries')) return '🫐'
  if (lowerNote.includes('cherry') || lowerNote.includes('cherries')) return '🍒'
  if (lowerNote.includes('apple')) return '🍎'
  if (lowerNote.includes('citrus') || lowerNote.includes('lemon') || lowerNote.includes('orange')) return '🍊'
  if (lowerNote.includes('tropical') || lowerNote.includes('mango') || lowerNote.includes('pineapple')) return '🍍'
  if (lowerNote.includes('stone fruit') || lowerNote.includes('peach') || lowerNote.includes('apricot')) return '🍑'
  if (lowerNote.includes('grape') || lowerNote.includes('wine')) return '🍇'
  if (lowerNote.includes('fruity') || lowerNote.includes('fruit')) return '🍓'

  // Sweet/Dessert
  if (lowerNote.includes('chocolate') || lowerNote.includes('cocoa')) return '🍫'
  if (lowerNote.includes('caramel') || lowerNote.includes('toffee')) return '🍮'
  if (lowerNote.includes('honey')) return '🍯'
  if (lowerNote.includes('vanilla')) return '🍦'
  if (lowerNote.includes('sugar') || lowerNote.includes('sweet')) return '🍬'

  // Nuts
  if (lowerNote.includes('nut') || lowerNote.includes('almond') || lowerNote.includes('hazelnut')) return '🥜'

  // Floral/Herbal
  if (lowerNote.includes('floral') || lowerNote.includes('jasmine') || lowerNote.includes('rose')) return '🌸'
  if (lowerNote.includes('tea') || lowerNote.includes('black tea')) return '🍵'
  if (lowerNote.includes('herbal')) return '🌿'

  // Spices
  if (lowerNote.includes('spice') || lowerNote.includes('cinnamon') || lowerNote.includes('clove')) return '🌶️'

  // Other
  if (lowerNote.includes('wine') || lowerNote.includes('winey')) return '🍷'
  if (lowerNote.includes('butter')) return '🧈'

  return ''
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
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showMapOnMobile, setShowMapOnMobile] = useState(false)

  useEffect(() => {
    fetchCoffees()
    // Check for saved theme preference (default to light mode)
    const savedTheme = localStorage.getItem('theme')
    const shouldBeDark = savedTheme === 'dark'
    setIsDarkMode(shouldBeDark)
    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
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

  // Extract unique roasters, regions, price range, and tasting notes for filter dropdowns
  const { roasters, regions, minPrice, maxPrice, tastingNotes } = useMemo(() => {
    const roasterSet = new Set<string>()
    const regionSet = new Set<string>()
    const tastingNotesSet = new Set<string>()
    let calculatedMinPrice = Infinity
    let calculatedMaxPrice = 0

    coffees.forEach((coffee) => {
      roasterSet.add(coffee.roaster)
      if (coffee.region) regionSet.add(coffee.region)
      if (coffee.origin) regionSet.add(coffee.origin)

      // Collect all tasting notes
      coffee.tasting_notes.forEach(note => {
        if (note) tastingNotesSet.add(note.toLowerCase())
      })

      // Calculate min and max price
      if (coffee.price) {
        const price = parseFloat(coffee.price.replace(/[^0-9.]/g, ''))
        if (!isNaN(price)) {
          if (price < calculatedMinPrice) calculatedMinPrice = price
          if (price > calculatedMaxPrice) calculatedMaxPrice = price
        }
      }
    })

    return {
      roasters: Array.from(roasterSet).sort(),
      regions: Array.from(regionSet).sort(),
      minPrice: calculatedMinPrice === Infinity ? 0 : Math.floor(calculatedMinPrice),
      maxPrice: Math.ceil(calculatedMaxPrice) || 100,
      tastingNotes: Array.from(tastingNotesSet).sort(),
    }
  }, [coffees])

  // Update price filter when data loads
  useEffect(() => {
    if (maxPrice > 0 && filters.maxPrice === 0) {
      setFilters(prev => ({ ...prev, minPrice, maxPrice }))
    }
  }, [minPrice, maxPrice])

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
    }).sort((a, b) => {
      // Prioritize coffees with more complete metadata
      const aScore = (a.origin ? 2 : 0) + (a.region ? 1 : 0) + (a.tasting_notes.length > 0 ? 2 : 0)
      const bScore = (b.origin ? 2 : 0) + (b.region ? 1 : 0) + (b.tasting_notes.length > 0 ? 2 : 0)
      if (aScore !== bScore) return bScore - aScore
      // Then alphabetically by name
      return a.name.localeCompare(b.name)
    })
  }, [coffees, filters])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  // Paginated coffees (itemsPerPage of -1 means show all)
  const paginatedCoffees = useMemo(() => {
    if (itemsPerPage === -1) {
      return filteredCoffees
    }
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredCoffees.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredCoffees, currentPage, itemsPerPage])

  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(filteredCoffees.length / itemsPerPage)

  return (
    <main className="min-h-screen bg-canvas transition-surface duration-calm ease-gentle">
      <div className="max-w-[1400px] mx-auto p-3 sm:p-4 md:p-6">
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Slide-out Menu */}
        <div className={`fixed top-0 right-0 h-full w-64 bg-surface shadow-floating z-50 transform transition-transform duration-300 ease-in-out md:hidden ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-coffee-strong">Menu</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-surface hover:bg-elevated"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="space-y-2 mb-6">
              <button
                onClick={() => { setActiveTab('coffees'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-surface font-medium transition-surface duration-calm ease-gentle ${
                  activeTab === 'coffees'
                    ? 'bg-coffee text-white'
                    : 'text-text hover:bg-elevated'
                }`}
              >
                Coffee List
              </button>
              <button
                onClick={() => { setActiveTab('subscriptions'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-surface font-medium transition-surface duration-calm ease-gentle ${
                  activeTab === 'subscriptions'
                    ? 'bg-coffee text-white'
                    : 'text-text hover:bg-elevated'
                }`}
              >
                Subscriptions
              </button>
              <button
                onClick={() => { setActiveTab('readme'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-surface font-medium transition-surface duration-calm ease-gentle ${
                  activeTab === 'readme'
                    ? 'bg-coffee text-white'
                    : 'text-text hover:bg-elevated'
                }`}
              >
                About
              </button>
            </nav>

            {/* Dark Mode Toggle in Mobile Menu */}
            <div className="border-t border-border pt-4">
              <button
                onClick={toggleDarkMode}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-surface text-text hover:bg-elevated transition-surface duration-calm ease-gentle"
              >
                {isDarkMode ? (
                  <>
                    <svg className="w-5 h-5 text-crema" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-text" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                    <span>Dark Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="mb-6 md:mb-8">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex justify-between items-center gap-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-coffee-strong mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 flex-shrink-0">
                    <path d="M10 13 L10 21 C10 22, 11 23, 12 23 L20 23 C21 23, 22 22, 22 21 L22 13 Z" fill="currentColor"/>
                    <path d="M10 13 L10 14 L22 14 L22 13 Z" fill="currentColor" opacity="0.7"/>
                    <path d="M22 16 C23 16, 24 17, 24 18 C24 19, 23 20, 22 20" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M12 11 Q12 9, 13 9" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6"/>
                    <path d="M16 10 Q16 8, 17 8" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6"/>
                    <path d="M20 11 Q20 9, 21 9" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6"/>
                  </svg>
                  <span className="hidden sm:inline">UK Specialty Coffee Tracker</span>
                  <span className="sm:hidden">UK Coffee Tracker</span>
                </h1>
                <p className="text-text text-xs sm:text-sm md:text-lg hidden sm:block">
                  Discover specialty coffee from top UK roasters
                </p>
              </div>

              {/* Desktop: Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className="hidden md:block p-2 rounded-surface bg-elevated shadow-raised hover:shadow-raised transition-surface duration-calm ease-gentle flex-shrink-0"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5 text-crema" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-text" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              {/* Mobile: Hamburger menu button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-surface bg-elevated shadow-raised hover:shadow-raised transition-surface duration-calm ease-gentle flex-shrink-0"
                aria-label="Open menu"
              >
                <svg className="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* Desktop Tab Navigation */}
            <div className="hidden md:flex gap-2">
              <button
                onClick={() => setActiveTab('coffees')}
                className={`px-4 py-2 text-sm font-medium rounded-surface transition-surface duration-calm ease-gentle whitespace-nowrap ${
                  activeTab === 'coffees'
                    ? 'bg-coffee text-white'
                    : 'text-muted hover:bg-elevated'
                }`}
              >
                Coffee List
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`px-4 py-2 text-sm font-medium rounded-surface transition-surface duration-calm ease-gentle whitespace-nowrap ${
                  activeTab === 'subscriptions'
                    ? 'bg-coffee text-white'
                    : 'text-muted hover:bg-elevated'
                }`}
              >
                Subscriptions
              </button>
              <button
                onClick={() => setActiveTab('readme')}
                className={`px-4 py-2 text-sm font-medium rounded-surface transition-surface duration-calm ease-gentle whitespace-nowrap ${
                  activeTab === 'readme'
                    ? 'bg-coffee text-white'
                    : 'text-muted hover:bg-elevated'
                }`}
              >
                About
              </button>
            </div>

            {/* Mobile Tab Pills (compact, below title) */}
            <div className="flex md:hidden gap-1 overflow-x-auto pb-1 -mx-1 px-1">
              <button
                onClick={() => setActiveTab('coffees')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-surface duration-calm ease-gentle whitespace-nowrap ${
                  activeTab === 'coffees'
                    ? 'bg-coffee text-white'
                    : 'bg-elevated text-muted'
                }`}
              >
                Coffees
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-surface duration-calm ease-gentle whitespace-nowrap ${
                  activeTab === 'subscriptions'
                    ? 'bg-coffee text-white'
                    : 'bg-elevated text-muted'
                }`}
              >
                Subscriptions
              </button>
              <button
                onClick={() => setActiveTab('readme')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-surface duration-calm ease-gentle whitespace-nowrap ${
                  activeTab === 'readme'
                    ? 'bg-coffee text-white'
                    : 'bg-elevated text-muted'
                }`}
              >
                About
              </button>
            </div>
          </div>
        </header>

        {/* Coffee List Tab */}
        {activeTab === 'coffees' && (
          <>
            {/* Filters and Map Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
              {/* Left: Filters */}
              <CoffeeFilters
                onFilterChange={setFilters}
                roasters={roasters}
                regions={regions}
                minPrice={minPrice}
                maxPrice={maxPrice}
                tastingNotes={tastingNotes}
              />

              {/* Right: Map */}
              <div className="lg:sticky lg:top-6">
                {/* Mobile Map Toggle */}
                <button
                  onClick={() => setShowMapOnMobile(!showMapOnMobile)}
                  className="lg:hidden w-full mb-2 px-4 py-2 bg-crema/25 text-coffee-strong rounded-surface font-medium text-sm flex items-center justify-center gap-2"
                >
                  <span>{showMapOnMobile ? '🗺️ Hide Map' : '🗺️ Show Map'}</span>
                  <svg className={`w-4 h-4 transition-transform ${showMapOnMobile ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`bg-surface rounded-surface shadow-raised border border-border overflow-hidden h-[300px] sm:h-[400px] lg:h-[500px] ${showMapOnMobile ? 'block' : 'hidden lg:block'}`}>
                  <CoffeeMap coffees={filteredCoffees} />
                </div>
              </div>
            </div>
            {/* Coffee Count, Pagination Controls, and View Toggle */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-6 gap-3 sm:gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-coffee-strong">
                  All Coffees
                </h2>
                <p className="text-xs sm:text-sm text-muted mt-1">
                  {filteredCoffees.length === 0 ? (
                    <>Showing 0 of <span className="font-semibold text-coffee">0</span> filtered ({coffees.length} total)</>
                  ) : (
                    <>Showing {itemsPerPage === -1 ? 1 : ((currentPage - 1) * itemsPerPage) + 1}-{itemsPerPage === -1 ? filteredCoffees.length : Math.min(currentPage * itemsPerPage, filteredCoffees.length)} of{' '}
                    <span className="font-semibold text-coffee">{filteredCoffees.length}</span> filtered{' '}
                    ({coffees.length} total)</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                {/* Items per page selector */}
                <div className="flex items-center gap-2">
                  <label htmlFor="itemsPerPage" className="text-xs sm:text-sm text-text">
                    Per page:
                  </label>
                  <select
                    id="itemsPerPage"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="p-1.5 text-xs sm:text-sm border border-border bg-elevated text-text rounded-control focus:ring-2 focus:ring-crema focus:border-transparent"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={-1}>All</option>
                  </select>
                </div>

                {/* Pagination buttons */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-1.5 sm:px-2 py-1 text-xs sm:text-sm rounded transition-surface duration-calm ease-gentle disabled:opacity-50 disabled:cursor-not-allowed text-text hover:bg-elevated"
                      title="First page"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-1.5 sm:px-2 py-1 text-xs sm:text-sm rounded transition-surface duration-calm ease-gentle disabled:opacity-50 disabled:cursor-not-allowed text-text hover:bg-elevated"
                      title="Previous page"
                    >
                      Prev
                    </button>
                    <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-text whitespace-nowrap">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-1.5 sm:px-2 py-1 text-xs sm:text-sm rounded transition-surface duration-calm ease-gentle disabled:opacity-50 disabled:cursor-not-allowed text-text hover:bg-elevated"
                      title="Next page"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-1.5 sm:px-2 py-1 text-xs sm:text-sm rounded transition-surface duration-calm ease-gentle disabled:opacity-50 disabled:cursor-not-allowed text-text hover:bg-elevated"
                      title="Last page"
                    >
                      Last
                    </button>
                  </div>
                )}

                {/* View toggle */}
                <div className="flex gap-1 bg-surface p-1 rounded-surface">
                  <button
                    onClick={() => setViewMode('card')}
                    className={'p-1.5 sm:p-2 rounded transition-surface duration-calm ease-gentle ' + (viewMode === 'card' ? 'bg-elevated shadow-subtle' : 'hover:bg-canvas')}
                    aria-label="Card view"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={'p-1.5 sm:p-2 rounded transition-surface duration-calm ease-gentle ' + (viewMode === 'list' ? 'bg-elevated shadow-subtle' : 'hover:bg-canvas')}
                    aria-label="List view"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coffee mx-auto"></div>
                <p className="mt-4 text-text">Loading coffees...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-terracotta/10 border border-terracotta/30 rounded-surface p-6 text-center">
                <p className="text-terracotta">{error}</p>
                <button
                  onClick={fetchCoffees}
                  className="mt-4 px-4 py-2 bg-terracotta text-white rounded-control hover:bg-terracotta/85 transition-surface duration-calm ease-gentle"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Coffee List */}
            {!loading && !error && (
              <div>
                {filteredCoffees.length === 0 ? (
                  <div className="text-center py-12 bg-surface rounded-surface">
                    <p className="text-muted">
                      No coffees found matching your filters. Try adjusting your search criteria.
                    </p>
                  </div>
                ) : viewMode === 'card' ? (
                  /* Card View */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {paginatedCoffees.map((coffee, index) => (
                      <div
                        key={index}
                        className="bg-surface rounded-surface shadow-raised p-3 sm:p-4 hover:shadow-floating transition-surface duration-calm ease-gentle border border-border"
                      >
                        <h3 className="text-lg font-semibold text-coffee-strong mb-1">
                          {coffee.name}
                        </h3>
                        <p className="text-sm text-muted mb-1 font-medium">{coffee.roaster}</p>
                        {(coffee.origin || coffee.region) && (
                          <p className="text-xs text-muted mb-2">
                            {coffee.region || coffee.origin}
                            <span className="ml-1">{getCountryFlag(coffee.origin || coffee.region)}</span>
                          </p>
                        )}
                        {coffee.tasting_notes.length > 0 && (
                          <div className="mb-2">
                            <div className="flex flex-wrap gap-1">
                              {coffee.tasting_notes.map((note, i) => {
                                const emoji = getTastingNoteEmoji(note)
                                return (
                                  <span
                                    key={i}
                                    className="bg-crema/25 text-coffee-strong text-xs px-2 py-0.5 rounded"
                                  >
                                    {emoji && <span className="mr-1">{emoji}</span>}
                                    {note}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        {coffee.price && (
                          <p className="text-base font-bold text-coffee mb-2">
                            {coffee.price}{coffee.weight && <span className="text-sm font-normal text-muted ml-1">/ {coffee.weight}</span>}
                          </p>
                        )}
                        <div className="flex gap-2 items-center">
                          <a
                            href={coffee.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-coffee text-white text-sm px-3 py-1.5 rounded hover:bg-coffee-strong transition-surface duration-calm ease-gentle"
                          >
                            View Coffee
                          </a>
                          {coffee.in_stock && (
                            <span className="text-xs text-sage font-medium">In Stock</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* List View */
                  <div className="space-y-2">
                    {paginatedCoffees.map((coffee, index) => (
                      <div
                        key={index}
                        className="bg-surface rounded-surface shadow-subtle p-3 sm:p-4 hover:shadow-raised transition-surface duration-calm ease-gentle border border-border"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm sm:text-base font-semibold text-coffee-strong truncate">
                                  {coffee.name}
                                </h3>
                                <p className="text-xs sm:text-sm text-muted font-medium">{coffee.roaster}</p>
                              </div>
                              {(coffee.origin || coffee.region) && (
                                <div className="text-xs text-muted flex items-center gap-1 flex-shrink-0">
                                  <span>{getCountryFlag(coffee.origin || coffee.region)}</span>
                                  <span className="hidden sm:inline">{coffee.region || coffee.origin}</span>
                                </div>
                              )}
                            </div>
                            {coffee.tasting_notes.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {coffee.tasting_notes.map((note, i) => {
                                  const emoji = getTastingNoteEmoji(note)
                                  return (
                                    <span
                                      key={i}
                                      className="bg-crema/25 text-coffee-strong text-xs px-2 py-0.5 rounded"
                                    >
                                      {emoji && <span className="mr-1">{emoji}</span>}
                                      {note}
                                    </span>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end">
                            {coffee.price && (
                              <p className="text-sm sm:text-base font-bold text-coffee">
                                {coffee.price}
                                {coffee.weight && <span className="text-xs sm:text-sm font-normal text-muted ml-1 hidden sm:inline">/ {coffee.weight}</span>}
                              </p>
                            )}
                            <div className="flex items-center gap-2">
                              <a
                                href={coffee.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block bg-coffee text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded hover:bg-coffee-strong transition-surface duration-calm ease-gentle whitespace-nowrap"
                              >
                                View
                              </a>
                              {coffee.in_stock && (
                                <span className="text-xs text-sage font-medium whitespace-nowrap hidden sm:inline">In Stock</span>
                              )}
                            </div>
                          </div>
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
