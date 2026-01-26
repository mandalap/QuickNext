import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quickkasir.com';

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'QuickKasir - Aplikasi Kasir Modern Berbasis Cloud untuk UMKM',
    template: '%s | QuickKasir'
  },
  description: 'QuickKasir — Aplikasi kasir modern berbasis cloud untuk UMKM dan bisnis multi-outlet. Fitur lengkap, cepat, mudah digunakan, dan harga terjangkau. Kelola transaksi, stok, dan laporan dalam satu platform. Solusi POS terbaik untuk meningkatkan efisiensi bisnis Anda.',
  keywords: [
    'QuickKasir',
    'POS',
    'aplikasi kasir',
    'sistem kasir',
    'kasir online',
    'POS Indonesia',
    'aplikasi kasir UMKM',
    'kasir multi outlet',
    'cloud POS',
    'manajemen stok',
    'laporan penjualan',
    'aplikasi kasir modern',
    'sistem kasir cloud',
    'POS untuk UMKM',
    'software kasir',
    'aplikasi toko',
    'sistem inventory',
    'point of sale',
    'kasir restoran',
    'kasir toko',
    'aplikasi kasir gratis',
    'software kasir online'
  ],
  authors: [{ name: 'QuickKasir', url: baseUrl }],
  creator: 'QuickKasir',
  publisher: 'QuickKasir',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: baseUrl,
    siteName: 'QuickKasir',
    title: 'QuickKasir - Aplikasi Kasir Modern Berbasis Cloud untuk UMKM',
    description: 'Solusi POS modern untuk UMKM dan bisnis multi-outlet. Kelola bisnis lebih mudah dengan QuickKasir. Fitur lengkap, cepat, dan harga terjangkau.',
    images: [
      {
        url: `${baseUrl}/logo-qk.png`, // Using logo as OG image
        width: 1200,
        height: 630,
        alt: 'QuickKasir POS Dashboard',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QuickKasir - Aplikasi Kasir Modern Berbasis Cloud',
    description: 'Solusi POS modern untuk UMKM dan bisnis multi-outlet. Kelola bisnis lebih mudah dengan QuickKasir.',
    images: [`${baseUrl}/logo-qk.png`],
    creator: '@quickkasir',
  },
  alternates: {
    canonical: baseUrl,
  },
  icons: {
    icon: '/logo-qk.png',
    apple: '/logo-qk.png',
    shortcut: '/logo-qk.png',
  },
  verification: {
    google: '0SbxrfLo5YxuQali4sbzU-sdSKfdn1qKx024ZvL6ZOQ', // ✅ Google Search Console verification
    // yandex: 'your-yandex-verification-code',
    // yahoo: 'your-yahoo-verification-code',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'QuickKasir',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web, Windows, Mac, Android, iOS',
              url: baseUrl,
              offers: {
                '@type': 'Offer',
                price: '1500',
                priceCurrency: 'IDR',
                priceValidUntil: '2025-12-31',
                availability: 'https://schema.org/InStock',
                url: `${baseUrl}#pricing`
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '1500',
                bestRating: '5',
                worstRating: '1'
              },
              description: 'Aplikasi kasir modern berbasis cloud untuk UMKM dan bisnis multi-outlet. Fitur lengkap, cepat, mudah digunakan, dan harga terjangkau. Solusi POS terbaik untuk meningkatkan efisiensi bisnis Anda.',
              featureList: [
                'Multi Outlet Management',
                'Real-time Inventory',
                'Sales Reports',
                'Cloud Storage',
                'Mobile POS',
                'Payment Integration'
              ],
              screenshot: `${baseUrl}/logo-qk.png`,
              softwareVersion: '1.0',
              releaseNotes: 'Initial release of QuickKasir POS System'
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: baseUrl
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Fitur',
                  item: `${baseUrl}#features`
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: 'Harga',
                  item: `${baseUrl}#pricing`
                },
                {
                  '@type': 'ListItem',
                  position: 4,
                  name: 'Demo',
                  item: `${baseUrl}#demo`
                }
              ]
            })
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}