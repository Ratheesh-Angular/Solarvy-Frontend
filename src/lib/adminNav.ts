export type AdminPageKey =
  | "dashboard"
  | "users"
  | "assessments"
  | "financing"
  | "leads"
  | "excel-template"
  | "blogs"
  | "blog-analytics"
  | "bill-input"
  | "recommendations";

export type AdminNavSection = "Workspace" | "Content" | "AI Training";

export type AdminNavItem = {
  key: AdminPageKey;
  label: string;
  to: string;
  section: AdminNavSection;
  end?: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    to: "/admin/dashboard",
    section: "Workspace",
    end: true,
  },
  {
    key: "users",
    label: "Users",
    to: "/admin/users",
    section: "Workspace",
  },
  {
    key: "assessments",
    label: "Assessments",
    to: "/admin/assessments",
    section: "Workspace",
  },
  {
    key: "financing",
    label: "Financing",
    to: "/admin/financing",
    section: "Workspace",
  },
  {
    key: "leads",
    label: "Leads",
    to: "/admin/leads",
    section: "Workspace",
  },
  {
    key: "excel-template",
    label: "Excel Template",
    to: "/admin/excel-template",
    section: "Workspace",
  },
  {
    key: "blogs",
    label: "Blogs",
    to: "/admin/blogs",
    section: "Content",
  },
  {
    key: "blog-analytics",
    label: "Blog Analytics",
    to: "/admin/blog-analytics",
    section: "Content",
  },
  {
    key: "bill-input",
    label: "Bill Input",
    to: "/admin/bill-input",
    section: "AI Training",
  },
  {
    key: "recommendations",
    label: "Recommendations",
    to: "/admin/recommendations",
    section: "AI Training",
  },
];

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  "Workspace",
  "Content",
  "AI Training",
];

export const ADMIN_PAGE_KEYS: AdminPageKey[] = ADMIN_NAV_ITEMS.map(
  (item) => item.key,
);

export function adminHasPageAccess(
  user: {
    isSuperAdmin?: boolean;
    permissions?: string[];
  } | null | undefined,
  pageKey: AdminPageKey | "users-roles",
): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  if (pageKey === "users-roles") return false;
  return (user.permissions ?? []).includes(pageKey);
}

export function getFirstAllowedAdminPath(user: {
  isSuperAdmin?: boolean;
  permissions?: string[];
} | null | undefined): string | null {
  if (!user) return null;
  if (user.isSuperAdmin) return "/admin/dashboard";
  for (const item of ADMIN_NAV_ITEMS) {
    if ((user.permissions ?? []).includes(item.key)) {
      return item.to;
    }
  }
  return null;
}

/** Resolve which page key a pathname belongs to (longest prefix match). */
export function getAdminPageKeyForPath(
  pathname: string,
): AdminPageKey | "users-roles" | null {
  const normalized = pathname.replace(/\/+$/, "") || "/";

  if (
    normalized === "/admin/users-roles" ||
    normalized.startsWith("/admin/users-roles/")
  ) {
    return "users-roles";
  }

  // Prefer more specific prefixes first (blogs before nothing else conflicts).
  const ordered = [...ADMIN_NAV_ITEMS].sort(
    (a, b) => b.to.length - a.to.length,
  );

  for (const item of ordered) {
    if (normalized === item.to || normalized.startsWith(`${item.to}/`)) {
      return item.key;
    }
  }

  // Legacy /admin/visitors redirects to users
  if (
    normalized === "/admin/visitors" ||
    normalized.startsWith("/admin/visitors/")
  ) {
    return "users";
  }

  return null;
}
