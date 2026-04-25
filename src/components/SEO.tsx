import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'video.movie' | 'video.tv_show' | 'profile';
  schema?: any;
}

const DEFAULT_TITLE = 'Axis TV — Watch Movies and Series Online';
const DEFAULT_DESCRIPTION = 'Stream the latest movies, trending series, and popular anime for free on Axis TV. Your home for high-quality entertainment and instant streaming.';
const DEFAULT_KEYWORDS = 'watch movies online, stream series, axis tv, free movies, watch anime, latest series, hd movies';
const SITE_URL = 'https://axislabs.dpdns.org/';
const DEFAULT_IMAGE = 'https://i.ibb.co/Zz9CLQw3/431d475fa275.jpg';

export const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  image = DEFAULT_IMAGE,
  url = SITE_URL,
  type = 'website',
  schema
}) => {
  const fullTitle = title ? `${title} | Axis TV` : DEFAULT_TITLE;
  const canonicalUrl = url.startsWith('http') ? url : `${SITE_URL}${url.startsWith('/') ? url.slice(1) : url}`;

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonicalUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Structured Data (JSON-LD) */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}

      {/* Default Website Schema */}
      {!schema && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Axis TV",
            "url": SITE_URL,
            "potentialAction": {
              "@type": "SearchAction",
              "target": `${SITE_URL}search?q={search_term_string}`,
              "query-input": "required name=search_term_string"
            }
          })}
        </script>
      )}
    </Helmet>
  );
};
