import { Helmet } from "react-helmet-async";

const SITE_ORIGIN = "https://www.solarvy.net";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

export type PageSeoProps = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  ogImage?: string;
};

export default function PageSeo({
  title,
  description,
  path,
  noindex = false,
  ogImage = DEFAULT_OG_IMAGE,
}: PageSeoProps) {
  const canonical = path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="SolarVy" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
