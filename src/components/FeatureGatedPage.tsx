import type { ReactElement } from "react";
import UpcomingPage from "../pages/UpcomingPage";

type FeatureGatedPageProps = {
  enabled: boolean;
  upcomingTitle: string;
  upcomingDescription: string;
  path: string;
  children: ReactElement;
};

export default function FeatureGatedPage({
  enabled,
  upcomingTitle,
  upcomingDescription,
  path,
  children,
}: FeatureGatedPageProps) {
  if (!enabled) {
    return (
      <UpcomingPage
        title={upcomingTitle}
        description={upcomingDescription}
        path={path}
      />
    );
  }
  return children;
}