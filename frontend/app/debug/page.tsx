'use client'

import { useEffect, useState } from 'react'

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

export default function DebugPage() {
  const [coffees, setCoffees] = useState<Coffee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/data/coffees.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch coffee data')
        return res.json()
      })
      .then((data) => {
        setCoffees(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-amber-400">Debug: Raw Coffee Data</h1>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-amber-400">Debug: Raw Coffee Data</h1>
          <p className="text-red-400">Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-amber-400">Debug: Raw Coffee Data</h1>
        <p className="text-gray-400 mb-8">
          Total coffees: {coffees.length} | Last updated: {coffees[0]?.scraped_at || 'N/A'}
        </p>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-amber-300">JSON Data</h2>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 overflow-auto max-h-96">
            <pre className="text-xs text-green-400 font-mono">
              {JSON.stringify(coffees, null, 2)}
            </pre>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-amber-300">Statistics by Roaster</h2>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            {Object.entries(
              coffees.reduce((acc, coffee) => {
                acc[coffee.roaster] = (acc[coffee.roaster] || 0) + 1
                return acc
              }, {} as Record<string, number>)
            )
              .sort(([, a], [, b]) => b - a)
              .map(([roaster, count]) => (
                <div key={roaster} className="flex justify-between py-1 border-b border-gray-700 last:border-0">
                  <span className="text-gray-300">{roaster}</span>
                  <span className="text-amber-400 font-semibold">{count}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-amber-300">Recent Entries (Last 10)</h2>
          <div className="space-y-4">
            {coffees.slice(0, 10).map((coffee, idx) => (
              <div key={idx} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-amber-400 mb-2">{coffee.name}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Roaster:</span>{' '}
                    <span className="text-gray-300">{coffee.roaster}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Origin:</span>{' '}
                    <span className="text-gray-300">{coffee.origin || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Price:</span>{' '}
                    <span className="text-gray-300">
                      {coffee.price || 'N/A'}
                      {coffee.weight && ` / ${coffee.weight}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">In Stock:</span>{' '}
                    <span className={coffee.in_stock ? 'text-green-400' : 'text-red-400'}>
                      {coffee.in_stock ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Tasting Notes:</span>{' '}
                    <span className="text-gray-300">
                      {coffee.tasting_notes.length > 0 ? coffee.tasting_notes.join(', ') : 'N/A'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">URL:</span>{' '}
                    <a
                      href={coffee.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {coffee.url}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
