import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FolderKanban, LogOut, User, UserRound } from "lucide-react";
import type { AuthUser } from "../context/AuthContext";
import { resolvePublicAssetUrl } from "../lib/authApi";

type ProfileMenuProps = {
  user: AuthUser | null;
  onLogout: () => void;
  onNavigate?: () => void;
};

function getInitials(fullName?: string | null): string {
  if (!fullName?.trim()) return "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

export default function ProfileMenu({
  user,
  onLogout,
  onNavigate,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const initials = getInitials(user?.fullName);
  const displayName = user?.fullName?.split(" ")[0] || "Account";
  const avatarSrc = resolvePublicAssetUrl(user?.avatarUrl);

  useEffect(() => {
    if (!open) return;

    const handlePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  const handleNav = () => {
    close();
    onNavigate?.();
  };

  return (
    <div className="solar-profile-menu" ref={rootRef}>
      <button
        type="button"
        className="solar-profile-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        title={user?.email || displayName}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="solar-profile-avatar" aria-hidden="true">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt=""
              className="solar-profile-avatar-img"
            />
          ) : initials ? (
            <span className="solar-profile-initials">{initials}</span>
          ) : (
            <UserRound size={18} strokeWidth={2} />
          )}
        </span>
        <span className="visually-hidden">Account menu</span>
      </button>

      {open ? (
        <div
          id={menuId}
          className="solar-profile-dropdown"
          role="menu"
          aria-label="Account"
        >
          <div className="solar-profile-dropdown-head">
            <p className="solar-profile-dropdown-name">{displayName}</p>
            {user?.email ? (
              <p className="solar-profile-dropdown-email">{user.email}</p>
            ) : null}
          </div>
          <div className="solar-profile-dropdown-divider" />
          <Link
            to="/profile"
            className="solar-profile-dropdown-item"
            role="menuitem"
            onClick={handleNav}
          >
            <User size={16} strokeWidth={2} aria-hidden="true" />
            Profile
          </Link>
          <Link
            to="/projects"
            className="solar-profile-dropdown-item"
            role="menuitem"
            onClick={handleNav}
          >
            <FolderKanban size={16} strokeWidth={2} aria-hidden="true" />
            Projects
          </Link>
          <div className="solar-profile-dropdown-divider" />
          <button
            type="button"
            className="solar-profile-dropdown-item solar-profile-dropdown-item--danger"
            role="menuitem"
            onClick={() => {
              close();
              onLogout();
            }}
          >
            <LogOut size={16} strokeWidth={2} aria-hidden="true" />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
