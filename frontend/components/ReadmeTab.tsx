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
                'Ozone Coffee',
                'Dark Arts Coffee',
                'Round Hill Roastery',
                'Volcano Coffee Works',
                'Balance Coffee',
                'Union Coffee Roasters',
                'Hermanos Coffee',
                'Monmouth Coffee',
                'Gotham Coffee',
                'Coffee Compass',
                'UE Coffee Roasters',
                'Kiss the Hippo',
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
              🤦 Development Blunders
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Building with AI doesn't mean everything goes smoothly! Here are some memorable mistakes made during development:
            </p>
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">🔓 Accidental Public GCP Endpoints</h4>
                <p className="text-red-700 dark:text-red-400 text-sm">
                  Initially deployed the scraper API without authentication, making it publicly accessible. Anyone could have triggered expensive scraping jobs or accessed internal endpoints. Fixed by adding proper IAM authentication.
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">💾 Aggressive Rust Binary Caching</h4>
                <p className="text-red-700 dark:text-red-400 text-sm">
                  GitHub Actions cached compiled Rust binaries based only on Cargo.lock. When source code changed but dependencies didn't, stale binaries were used. Took multiple debugging sessions to realize code changes weren't being deployed. Fixed by removing caching entirely.
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">📦 Vercel Build Cache Nightmare</h4>
                <p className="text-red-700 dark:text-red-400 text-sm">
                  Even after fixing the Rust caching, the website wouldn't update. Turned out Vercel was caching the old frontend build. Required manually clearing the Vercel build cache to see changes.
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">🔄 Builder Cloning Wrong Repo</h4>
                <p className="text-red-700 dark:text-red-400 text-sm">
                  The builder service cloned the source repo separately instead of using the already checked-out code. This caused it to sometimes use stale code or fail due to token permissions. Fixed by using GITHUB_WORKSPACE directly.
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">☕ Filtering "Filter Roast" Coffees</h4>
                <p className="text-red-700 dark:text-red-400 text-sm">
                  Equipment filtering used the word "filter" to remove V60 papers and filter equipment, but accidentally filtered out legitimate "Filter Roast" coffees. Fixed by being more specific with equipment keywords.
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">🔐 Attempted Push to Protected Main Branch</h4>
                <p className="text-red-700 dark:text-red-400 text-sm">
                  Tried to merge code directly into the main branch, which could have bypassed code review and CI checks. Fortunately, branch protection rules were in place on GitHub, blocking the direct push. Always use pull requests!
                </p>
              </div>
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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <a
                href="https://github.com/nikulpatel3141/CoffeeAggregator"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                View Source on GitHub
              </a>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Built with ❤️ and ☕ using Claude Code
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
