/** @type {import('next').SitemapConfig} */

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quickkasir.com';

export default function sitemap() {
  const currentDate = new Date().toISOString();

  // ✅ FIX: Sitemap should only include actual pages, not anchor hashes
  // Anchor hashes (#features, #pricing) are sections on the same page, not separate URLs
  // Google and Bing prefer clean sitemaps with only distinct page URLs
  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    // Removed anchor hash URLs (#features, #pricing, etc.) as they're not separate pages
    // These are sections on the main page and will be indexed as part of the main URL
  ];
}

