'use client'

export default function ReadmeTab() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-transparent dark:border-gray-700">
        <h2 className="text-3xl font-bold text-amber-900 dark:text-amber-400 mb-6">
          About This Project
        </h2>

        <div className="prose dark:prose-invert max-w-none">
          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-amber-800 dark:text-amber-300 mb-3">
              🤖 Generated with Claude Code
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              This entire project was built using{' '}
              <a
                href="https://github.com/anthropics/claude-code"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
              >
                Claude Code
              </a>
              , Anthropic's official CLI for Claude. From scraper design to frontend development, deployment
              infrastructure to documentation—every line of code was generated through conversation.
            </p>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-amber-800 dark:text-amber-300 mb-3">
              ☕ The Story
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              As a coffee enthusiast, I found myself constantly browsing multiple UK specialty roaster websites,
              trying to discover new single-origin beans and compare offerings. Each site had its own layout,
              different filters, and varying levels of detail about origin and tasting notes.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              I wanted a single place where I could:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
              <li>See all available specialty coffees from top UK roasters</li>
              <li>Filter by origin region to explore different flavor profiles</li>
              <li>Compare prices across roasters</li>
              <li>Visualize coffee origins on an interactive map</li>
              <li>Discover new roasters and their unique offerings</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Rather than building this manually, I decided to use Claude Code to create the entire system through
              natural conversation. The result is this comprehensive coffee aggregator that automatically updates
              with fresh data from UK's finest specialty coffee roasters.
            </p>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-amber-800 dark:text-amber-300 mb-3">
              🏗️ Architecture
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 mb-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Scraper Service (Rust/Axum)</h4>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Built with Rust for reliability and performance. Uses a dual-approach strategy:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                <li>Primary: Shopify JSON API for fast, structured data</li>
                <li>Fallback: HTML scraping for maximum compatibility</li>
                <li>Deployed on Google Cloud Run with scheduled triggers</li>
                <li>Stores data in Firestore for persistence</li>
              </ul>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 mb-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Builder Job (Node.js)</h4>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Exports data from Firestore to static JSON and commits to GitHub:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                <li>Runs daily via GitHub Actions</li>
                <li>Triggers Vercel deployment automatically</li>
                <li>Ensures data is always fresh without runtime dependencies</li>
              </ul>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Frontend (Next.js 14)</h4>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Modern React application with:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                <li>Interactive map visualization using Leaflet</li>
                <li>Advanced filtering and search capabilities</li>
                <li>Light/dark mode with system preference detection</li>
                <li>Responsive design for all devices</li>
                <li>Deployed on Vercel for fast global delivery</li>
              </ul>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-amber-800 dark:text-amber-300 mb-3">
              🔍 Currently Tracking
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                'Origin Coffee',
                'Rave Coffee',
                'Has Bean',
                'Dark Arts Coffee',
                'Round Hill Roastery',
                'Volcano Coffee Works',
                'Balance Coffee',
                'Union Coffee Roasters',
                'Hermanos Coffee',
              ].map((roaster) => (
                <div
                  key={roaster}
                  className="bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-300 px-3 py-2 rounded-lg text-sm font-medium text-center"
                >
                  {roaster}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-amber-800 dark:text-amber-300 mb-3">
              📚 Tech Stack
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-gray-700 dark:text-gray-300">
                <strong>Backend:</strong> Rust, Axum, Firestore
              </div>
              <div className="text-gray-700 dark:text-gray-300">
                <strong>Frontend:</strong> Next.js 14, React, TypeScript
              </div>
              <div className="text-gray-700 dark:text-gray-300">
                <strong>Styling:</strong> Tailwind CSS
              </div>
              <div className="text-gray-700 dark:text-gray-300">
                <strong>Maps:</strong> Leaflet, OpenStreetMap
              </div>
              <div className="text-gray-700 dark:text-gray-300">
                <strong>Deployment:</strong> GCP Cloud Run, Vercel
              </div>
              <div className="text-gray-700 dark:text-gray-300">
                <strong>CI/CD:</strong> GitHub Actions
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Built with ❤️ and ☕ using Claude Code
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
