'use client'

import { useState, useEffect } from 'react'

interface FilterProps {
  onFilterChange: (filters: CoffeeFilterValues) => void
  roasters: string[]
  regions: string[]
  minPrice: number
  maxPrice: number
  tastingNotes: string[]
}

export interface CoffeeFilterValues {
  search: string
  roaster: string
  region: string
  minPrice: number
  maxPrice: number
  tastingNotes: string
}

// Map tasting notes to emojis
const getTastingNoteEmoji = (note: string): string => {
  const emojiMap: { [key: string]: string } = {
    'chocolate': '🍫',
    'cocoa': '🍫',
    'caramel': '🍮',
    'honey': '🍯',
    'citrus': '🍊',
    'lemon': '🍋',
    'orange': '🍊',
    'berry': '🫐',
    'blueberry': '🫐',
    'strawberry': '🍓',
    'raspberry': '🫐',
    'blackberry': '🫐',
    'cherry': '🍒',
    'apple': '🍎',
    'pear': '🍐',
    'peach': '🍑',
    'apricot': '🍑',
    'plum': '🫐',
    'grape': '🍇',
    'tropical': '🏝️',
    'mango': '🥭',
    'pineapple': '🍍',
    'passion fruit': '🏝️',
    'floral': '🌸',
    'jasmine': '🌸',
    'rose': '🌹',
    'bergamot': '🍊',
    'tea': '🍵',
    'nutty': '🥜',
    'almond': '🥜',
    'hazelnut': '🌰',
    'walnut': '🥜',
    'vanilla': '🍦',
    'brown sugar': '🍬',
    'molasses': '🍯',
    'toffee': '🍬',
    'butterscotch': '🍬',
    'wine': '🍷',
    'winey': '🍷',
    'bright': '✨',
    'crisp': '✨',
    'clean': '💎',
    'smooth': '🧈',
    'silky': '🧈',
    'creamy': '🧈',
    'buttery': '🧈',
    'spicy': '🌶️',
    'cinnamon': '🌰',
    'clove': '🌶️',
    'ginger': '🫚',
    'earthy': '🌍',
    'woody': '🪵',
    'cedar': '🪵',
    'tobacco': '🍂',
    'leather': '🍂',
    'sweet': '🍭',
    'fruity': '🍇',
    'juicy': '🧃',
    'balanced': '⚖️',
    'complex': '🎭',
    'rich': '💰',
    'full-bodied': '💪',
  }

  const normalizedNote = note.toLowerCase()
  return emojiMap[normalizedNote] || '☕'
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

export default function CoffeeFilters({ onFilterChange, roasters, regions, minPrice, maxPrice, tastingNotes }: FilterProps) {
  const [filters, setFilters] = useState<CoffeeFilterValues>({
    search: '',
    roaster: '',
    region: '',
    minPrice: minPrice || 0,
    maxPrice: maxPrice || 100,
    tastingNotes: '',
  })
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)

  // Update price range when props change
  useEffect(() => {
    if (maxPrice > 0 && (filters.maxPrice !== maxPrice || filters.minPrice !== minPrice)) {
      const newFilters = { ...filters, minPrice, maxPrice }
      setFilters(newFilters)
      onFilterChange(newFilters)
    }
  }, [minPrice, maxPrice])

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
      minPrice: minPrice,
      maxPrice: maxPrice,
      tastingNotes: '',
    }
    setFilters(clearedFilters)
    onFilterChange(clearedFilters)
  }

  return (
    <div className="bg-surface rounded-surface shadow-raised p-4 sm:p-6 mb-4 md:mb-6 border border-border">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-coffee-strong">Filter Coffees</h2>
        <button
          onClick={clearFilters}
          className="text-xs sm:text-sm text-coffee hover:text-coffee-strong underline whitespace-nowrap"
        >
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-xs sm:text-sm font-medium text-text mb-1">
            Search
          </label>
          <input
            id="search"
            type="text"
            placeholder="Coffee name..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full p-2 text-sm border border-border bg-elevated text-text rounded-control focus:ring-2 focus:ring-crema focus:border-transparent"
          />
        </div>

        {/* Roaster */}
        <div>
          <label htmlFor="roaster" className="block text-xs sm:text-sm font-medium text-text mb-1">
            Roaster
          </label>
          <select
            id="roaster"
            value={filters.roaster}
            onChange={(e) => updateFilter('roaster', e.target.value)}
            className="w-full p-2 text-sm border border-border bg-elevated text-text rounded-control focus:ring-2 focus:ring-crema focus:border-transparent"
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
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="block text-xs sm:text-sm font-medium text-text mb-1">
            Price Range: £{filters.minPrice} - £{filters.maxPrice}
          </label>
          <div className="px-1 pt-4 sm:pt-6 pb-2">
            <div className="relative h-2">
              {/* Track background */}
              <div className="absolute w-full h-2 bg-border rounded-surface"></div>

              {/* Active range highlight */}
              <div
                className="absolute h-2 bg-coffee rounded-surface"
                style={{
                  left: `${((filters.minPrice - minPrice) / (maxPrice - minPrice)) * 100}%`,
                  right: `${100 - ((filters.maxPrice - minPrice) / (maxPrice - minPrice)) * 100}%`
                }}
              ></div>

              {/* Min range input */}
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={filters.minPrice}
                onChange={(e) => {
                  const newMin = parseFloat(e.target.value)
                  if (newMin <= filters.maxPrice) {
                    updateFilter('minPrice', newMin)
                  }
                }}
                className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer"
                style={{
                  zIndex: 5,
                  pointerEvents: 'all'
                }}
              />

              {/* Max range input */}
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={filters.maxPrice}
                onChange={(e) => {
                  const newMax = parseFloat(e.target.value)
                  if (newMax >= filters.minPrice) {
                    updateFilter('maxPrice', newMax)
                  }
                }}
                className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer"
                style={{
                  zIndex: 4,
                  pointerEvents: 'all'
                }}
              />
            </div>
          </div>

          {/* Minimal styles for range slider */}
          <style jsx>{`
            input[type="range"] {
              -webkit-appearance: none;
              appearance: none;
            }

            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: rgb(var(--color-coffee));
              cursor: pointer;
            }

            input[type="range"]::-moz-range-thumb {
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: rgb(var(--color-coffee));
              border: none;
              cursor: pointer;
            }

            input[type="range"]::-webkit-slider-runnable-track {
              background: transparent;
            }

            input[type="range"]::-moz-range-track {
              background: transparent;
            }
          `}</style>
        </div>

        {/* Tasting Notes with Autocomplete */}
        <div className="sm:col-span-2 relative">
          <label htmlFor="tastingNotes" className="block text-xs sm:text-sm font-medium text-text mb-1">
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
            className="w-full p-2 text-sm border border-border bg-elevated text-text rounded-control focus:ring-2 focus:ring-crema focus:border-transparent"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-elevated border border-border rounded-control shadow-raised max-h-48 overflow-y-auto">
              {filteredSuggestions.slice(0, 10).map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className={`w-full text-left px-3 py-2 text-text capitalize ${
                    index === selectedSuggestionIndex
                      ? 'bg-crema/25'
                      : 'hover:bg-crema/20'
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
      <div className="mt-3 sm:mt-4 border-t border-border pt-3">
        <h3 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
          🏷️ Quick Filters
        </h3>

        <div className="space-y-2 sm:space-y-3">
          {/* Origin Tags */}
          <div>
            <p className="text-xs font-medium text-muted mb-1.5">Origin</p>
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {regions.map((region) => (
                <button
                  key={region}
                  onClick={() => updateFilter('region', filters.region === region ? '' : region)}
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-control transition-surface duration-calm ease-gentle inline-flex items-center gap-0.5 sm:gap-1 ${
                    filters.region === region
                      ? 'bg-coffee text-white shadow-subtle'
                      : 'bg-elevated text-text hover:bg-canvas'
                  }`}
                >
                  <span className="text-xs sm:text-sm">{getCountryFlag(region)}</span>
                  <span className="truncate max-w-[100px] sm:max-w-none">{region}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Popular Tasting Notes Tags */}
          <div>
            <p className="text-xs font-medium text-muted mb-1.5">Popular Notes</p>
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {tastingNotes.slice(0, 20).map((note) => (
                <button
                  key={note}
                  onClick={() => updateFilter('tastingNotes', filters.tastingNotes === note ? '' : note, true)}
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-control transition-surface duration-calm ease-gentle capitalize inline-flex items-center gap-0.5 sm:gap-1 ${
                    filters.tastingNotes === note
                      ? 'bg-coffee text-white shadow-subtle'
                      : 'bg-elevated text-text hover:bg-canvas'
                  }`}
                >
                  <span className="text-xs sm:text-sm">{getTastingNoteEmoji(note)}</span>
                  <span>{note}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
