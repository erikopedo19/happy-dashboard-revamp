import { Helmet } from "react-helmet-async";

interface SeoProps {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "profile" | "business.business";
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export const SITE = "https://cutzioo.com";
const DEFAULT_IMAGE = `${SITE}/Frame%20316.webp`;

export function Seo({ title, description, path, image, type = "website", noindex, jsonLd }: SeoProps) {
  const url = `${SITE}${path}`;
  const img = image || DEFAULT_IMAGE;
  const desc = description.length > 160 ? `${description.slice(0, 157).trimEnd()}…` : description;
  const ld = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={desc} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large"} />
      <link rel="canonical" href={url} />
      <meta property="og:site_name" content="Cutzioo" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={img} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
      {ld.map((obj, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(obj)}</script>
      ))}
    </Helmet>
  );
}

export default Seo;
