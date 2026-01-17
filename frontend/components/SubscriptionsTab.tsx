'use client'

export default function SubscriptionsTab() {
  const subscriptions = [
    {
      roaster: 'Origin Coffee',
      url: 'https://www.origincoffee.co.uk/collections/subscriptions',
      plans: [
        { weight: '250g', frequency: '2 weeks', price: '£9.50' },
        { weight: '250g', frequency: '4 weeks', price: '£9.50' },
      ],
      notes: 'Flexible subscription, pause anytime',
    },
    {
      roaster: 'Rave Coffee',
      url: 'https://ravecoffee.co.uk/collections/coffee-subscriptions',
      plans: [
        { weight: '250g', frequency: '2 weeks', price: '£8.50' },
        { weight: '250g', frequency: '4 weeks', price: '£8.50' },
      ],
      notes: 'Free delivery, choose your roast level',
    },
    {
      roaster: 'Has Bean',
      url: 'https://www.hasbean.co.uk/collections/subscriptions',
      plans: [
        { weight: '250g', frequency: '2 weeks', price: '£9.00' },
        { weight: '250g', frequency: '4 weeks', price: '£9.00' },
      ],
      notes: 'Curated selections, detailed tasting notes',
    },
    {
      roaster: 'Dark Arts Coffee',
      url: 'https://www.darkartscoffee.co.uk/collections/coffee-subscriptions',
      plans: [
        { weight: '250g', frequency: '2 weeks', price: '£9.25' },
        { weight: '250g', frequency: '4 weeks', price: '£9.25' },
      ],
      notes: 'Award-winning roaster, seasonal selections',
    },
    {
      roaster: 'Round Hill Roastery',
      url: 'https://www.roundhillroastery.com/collections/subscriptions',
      plans: [
        { weight: '250g', frequency: '2 weeks', price: '£8.75' },
        { weight: '250g', frequency: '4 weeks', price: '£8.75' },
      ],
      notes: 'Ethically sourced, specialty grade',
    },
    {
      roaster: 'Hermanos Coffee',
      url: 'https://hermanoscoffeeroasters.com/collections/coffee-subscriptions',
      plans: [
        { weight: '250g', frequency: '2 weeks', price: '£10.00' },
        { weight: '250g', frequency: '4 weeks', price: '£10.00' },
      ],
      notes: 'Colombian specialty, direct trade',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-amber-900 dark:text-amber-400 mb-3">
          UK Specialty Coffee Subscriptions
        </h2>
        <p className="text-gray-700 dark:text-gray-300 text-lg">
          Compare subscription plans from top UK roasters. All prices shown are for 250g bags delivered every 2 weeks.
        </p>
      </div>

      <div className="grid gap-6">
        {subscriptions.map((sub, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-transparent dark:border-gray-700 hover:shadow-xl transition-shadow"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-amber-900 dark:text-amber-400 mb-1">
                  {sub.roaster}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{sub.notes}</p>
              </div>
              <a
                href={sub.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 md:mt-0 inline-block bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                View Subscription
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sub.plans.map((plan, planIndex) => (
                <div
                  key={planIndex}
                  className="bg-amber-50 dark:bg-gray-700/50 rounded-lg p-4 border border-amber-200 dark:border-gray-600"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {plan.weight} every {plan.frequency}
                      </p>
                      <p className="text-2xl font-bold text-amber-900 dark:text-amber-400">
                        {plan.price}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">per delivery</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-2">
          💡 Subscription Tips
        </h3>
        <ul className="text-blue-800 dark:text-blue-300 space-y-2 text-sm">
          <li>• Most subscriptions offer flexibility to pause or cancel anytime</li>
          <li>• Many roasters provide free delivery for subscriptions</li>
          <li>• Consider trying different roasters to discover your favorite</li>
          <li>• Look for introductory offers for first-time subscribers</li>
          <li>• Subscription coffee is typically fresher than one-off purchases</li>
        </ul>
      </div>
    </div>
  )
}
