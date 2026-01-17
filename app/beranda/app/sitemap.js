/** @type {import('next').SitemapConfig} */

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quickkasir.com';

export default function sitemap() {
  const currentDate = new Date().toISOString();

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}#features`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}#pricing`,
      lastModified: currentDate,
      changeFrequency: 'weekly', // Pricing plans update frequently
      priority: 0.9,
    },
    {
      url: `${baseUrl}#demo`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}#testimonials`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}#faq`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}

