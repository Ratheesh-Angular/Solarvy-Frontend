import { Helmet } from "react-helmet-async";

const SITE_ORIGIN = "https://www.solarvy.net";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

export type PageSeoProps = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  ogImage?: string;
  ogImageAlt?: string;
  ogType?: "website" | "article";
  publishedTime?: string | null;
  modifiedTime?: string | null;
  author?: string;
  section?: string;
  tags?: string[];
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export default function PageSeo({
  title,
  description,
  path,
  noindex = false,
  ogImage = DEFAULT_OG_IMAGE,
  ogImageAlt,
  ogType = "website",
  publishedTime,
  modifiedTime,
  author,
  section,
  tags,
  jsonLd,
}: PageSeoProps) {
  const canonical = path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
  const isArticle = ogType === "article";

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
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="SolarVy" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      {ogImageAlt ? <meta property="og:image:alt" content={ogImageAlt} /> : null}
      {isArticle && publishedTime ? (
        <meta property="article:published_time" content={publishedTime} />
      ) : null}
      {isArticle && modifiedTime ? (
        <meta property="article:modified_time" content={modifiedTime} />
      ) : null}
      {isArticle && author ? <meta property="article:author" content={author} /> : null}
      {isArticle && section ? <meta property="article:section" content={section} /> : null}
      {isArticle && tags
        ? tags.map((tag) => <meta key={tag} property="article:tag" content={tag} />)
        : null}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}
