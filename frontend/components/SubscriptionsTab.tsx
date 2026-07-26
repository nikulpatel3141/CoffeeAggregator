'use client'

export default function SubscriptionsTab() {
  const subscriptions = [
    {
      roaster: 'Origin Coffee',
      url: 'https://www.origincoffee.co.uk/collections/subscriptions',
      price: '£9.50',
      notes: 'Flexible subscription, pause anytime',
    },
    {
      roaster: 'Rave Coffee',
      url: 'https://ravecoffee.co.uk/collections/coffee-subscriptions',
      price: '£8.50',
      notes: 'Free delivery, choose your roast level',
    },
    {
      roaster: 'Ozone Coffee',
      url: 'https://ozonecoffee.co.uk/collections/subscriptions',
      price: '£10.50',
      notes: 'London-based roaster, sustainability focused',
    },
    {
      roaster: 'Dark Arts Coffee',
      url: 'https://www.darkartscoffee.co.uk/collections/coffee-subscriptions',
      price: '£9.25',
      notes: 'Award-winning roaster, seasonal selections',
    },
    {
      roaster: 'Round Hill Roastery',
      url: 'https://www.roundhillroastery.com/collections/subscriptions',
      price: '£8.75',
      notes: 'Ethically sourced, specialty grade',
    },
    {
      roaster: 'Hermanos Coffee',
      url: 'https://hermanoscoffeeroasters.com/collections/coffee-subscriptions',
      price: '£10.00',
      notes: 'Colombian specialty, direct trade',
    },
    {
      roaster: 'Monmouth Coffee',
      url: 'https://www.monmouthcoffee.co.uk/product-category/our-coffee/coffee-subscriptions/',
      price: '£9.50',
      notes: 'Iconic London roaster, sustainably sourced',
    },
    {
      roaster: 'Gotham Coffee',
      url: 'https://gothamcoffee.com/collections/subscriptions',
      price: '£10.50',
      notes: 'Artisan roaster, single origin selections',
    },
    {
      roaster: 'Coffee Compass',
      url: 'https://www.coffeecompass.co.uk/collections/subscriptions',
      price: '£9.75',
      notes: 'Small batch roasting, ethically sourced',
    },
    {
      roaster: 'UE Coffee Roasters',
      url: 'https://www.uecoffeeroasters.com/collections/subscriptions',
      price: '£9.50',
      notes: 'Award-winning Witney roaster, precise roasting',
    },
    {
      roaster: 'Kiss the Hippo',
      url: 'https://kissthehippo.com/collections/subscriptions',
      price: '£11.00',
      notes: 'Carbon-negative, specialty focus',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-coffee-strong mb-3">
          UK Specialty Coffee Subscriptions
        </h2>
        <p className="text-text text-lg">
          Compare subscription plans from top UK roasters. All prices shown are for 250g bags delivered every 2 weeks.
        </p>
      </div>

      <div className="grid gap-3">
        {subscriptions.map((sub, index) => (
          <div
            key={index}
            className="bg-surface rounded-surface shadow-raised p-4 border border-border hover:shadow-floating transition-surface duration-calm ease-gentle"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-coffee-strong">
                  {sub.roaster}
                </h3>
                <p className="text-xs text-muted">{sub.notes}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted">250g every 2 weeks</p>
                  <p className="text-xl font-bold text-coffee-strong">{sub.price}</p>
                </div>
                <a
                  href={sub.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-coffee text-white text-sm px-4 py-2 rounded-surface hover:bg-coffee-strong transition-surface duration-calm ease-gentle font-medium whitespace-nowrap"
                >
                  View Subscription
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-sage/10 border border-sage/30 rounded-surface p-6">
        <h3 className="text-lg font-bold text-sage mb-2">
          💡 Subscription Tips
        </h3>
        <ul className="text-text space-y-2 text-sm">
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
