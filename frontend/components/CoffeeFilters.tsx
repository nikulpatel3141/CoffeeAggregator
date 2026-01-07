'use client'

import { useState } from 'react'

interface FilterProps {
  onFilterChange: (filters: CoffeeFilterValues) => void
  roasters: string[]
  regions: string[]
}

export interface CoffeeFilterValues {
  search: string
  roaster: string
  region: string
  minPrice: number
  maxPrice: number
  tastingNotes: string
}

export default function CoffeeFilters({ onFilterChange, roasters, regions }: FilterProps) {
  const [filters, setFilters] = useState<CoffeeFilterValues>({
    search: '',
    roaster: '',
    region: '',
    minPrice: 0,
    maxPrice: 100,
    tastingNotes: '',
  })

  const updateFilter = (key: keyof CoffeeFilterValues, value: string | number) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    const clearedFilters: CoffeeFilterValues = {
      search: '',
      roaster: '',
      region: '',
      minPrice: 0,
      maxPrice: 100,
      tastingNotes: '',
    }
    setFilters(clearedFilters)
    onFilterChange(clearedFilters)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-amber-900">Filter Coffees</h2>
        <button
          onClick={clearFilters}
          className="text-sm text-amber-600 hover:text-amber-700 underline"
        >
          Clear all filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            id="search"
            type="text"
            placeholder="Coffee name..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        {/* Roaster */}
        <div>
          <label htmlFor="roaster" className="block text-sm font-medium text-gray-700 mb-1">
            Roaster
          </label>
          <select
            id="roaster"
            value={filters.roaster}
            onChange={(e) => updateFilter('roaster', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="">All roasters</option>
            {roasters.map((roaster) => (
              <option key={roaster} value={roaster}>
                {roaster}
              </option>
            ))}
          </select>
        </div>

        {/* Region */}
        <div>
          <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">
            Region
          </label>
          <select
            id="region"
            value={filters.region}
            onChange={(e) => updateFilter('region', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="">All regions</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div className="md:col-span-2 lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price Range: £{filters.minPrice} - £{filters.maxPrice}
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => updateFilter('minPrice', parseFloat(e.target.value) || 0)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => updateFilter('maxPrice', parseFloat(e.target.value) || 100)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tasting Notes */}
        <div className="md:col-span-2">
          <label htmlFor="tastingNotes" className="block text-sm font-medium text-gray-700 mb-1">
            Tasting Notes
          </label>
          <input
            id="tastingNotes"
            type="text"
            placeholder="e.g., chocolate, fruity, floral..."
            value={filters.tastingNotes}
            onChange={(e) => updateFilter('tastingNotes', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  )
}
