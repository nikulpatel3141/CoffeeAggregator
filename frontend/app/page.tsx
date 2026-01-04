'use client'

import { useEffect, useState } from 'react'

interface Coffee {
  name: string
  roaster: string
  origin?: string
  tasting_notes: string[]
  price?: string
  url: string
  scraped_at: string
}

export default function Home() {
  const [coffees, setCoffees] = useState<Coffee[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    // In production, this would fetch from Firestore
    // For now, showing placeholder data
    setLoading(false)
    setCoffees([])
  }, [])

  const filteredCoffees = coffees.filter(coffee =>
    coffee.name.toLowerCase().includes(filter.toLowerCase()) ||
    coffee.roaster.toLowerCase().includes(filter.toLowerCase()) ||
    coffee.origin?.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">
            UK Specialty Coffee Tracker
          </h1>
          <p className="text-gray-600">
            Discover specialty coffee from top UK roasters
          </p>
        </header>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by name, roaster, or origin..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full p-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading coffees...</p>
          </div>
        ) : filteredCoffees.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">
              {filter ? 'No coffees found matching your search.' : 'No coffees available yet. Check back soon!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCoffees.map((coffee, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold text-amber-900 mb-2">
                  {coffee.name}
                </h3>
                <p className="text-gray-600 mb-2">{coffee.roaster}</p>
                {coffee.origin && (
                  <p className="text-sm text-gray-500 mb-3">Origin: {coffee.origin}</p>
                )}
                {coffee.tasting_notes.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Tasting Notes:</p>
                    <div className="flex flex-wrap gap-2">
                      {coffee.tasting_notes.map((note, i) => (
                        <span key={i} className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded">
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {coffee.price && (
                  <p className="text-lg font-bold text-amber-600 mb-3">{coffee.price}</p>
                )}
                <a
                  href={coffee.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 transition-colors"
                >
                  View Coffee
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
