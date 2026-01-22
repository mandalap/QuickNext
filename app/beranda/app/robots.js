/** @type {import('next').RobotsConfig} */

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quickkasir.com';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

