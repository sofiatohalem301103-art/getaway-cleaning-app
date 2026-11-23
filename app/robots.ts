import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/customer/',
        '/admin/',
        '/staff/',
        '/auth/',
        '/login/',
        '/api/',
      ],
    },
    sitemap: 'https://www.getaway-cleaning.com/sitemap.xml',
  };
}