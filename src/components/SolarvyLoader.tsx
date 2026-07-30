import { createPortal } from "react-dom";
import sunBlue from "../assets/images/icon/sun-blue.svg";

type SolarvyLoaderProps = {
  open: boolean;
  message?: string;
};

export default function SolarvyLoader({
  open,
  message = "Please wait...",
}: SolarvyLoaderProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="solarvy-loader-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <div className="solarvy-loader-card">
        <div className="solarvy-loader-spinner-wrap">
          <div className="solarvy-loader-ring" aria-hidden />
          <img
            src={sunBlue}
            alt=""
            className="solarvy-loader-icon"
            aria-hidden
          />
        </div>
        <p className="solarvy-loader-message">{message}</p>
      </div>
    </div>,
    document.body,
  );
}
