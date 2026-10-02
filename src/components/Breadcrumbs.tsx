import { Fragment } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import "../css/breadcrumbs.css";

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

const HOME: BreadcrumbItem = { label: "Home", to: "/" };

const ROUTE_LABELS: Record<string, string> = {
  "/start-assessment": "Energy Assessment",
  "/assessment-result": "Assessment Result",
  "/how-it-works": "How It Works",
  "/sample-results": "Sample Results",
  "/who-its-for": "Who It's For",
  "/matched-installers": "Matched Installers",
  "/expert-review": "Expert Review",
  "/request-intro": "Request Intro",
  "/explore-financing": "Explore Financing",
  "/financing-options": "Financing Options",
  "/financing-partners": "Financing Partners",
  "/blog": "Blog",
};

function buildTrail(
  pathname: string,
  searchParams: URLSearchParams,
): BreadcrumbItem[] {
  if (pathname === "/start-assessment") {
    const assessmentId = searchParams.get("assessment")?.trim();
    if (assessmentId) {
      return [
        HOME,
        {
          label: ROUTE_LABELS["/assessment-result"],
          to: `/assessment-result?assessment=${encodeURIComponent(assessmentId)}`,
        },
        { label: "Edit Assessment" },
      ];
    }
    if (searchParams.get("draft")?.trim()) {
      return [
        HOME,
        { label: ROUTE_LABELS["/start-assessment"], to: "/start-assessment" },
        { label: "Draft" },
      ];
    }
  }

  if (pathname === "/assessment-result") {
    return [
      HOME,
      { label: ROUTE_LABELS["/start-assessment"], to: "/start-assessment" },
      { label: ROUTE_LABELS["/assessment-result"] },
    ];
  }

  const label = ROUTE_LABELS[pathname];
  return label ? [HOME, { label }] : [HOME];
}

export default function Breadcrumbs({ className = "" }: { className?: string }) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const items = buildTrail(pathname, searchParams);

  if (items.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb" className={`solar-breadcrumbs ${className}`.trim()}>
      <ol className="solar-breadcrumbs-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li className="solar-breadcrumbs-item">
                {isLast || !item.to ? (
                  <span
                    className="solar-breadcrumbs-current"
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link className="solar-breadcrumbs-link" to={item.to}>
                    {item.label}
                  </Link>
                )}
              </li>
              {!isLast && (
                <li className="solar-breadcrumbs-separator" aria-hidden="true">
                  ›
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
