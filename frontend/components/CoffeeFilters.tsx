'use client'

import { useState, useEffect } from 'react'

interface FilterProps {
  onFilterChange: (filters: CoffeeFilterValues) => void
  roasters: string[]
  regions: string[]
  maxPrice: number
  tastingNotes: string[]
  regionFilterCollapsed: boolean
  onToggleRegionFilter: () => void
}

export interface CoffeeFilterValues {
  search: string
  roaster: string
  region: string
  minPrice: number
  maxPrice: number
  tastingNotes: string
}

// Map country names to flag emojis
const getCountryFlag = (country: string): string => {
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

export default function CoffeeFilters({ onFilterChange, roasters, regions, maxPrice, tastingNotes, regionFilterCollapsed, onToggleRegionFilter }: FilterProps) {
  const [filters, setFilters] = useState<CoffeeFilterValues>({
    search: '',
    roaster: '',
    region: '',
    minPrice: 0,
    maxPrice: maxPrice || 100,
    tastingNotes: '',
  })
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)

  // Update maxPrice when prop changes
  useEffect(() => {
    if (maxPrice > 0 && filters.maxPrice === 0) {
      const newFilters = { ...filters, maxPrice }
      setFilters(newFilters)
      onFilterChange(newFilters)
    }
  }, [maxPrice])

  const updateFilter = (key: keyof CoffeeFilterValues, value: string | number, suppressAutocomplete = false) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)

    // Update suggestions for tasting notes
    if (key === 'tastingNotes' && typeof value === 'string' && !suppressAutocomplete) {
      if (value.length > 0) {
        const suggestions = tastingNotes.filter(note =>
          note.toLowerCase().includes(value.toLowerCase())
        )
        setFilteredSuggestions(suggestions)
        setShowSuggestions(true)
        setSelectedSuggestionIndex(-1)
      } else {
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
      }
    } else if (key === 'tastingNotes' && suppressAutocomplete) {
      setShowSuggestions(false)
      setSelectedSuggestionIndex(-1)
    }
  }

  const selectSuggestion = (suggestion: string) => {
    updateFilter('tastingNotes', suggestion, true)
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
  }

  const handleTastingNotesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < filteredSuggestions.length) {
          selectSuggestion(filteredSuggestions[selectedSuggestionIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }

  const clearFilters = () => {
    const clearedFilters: CoffeeFilterValues = {
      search: '',
      roaster: '',
      region: '',
      minPrice: 0,
      maxPrice: maxPrice,
      tastingNotes: '',
    }
    setFilters(clearedFilters)
    onFilterChange(clearedFilters)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-transparent dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-amber-900 dark:text-amber-400">Filter Coffees</h2>
        <button
          onClick={clearFilters}
          className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline"
        >
          Clear all filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search
          </label>
          <input
            id="search"
            type="text"
            placeholder="Coffee name..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        {/* Roaster */}
        <div>
          <label htmlFor="roaster" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Roaster
          </label>
          <select
            id="roaster"
            value={filters.roaster}
            onChange={(e) => updateFilter('roaster', e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="">All roasters</option>
            {roasters.map((roaster) => (
              <option key={roaster} value={roaster}>
                {roaster}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div className="md:col-span-2 lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Price Range: £{filters.minPrice} - £{filters.maxPrice}
          </label>
          <div className="px-1 pt-2">
            <input
              type="range"
              min="0"
              max={maxPrice}
              value={filters.maxPrice}
              onChange={(e) => updateFilter('maxPrice', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
          </div>
        </div>

        {/* Tasting Notes with Autocomplete */}
        <div className="md:col-span-2 relative">
          <label htmlFor="tastingNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tasting Notes
          </label>
          <input
            id="tastingNotes"
            type="text"
            placeholder="e.g., chocolate, fruity, floral..."
            value={filters.tastingNotes}
            onChange={(e) => updateFilter('tastingNotes', e.target.value)}
            onKeyDown={handleTastingNotesKeyDown}
            onFocus={() => filters.tastingNotes && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredSuggestions.slice(0, 10).map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className={`w-full text-left px-3 py-2 text-gray-700 dark:text-gray-300 capitalize ${
                    index === selectedSuggestionIndex
                      ? 'bg-amber-100 dark:bg-gray-600'
                      : 'hover:bg-amber-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tags Section */}
      <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
        <button
          onClick={onToggleRegionFilter}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            🏷️ Quick Filter Tags
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${regionFilterCollapsed ? '' : 'rotate-180'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {!regionFilterCollapsed && (
          <div className="mt-2 space-y-3">
            {/* Origin Tags */}
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Origin</p>
              <div className="flex flex-wrap gap-1.5">
                {regions.map((region) => (
                  <button
                    key={region}
                    onClick={() => updateFilter('region', filters.region === region ? '' : region)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors inline-flex items-center gap-1 ${
                      filters.region === region
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>{getCountryFlag(region)}</span>
                    <span>{region}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Tasting Notes Tags */}
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Popular Notes</p>
              <div className="flex flex-wrap gap-1.5">
                {tastingNotes.slice(0, 20).map((note) => (
                  <button
                    key={note}
                    onClick={() => updateFilter('tastingNotes', filters.tastingNotes === note ? '' : note, true)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors capitalize ${
                      filters.tastingNotes === note
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {note}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
