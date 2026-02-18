import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description?: string;
  name?: string;
  type?: string;
  image?: string;
  url?: string;
  jsonLd?: Record<string, any>;
}

export const SEO = ({ 
  title, 
  description = "Clstr - The premier campus social ecosystem.", 
  name = "Clstr", 
  type = "website",
  image = "/og-image.png",
  url,
  jsonLd
}: SEOProps) => {
  const siteTitle = `${title} | ${name}`;
  const currentUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{siteTitle}</title>
      <meta name='description' content={description} />
      
      {/* Open Graph tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={currentUrl} />
      
      {/* Twitter tags */}
      <meta name="twitter:creator" content={name} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      
      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};
