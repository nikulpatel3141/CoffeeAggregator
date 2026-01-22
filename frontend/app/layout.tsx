import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UK Specialty Coffee Tracker',
  description: 'Track specialty coffee offerings across UK roasters',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
