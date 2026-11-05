import { type ReactNode } from "react";
import MarketingNav from "./MarketingNav";

type BlogHeroProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export default function BlogHero({
  title,
  subtitle,
  children,
  className = "",
}: BlogHeroProps) {
  return (
    <section className={`hero d-flex align-items-center ass-bannr blog-hero ${className}`.trim()}>
      <div className="overlay"></div>

      <div className="container-fluid px-lg-4 px-3 position-relative z-1 menu-div ass-div">
        <div className="row align-items-start text-divs gx-3 gx-lg-4">
          <MarketingNav showBlog />

          <div className="nav-bottom-section row align-items-center home-page">
            <div className="col-12 col-lg-10 text-white">
              <h1 className="bannr-text display-5 ass-page blog-hero-title">{title}</h1>
              {subtitle ? (
                <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two blog-hero-subtitle">
                  {subtitle}
                </p>
              ) : null}
              {children}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
