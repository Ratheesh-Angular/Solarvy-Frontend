import { createPortal } from "react-dom";
import sunBlue from "../assets/images/icon/sun-blue.svg";

type SolarvyLoaderProps = {
  open: boolean;
  message?: string;
  detail?: string;
  progress?: number;
};

export default function SolarvyLoader({
  open,
  message = "Please wait...",
  detail,
  progress,
}: SolarvyLoaderProps) {
  if (!open || typeof document === "undefined") return null;

  const showProgress = progress !== undefined;
  const clamped = showProgress
    ? Math.min(100, Math.max(1, Math.round(progress)))
    : 1;
  const label = detail ? `${message} ${detail}` : message;

  return createPortal(
    <div
      className={`solarvy-loader-overlay${showProgress ? " has-progress" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={showProgress ? `${label} ${clamped}%` : label}
    >
      <div className="solarvy-loader-card">
        <div className="solarvy-loader-spinner-wrap">
          {showProgress ? null : (
            <div className="solarvy-loader-ring" aria-hidden />
          )}
          <img
            src={sunBlue}
            alt=""
            className="solarvy-loader-icon"
            aria-hidden
          />
        </div>
        <p className="solarvy-loader-message">{message}</p>
        {detail ? <p className="solarvy-loader-detail">{detail}</p> : null}
        {showProgress ? (
          <div className="solarvy-loader-progress">
            <div
              className="solarvy-loader-progress-track"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={100}
              aria-valuenow={clamped}
              aria-label={message}
            >
              <div
                className="solarvy-loader-progress-fill"
                style={{ transform: `scaleX(${clamped / 100})` }}
              />
            </div>
            <p className="solarvy-loader-progress-value">{clamped}%</p>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
