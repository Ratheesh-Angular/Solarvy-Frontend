import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import sunone from "../assets/images/icon/sun.svg";
import sunthree from "../assets/images/icon/sun1.svg";
import save from "../assets/images/icon/save.svg";
import buleone from "../assets/images/icon/bule1.svg";
import buletwo from "../assets/images/icon/bule2.svg";
import bulethree from "../assets/images/icon/bule3.svg";
import bulefour from "../assets/images/icon/sun-blue.svg";
import iconBulb from "../assets/appliances-icons/bulb-with-bolt-svgrepo-com.svg";
import iconFan from "../assets/appliances-icons/fan-circled-svgrepo-com.svg";
import iconTv from "../assets/appliances-icons/tv-television-svgrepo-com.svg";
import iconAc from "../assets/appliances-icons/air-conditioner-svgrepo-com (1).svg";
import iconFridge from "../assets/appliances-icons/fridge-kitchen-svgrepo-com.svg";
import iconFreezer from "../assets/appliances-icons/freezer-svgrepo-com.svg";
import iconRouter from "../assets/appliances-icons/router-svgrepo-com.svg";
import iconComputer from "../assets/appliances-icons/computer-svgrepo-com.svg";
import iconCctv from "../assets/appliances-icons/cctv-svgrepo-com.svg";
import iconCompressor from "../assets/appliances-icons/compressor-svgrepo-com.svg";
import iconMotor from "../assets/appliances-icons/motor-alt-svgrepo-com.svg";
import iconMedical from "../assets/appliances-icons/medical-kit-svgrepo-com.svg";
import {
  BatteryCharging,
  Building2,
  Calculator,
  Factory,
  Fuel,
  Home,
  Hospital,
  Hotel,
  LayoutGrid,
  PlugZap,
  Receipt,
  School,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Wallet,
  Wrench,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import FeedbackToast from "../components/FeedbackToast";
import SolarvyLoader from "../components/SolarvyLoader";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import { useSyncedProgress } from "../hooks/useSyncedProgress";
import { ApiError } from "../lib/api";
import {
  completeAssessment,
  completeAssessmentDraft,
  createAssessmentDraft,
  getAssessmentDraft,
  updateAssessmentDraft,
} from "../lib/assessmentApi";
import {
  applyAssessmentFormData,
  buildAssessmentFormData,
} from "../lib/assessmentFormHelpers";
import {
  DEFAULT_GRID_TARIFF,
  formatIntegerWithCommas,
  formatUsageFromSpend,
  parseFormattedNumber,
} from "../lib/assessmentConstants";
import {
  extractBillValues,
  getExcelCatalogs,
  getLiveSummary,
  getTemplatePrefill,
} from "../lib/excelApi";
import type {
  ExcelCatalogs,
  EquipmentCatalogItem,
  LoadTableRow,
  TemplatePrefillRow,
} from "../types/assessment";

type ApplianceCatalogItem = {
  kind: string;
  label: string;
  defaultPower: number;
  defaultHours: number;
  /** Duty cycle as 0–1 from Equipment Default. */
  defaultDutyCycle: number;
  iconSrc: string | null;
};

/** Distinct SVG lookup — most specific patterns first. Unmatched names get no pictogram. */
const EQUIPMENT_ICON_RULES: Array<[RegExp, string]> = [
  [/freezer/i, iconFreezer],
  [/fridge|refrigerator/i, iconFridge],
  [/bulb|light|led/i, iconBulb],
  [/fan/i, iconFan],
  [/cctv|camera/i, iconCctv],
  [/\btv\b|television|display/i, iconTv],
  [/\bac\b|a\/c|air[-\s]?condit/i, iconAc],
  [/router|wifi|wlan/i, iconRouter],
  [/computer|laptop|\bpc\b|desktop/i, iconComputer],
  [/compressor/i, iconCompressor],
  [/motor|pump/i, iconMotor],
  [/medical|first[-\s]?aid/i, iconMedical],
];

function iconForEquipment(name: string): string | null {
  for (const [pattern, src] of EQUIPMENT_ICON_RULES) {
    if (pattern.test(name)) return src;
  }
  return null;
}

function applianceNameAbbreviation(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }
  const compact = name.trim().replace(/[^a-zA-Z0-9]/g, "");
  return compact.slice(0, 2).toUpperCase() || "—";
}

/** Excel-relevant row fields only; omit derived dailyKwhExcel so writeback does not retrigger live-summary. */
function equipmentLiveSummarySignature(rows: LoadTableRow[]) {
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    qty: row.qty,
    hours: row.hours,
    power: row.power,
    loadFactorPct: row.loadFactorPct ?? 100,
    excelRow: row.excelRow ?? null,
    source: row.source ?? null,
    removed: Boolean(row.removed),
  }));
}

function LiveSummaryCardSkeleton({
  variant,
}: {
  variant: "desktop" | "mobile";
}) {
  if (variant === "mobile") {
    return (
      <div
        className="assessment-summary-mobile-row live-summary-card-skeleton"
        aria-hidden
      >
        <span className="live-summary-skeleton-circle" />
        <div className="live-summary-skeleton-lines">
          <span className="live-summary-skeleton-bar live-summary-skeleton-bar--value" />
          <span className="live-summary-skeleton-bar live-summary-skeleton-bar--label" />
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card text-center live-summary-card-skeleton" aria-hidden>
      <span className="live-summary-skeleton-circle" />
      <span className="live-summary-skeleton-bar live-summary-skeleton-bar--value" />
      <span className="live-summary-skeleton-bar live-summary-skeleton-bar--label" />
    </div>
  );
}

/** Build the appliance dropdown catalog from the Excel equipment list. */
function catalogFromEquipment(
  items: EquipmentCatalogItem[],
): ApplianceCatalogItem[] {
  return items.map((item) => ({
    kind: item.name,
    label: item.name,
    defaultPower: item.watts,
    defaultHours: item.hoursPerDay || 8,
    defaultDutyCycle:
      Number.isFinite(item.dutyCycle) && item.dutyCycle > 0
        ? item.dutyCycle
        : 1,
    iconSrc: iconForEquipment(item.name),
  }));
}

const FALLBACK_EQUIPMENT_CATALOG: ApplianceCatalogItem[] = [
  {
    kind: "LED bulb",
    label: "LED bulb",
    defaultPower: 10,
    defaultHours: 6,
    defaultDutyCycle: 1,
    iconSrc: iconBulb,
  },
  {
    kind: "Fan",
    label: "Fan",
    defaultPower: 60,
    defaultHours: 8,
    defaultDutyCycle: 1,
    iconSrc: iconFan,
  },
  {
    kind: "TV",
    label: "TV",
    defaultPower: 100,
    defaultHours: 6,
    defaultDutyCycle: 1,
    iconSrc: iconTv,
  },
  {
    kind: "AC 1HP",
    label: "AC 1HP",
    defaultPower: 900,
    defaultHours: 5,
    defaultDutyCycle: 0.6,
    iconSrc: iconAc,
  },
];

const PROPERTY_ICONS: Record<string, LucideIcon> = {
  Home: Home,
  Hotel: Hotel,
  Factory: Factory,
  Commercial: Building2,
  Hospital: Hospital,
  School: School,
};

const PROPERTY_DESCRIPTIONS: Record<string, string> = {
  Home: "Backup and lower energy bills",
  Hotel: "Optimise generator and hybrid power",
  Factory: "Support larger equipment loads",
  Commercial: "Reduce business electricity cost",
  Hospital: "Reliable power for critical systems",
  School: "Maximise daytime solar savings",
};

const POWER_SETUP_ICONS: Record<string, LucideIcon> = {
  "Grid + Generator": PlugZap,
  "Grid Only": LayoutGrid,
  "Solar + Grid": Sun,
  "Generator Only": Fuel,
  "No Reliable Grid": BatteryCharging,
};

const POWER_SETUP_DESCRIPTIONS: Record<string, string> = {
  "Grid + Generator": "Grid supply with backup generator",
  "Grid Only": "Utility electricity supply only",
  "Solar + Grid": "Solar connected with utility supply",
  "Generator Only": "Generator is the main power source",
  "No Reliable Grid": "Little or no grid availability",
};

const OBJECTIVE_ICONS: Record<string, LucideIcon> = {
  "Reduce Diesel Use": Fuel,
  "Reduce Electricity Bills": Wallet,
  "Backup During Outages": BatteryCharging,
};

const OBJECTIVE_DESCRIPTIONS: Record<string, string> = {
  "Reduce Diesel Use": "Cut diesel consumption.",
  "Reduce Electricity Bills": "Lower monthly energy costs.",
  "Backup During Outages": "Maintain power when grid fails.",
};

const MIN_EQUIP_ROWS = 1;
/**
 * Appliance_Input: template zone A4:A20 + user extras A21:A40
 * (matches Backend APPLIANCE_TABLE endRow - startRow + 1).
 */
const MAX_EQUIP_ROWS = 37;
const ROWS_PER_PAGE = 5;
const APPLIANCE_USER_EXCEL_START = 21;
const APPLIANCE_USER_EXCEL_END = 40;
const CUSTOM_EXCEL_START = 4;
const CUSTOM_EXCEL_END = 23;

function nextApplianceExcelRow(rows: LoadTableRow[]): number | null {
  const occupied = new Set<number>();
  for (const row of rows) {
    const slot = row.excelRow;
    if (
      typeof slot === "number" &&
      slot >= APPLIANCE_USER_EXCEL_START &&
      slot <= APPLIANCE_USER_EXCEL_END
    ) {
      occupied.add(slot);
    }
  }
  for (let r = APPLIANCE_USER_EXCEL_START; r <= APPLIANCE_USER_EXCEL_END; r++) {
    if (!occupied.has(r)) return r;
  }
  return null;
}

function nextCustomExcelRow(rows: LoadTableRow[]): number | null {
  const occupied = new Set<number>();
  for (const row of rows) {
    const slot = row.excelRow;
    if (
      typeof slot === "number" &&
      slot >= CUSTOM_EXCEL_START &&
      slot <= CUSTOM_EXCEL_END
    ) {
      occupied.add(slot);
    }
  }
  for (let r = CUSTOM_EXCEL_START; r <= CUSTOM_EXCEL_END; r++) {
    if (!occupied.has(r)) return r;
  }
  return null;
}

function visibleEquipmentRows(rows: LoadTableRow[]): LoadTableRow[] {
  return rows.filter((row) => !row.removed);
}

function getPaginationMeta(totalRows: number, page: number) {
  if (totalRows === 0) {
    return {
      totalPages: 1,
      safePage: 1,
      startIndex: 0,
      endIndex: 0,
      showFrom: 0,
      showTo: 0,
    };
  }
  const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * ROWS_PER_PAGE;
  const endIndex = Math.min(startIndex + ROWS_PER_PAGE, totalRows);
  return {
    totalPages,
    safePage,
    startIndex,
    endIndex,
    showFrom: startIndex + 1,
    showTo: endIndex,
  };
}

type TablePaginationProps = {
  totalRows: number;
  page: number;
  onPageChange: (page: number) => void;
};

function TablePagination({
  totalRows,
  page,
  onPageChange,
}: TablePaginationProps) {
  const { totalPages, safePage, showFrom, showTo } = getPaginationMeta(
    totalRows,
    page,
  );

  if (totalRows === 0) return null;

  const label =
    totalRows <= ROWS_PER_PAGE
      ? `Showing all ${totalRows} row${totalRows === 1 ? "" : "s"}`
      : `Showing ${showFrom}–${showTo} of ${totalRows} rows`;

  return (
    <div className="ass-table-pagination">
      <span className="ass-table-pagination__summary text-muted small">
        {label}
      </span>
      {totalRows > ROWS_PER_PAGE && (
        <div className="ass-table-pagination__controls">
          <button
            type="button"
            className="ass-table-pagination__btn"
            disabled={safePage <= 1}
            aria-label="Previous page"
            onClick={() => onPageChange(safePage - 1)}
          >
            Previous
          </button>
          <span className="ass-table-pagination__page small">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            className="ass-table-pagination__btn"
            disabled={safePage >= totalPages}
            aria-label="Next page"
            onClick={() => onPageChange(safePage + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

const newRowId = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`}`;

/** Equipment Default duty cycle (0–1, or 0–100) → UI loadFactorPct 0–100. */
const loadFactorPctFromDuty = (duty: number): number => {
  if (!Number.isFinite(duty) || duty <= 0) return 100;
  return Math.round((duty <= 1 ? duty : duty / 100) * 100);
};

const catalogNumericPrefill = (item: ApplianceCatalogItem) => ({
  qty: 1,
  hours: item.defaultHours,
  power: item.defaultPower,
  loadFactorPct: loadFactorPctFromDuty(item.defaultDutyCycle),
});

const rowFromCatalogItem = (
  prefix: string,
  item: ApplianceCatalogItem,
): LoadTableRow => {
  return {
    id: newRowId(prefix),
    kind: item.kind,
    ...catalogNumericPrefill(item),
    source: "user",
  };
};

/** Map Appliance_Input prefill rows into UI table rows. */
const rowsFromAppliancePrefill = (
  prefillRows: TemplatePrefillRow[],
): LoadTableRow[] =>
  prefillRows.map((row) => {
    return {
      id: newRowId("ap"),
      kind: row.name,
      qty: Number(row.qty) || 0,
      hours: Number(row.hours) || 0,
      power: Number(row.watts) || 0,
      loadFactorPct: loadFactorPctFromDuty(Number(row.dutyCycle)),
      excelRow: row.excelRow,
      source: "template" as const,
      dailyKwhExcel:
        row.dailyKwh === null || row.dailyKwh === undefined
          ? undefined
          : Number(row.dailyKwh),
    };
  });

const defaultRowFromCatalog = (
  prefix: string,
  catalog: ApplianceCatalogItem[],
  preferredKind?: string,
): LoadTableRow => {
  const source = catalog.length ? catalog : FALLBACK_EQUIPMENT_CATALOG;
  const item =
    (preferredKind
      ? source.find((entry) => entry.kind === preferredKind)
      : undefined) ??
    source[0] ??
    FALLBACK_EQUIPMENT_CATALOG[0];
  return rowFromCatalogItem(prefix, item);
};

function ApplianceKindSelect({
  rowIndex,
  catalog,
  valueKind,
  onPick,
  openRow,
  onOpenChange,
  allowCustomName = false,
}: {
  rowIndex: number;
  catalog: ApplianceCatalogItem[];
  valueKind: string;
  onPick: (kind: string) => void;
  openRow: number | null;
  onOpenChange: (row: number | null) => void;
  allowCustomName?: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const customNameRef = useRef<HTMLInputElement>(null);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customNameDraft, setCustomNameDraft] = useState("");
  const selected = catalog.find((o) => o.kind === valueKind);
  const isCustomKind = Boolean(allowCustomName && valueKind && !selected);
  const isOpen = openRow === rowIndex;
  const triggerIconSrc = selected?.iconSrc ?? null;
  const triggerLabel = selected?.label ?? (valueKind?.trim() || "—");

  const filteredCatalog = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.kind.toLowerCase().includes(q),
    );
  })();

  const commitCustomName = () => {
    const trimmed = customNameDraft.trim();
    if (!trimmed) return;
    onPick(trimmed);
    setCustomNameDraft("");
    onOpenChange(null);
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPos(null);
      setSearchQuery("");
      setCustomNameDraft(isCustomKind ? valueKind : "");
      return;
    }
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const margin = 16;
      const maxMenuW = Math.min(420, vw - margin * 2);
      const minWidth = Math.min(Math.max(r.width, 260), maxMenuW);
      let left = r.left;
      if (left + minWidth > vw - margin) {
        left = vw - margin - minWidth;
      }
      left = Math.max(margin, left);
      setMenuPos({
        top: r.bottom + 4,
        left,
        minWidth,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen, isCustomKind, valueKind]);

  useEffect(() => {
    if (!isOpen) return;
    const id = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [isOpen]);

  return (
    <div
      className={`appliance-select-cell position-relative${isOpen ? " appliance-select-cell--open" : ""}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className="appliance-select-trigger"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title={triggerLabel !== "—" ? triggerLabel : undefined}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(isOpen ? null : rowIndex);
        }}
      >
        <span className="appliance-select-trigger-inner">
          <span className="tables-icon-box-custom appliance-select-icon-wrap">
            {triggerIconSrc ? (
              <img
                src={triggerIconSrc}
                alt=""
                aria-hidden
                width={20}
                height={20}
                className="appliance-select-trigger-icon"
              />
            ) : (
              <span className="appliance-select-icon-fallback" aria-hidden>
                {applianceNameAbbreviation(triggerLabel)}
              </span>
            )}
          </span>
          <span className="appliance-select-label">{triggerLabel}</span>
          <ChevronDown
            className="appliance-select-chevron"
            size={18}
            aria-hidden
          />
        </span>
      </button>
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="appliance-select-backdrop"
              role="presentation"
              onPointerDown={() => onOpenChange(null)}
            />
            {menuPos ? (
              <div
                className="appliance-select-menu appliance-select-menu--portal"
                style={{
                  position: "fixed",
                  top: menuPos.top,
                  left: menuPos.left,
                  minWidth: menuPos.minWidth,
                  width: menuPos.minWidth,
                  maxWidth: "min(420px, calc(100vw - 32px))",
                  zIndex: 1000000,
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="appliance-select-search w-100">
                  <input
                    ref={searchRef}
                    type="search"
                    className="appliance-select-search-input w-100"
                    placeholder="Search appliances…"
                    value={searchQuery}
                    aria-label="Search appliances"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        onOpenChange(null);
                      }
                    }}
                  />
                </div>
                <ul className="appliance-select-menu-list" role="listbox">
                  {filteredCatalog.length === 0 ? (
                    <li className="appliance-select-empty" role="presentation">
                      No matches
                    </li>
                  ) : (
                    filteredCatalog.map((opt) => {
                      const active = opt.kind === valueKind;
                      return (
                        <li key={opt.kind} role="none">
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            className={`appliance-select-option${active ? " is-active" : ""}`}
                            title={opt.label}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onPick(opt.kind);
                              onOpenChange(null);
                            }}
                          >
                            <span className="tables-icon-box-custom appliance-select-icon-wrap">
                              {opt.iconSrc ? (
                                <img
                                  src={opt.iconSrc}
                                  alt=""
                                  aria-hidden
                                  width={20}
                                  height={20}
                                  className="appliance-select-trigger-icon"
                                />
                              ) : (
                                <span
                                  className="appliance-select-icon-fallback"
                                  aria-hidden
                                >
                                  {applianceNameAbbreviation(opt.label)}
                                </span>
                              )}
                            </span>
                            <span className="appliance-select-option-label">
                              {opt.label}
                            </span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
                {allowCustomName && (
                  <div className="appliance-select-search w-100 border-top pt-2 mt-1">
                    <input
                      ref={customNameRef}
                      type="text"
                      className="appliance-select-search-input w-100"
                      placeholder="custom"
                      aria-label="Custom equipment name"
                      value={customNameDraft}
                      onChange={(e) => setCustomNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          commitCustomName();
                        }
                        if (e.key === "Escape") {
                          e.stopPropagation();
                          onOpenChange(null);
                        }
                      }}
                    />
                    <p className="small text-muted mb-0 mt-1 px-1">
                      Press Enter to use a custom name
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </>,
          document.body,
        )}
    </div>
  );
}

/** Stable slug → official state name (36 states + FCT). */
const NIGERIA_STATES: Record<string, string> = {
  abia: "Abia",
  adamawa: "Adamawa",
  akwa_ibom: "Akwa Ibom",
  anambra: "Anambra",
  bauchi: "Bauchi",
  bayelsa: "Bayelsa",
  benue: "Benue",
  borno: "Borno",
  cross_river: "Cross River",
  delta: "Delta",
  ebonyi: "Ebonyi",
  edo: "Edo",
  ekiti: "Ekiti",
  enugu: "Enugu",
  fct: "Federal Capital Territory",
  gombe: "Gombe",
  imo: "Imo",
  jigawa: "Jigawa",
  kaduna: "Kaduna",
  kano: "Kano",
  katsina: "Katsina",
  kebbi: "Kebbi",
  kogi: "Kogi",
  kwara: "Kwara",
  lagos: "Lagos",
  nasarawa: "Nasarawa",
  niger: "Niger",
  ogun: "Ogun",
  ondo: "Ondo",
  osun: "Osun",
  oyo: "Oyo",
  plateau: "Plateau",
  rivers: "Rivers",
  sokoto: "Sokoto",
  taraba: "Taraba",
  yobe: "Yobe",
  zamfara: "Zamfara",
};

const NIGERIA_STATES_SORTED = Object.entries(NIGERIA_STATES).sort((a, b) =>
  a[1].localeCompare(b[1]),
);

function Assesement() {
  const [open, setOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [showTemplatePopup, setShowTemplatePopup] = useState(false);
  const [selectedPower, setSelectedPower] = useState("");
  const [inputMethod, setInputMethod] = useState<
    "bill" | "appliance" | "custom"
  >("bill");
  const [selectedObjective, setSelectedObjective] = useState("");
  const [catalogs, setCatalogs] = useState<ExcelCatalogs | null>(null);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [isExtractingBill, setIsExtractingBill] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const draftIdParam = searchParams.get("draft");
  const [draftId, setDraftId] = useState<number | null>(
    draftIdParam ? Number(draftIdParam) : null,
  );
  const [isLoadingDraft, setIsLoadingDraft] = useState(Boolean(draftIdParam));
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLiveSummary, setIsLoadingLiveSummary] = useState(false);
  const isSlowApi = isExtractingBill || isSubmitting;
  const isApiBusy =
    isLoadingCatalogs ||
    isLoadingDraft ||
    isPrefilling ||
    isExtractingBill ||
    isSavingDraft ||
    isSubmitting;
  const loaderExpectedMs = isSubmitting ? 4000 : isExtractingBill ? 6000 : 700;
  const {
    open: loaderOpen,
    progress: loaderProgress,
    finishLoader,
    abortLoader,
  } = useSyncedProgress(isSlowApi, loaderExpectedMs);
  const [excelEstimatedAnnualLoad, setExcelEstimatedAnnualLoad] = useState<
    number | null
  >(null);
  const [excelEstimatedMonthlySpend, setExcelEstimatedMonthlySpend] = useState<
    number | null
  >(null);
  const [excelEstimatedMonthlyEnergy, setExcelEstimatedMonthlyEnergy] =
    useState<number | null>(null);
  const liveSummaryRequestRef = useRef(0);
  const lastLiveSummaryKeyRef = useRef<string | null>(null);
  const { toast, showSuccess, showError, clearToast } = useFeedbackToast();
  const [billNotes, setBillNotes] = useState("");
  const [monthlyUsage, setMonthlyUsage] = useState("");
  const [usageUnit, setUsageUnit] = useState("kWh");
  const [monthlySpend, setMonthlySpend] = useState("");
  const [gridTariff, setGridTariff] = useState(DEFAULT_GRID_TARIFF);
  const [monthlyElectricityBill, setMonthlyElectricityBill] = useState("");
  const monthlyUsageTouchedRef = useRef(false);
  type CalculateFieldErrors = {
    country?: string;
    state?: string;
    powerSetup?: string;
    backupDuration?: string;
    mainObjective?: string;
  };
  const [calculateErrors, setCalculateErrors] = useState<CalculateFieldErrors>(
    {},
  );
  const [roofArea, setRoofArea] = useState("200");
  const [backupDuration, setBackupDuration] = useState("");
  const templatePromptHandledRef = useRef(false);
  const handleToggle = () => {
    if (window.innerWidth < 768) {
      setOpen(!open);
    }
  };
  const navigate = useNavigate();
  const options: {
    id: string;
    title: string;
    desc: string;
    Icon: LucideIcon;
  }[] = [
    {
      id: "bill",
      title: "Monthly Bill",
      desc: "Upload a bill and let AI fill your usage values.",
      Icon: Receipt,
    },
    {
      id: "appliance",
      title: "Appliance Calculator",
      desc: "Select appliances and hours.",
      Icon: Calculator,
    },
    {
      id: "custom",
      title: "Custom Equipment",
      desc: "For factories, specialist loads.",
      Icon: Wrench,
    },
  ];

  /** Property / power / objective cards driven by Excel catalogs (with fallbacks). */
  const propertyOptions = (
    catalogs?.propertyTypes ?? Object.keys(PROPERTY_ICONS)
  ).map((label) => ({
    title: label,
    desc:
      catalogs?.categoryDescriptions?.[label]?.bestFor ||
      PROPERTY_DESCRIPTIONS[label] ||
      "",
    Icon: PROPERTY_ICONS[label] ?? Building2,
  }));

  const powerOptions = (
    catalogs?.powerSetups ?? Object.keys(POWER_SETUP_ICONS)
  ).map((label) => ({
    title: label,
    desc: POWER_SETUP_DESCRIPTIONS[label] ?? "",
    Icon: POWER_SETUP_ICONS[label] ?? PlugZap,
  }));

  const Objectiveoptions = (
    catalogs?.objectives ?? Object.keys(OBJECTIVE_ICONS)
  ).map((label) => ({
    title: label,
    desc: OBJECTIVE_DESCRIPTIONS[label] ?? "",
    Icon: OBJECTIVE_ICONS[label] ?? Wallet,
  }));

  const equipmentCatalog: ApplianceCatalogItem[] = catalogs?.equipmentCatalog
    ?.length
    ? catalogFromEquipment(catalogs.equipmentCatalog)
    : FALLBACK_EQUIPMENT_CATALOG;

  const templateOptions =
    selectedProperty && catalogs
      ? (catalogs.templatesByProperty[selectedProperty] ?? [])
      : [];

  const [formData, setFormData] = useState({
    country: "",
    state: "",
  });

  const [fileName, setFileName] = useState("No file chosen");
  const [billFile, setBillFile] = useState<File | null>(null);
  const [billAiApplied, setBillAiApplied] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      if (name === "country") {
        return {
          ...prev,
          country: value,
          state: value === "Nigeria" ? prev.state : "",
        };
      }
      return { ...prev, [name]: value };
    });

    setCalculateErrors((prev) => {
      if (name !== "country" && name !== "state") return prev;
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const clearCalculateError = (key: keyof CalculateFieldErrors) => {
    setCalculateErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const [applianceRows, setApplianceRows] = useState<LoadTableRow[]>([]);
  const [customRows, setCustomRows] = useState<LoadTableRow[]>([]);
  const [appliancePage, setAppliancePage] = useState(1);
  const [customPage, setCustomPage] = useState(1);

  // Load dropdown catalogs from the Excel workbook (auto-refreshes when the
  // client uploads an updated template — backend caches by file mtime).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoadingCatalogs(true);
      try {
        const data = await getExcelCatalogs();
        if (!cancelled) setCatalogs(data);
      } catch {
        // fall back to hardcoded options; page stays usable
      } finally {
        if (!cancelled) setIsLoadingCatalogs(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Custom Equipment seeds from Equipment Default once catalogs are known.
  // Appliance Calculator rows come from Appliance_Input via template prefill.
  useEffect(() => {
    if (!equipmentCatalog.length) return;
    if (draftIdParam && isLoadingDraft) return;

    setCustomRows((prev) =>
      prev.length
        ? prev
        : [
            {
              ...defaultRowFromCatalog("ce", equipmentCatalog),
              excelRow: CUSTOM_EXCEL_START,
              source: "user" as const,
            },
          ],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogs, draftIdParam, isLoadingDraft]);

  /** Open template picker when property is pre-filled (e.g. from Home quick form) but no template yet. */
  useEffect(() => {
    if (templatePromptHandledRef.current) return;
    if (!selectedProperty || selectedTemplate || !catalogs) return;

    const options = catalogs.templatesByProperty[selectedProperty] ?? [];
    if (options.length === 0) return;

    setShowTemplatePopup(true);
    templatePromptHandledRef.current = true;
  }, [selectedProperty, selectedTemplate, catalogs]);

  const closeTemplatePicker = () => {
    setShowTemplatePopup(false);
    templatePromptHandledRef.current = true;
  };

  /**
   * Select a template: write property/template to Excel, recalc, then seed
   * Appliance Calculator from Appliance_Input A4:A20 (available names only).
   * Keep any previously added user (A21+) rows appended.
   */
  const handleTemplateSelect = async (template: string) => {
    setSelectedTemplate(template);
    setShowTemplatePopup(false);
    setIsPrefilling(true);
    clearToast();

    try {
      const prefill = await getTemplatePrefill(selectedProperty, template);
      await finishLoader();
      const templateRows = rowsFromAppliancePrefill(
        prefill.applianceRows || [],
      );
      setApplianceRows((prev) => {
        const userExtras = prev.filter((row) => row.source === "user");
        return [...templateRows, ...userExtras].slice(0, MAX_EQUIP_ROWS);
      });
      setAppliancePage(1);
      showSuccess(
        templateRows.length
          ? `Loaded ${templateRows.length} appliances from your template.`
          : "Template applied. Add appliances with Add Equipment.",
        "Template applied",
      );
    } catch (error) {
      abortLoader();
      showError(
        error instanceof ApiError
          ? error.message
          : "Unable to apply template from the calculator.",
      );
    } finally {
      setIsPrefilling(false);
    }
  };

  const [openApplianceSelectRow, setOpenApplianceSelectRow] = useState<
    number | null
  >(null);

  const calculateRowDailyKwh = (item: LoadTableRow) => {
    if (
      item.dailyKwhExcel !== undefined &&
      Number.isFinite(item.dailyKwhExcel)
    ) {
      return Number(item.dailyKwhExcel).toFixed(2);
    }
    const q = Number(item.qty) || 0;
    const h = Number(item.hours) || 0;
    const p = Number(item.power) || 0;
    // Custom_Equipment Excel: Watts × Load_Factor × Qty × Hours / 1000 (LF is 0–100).
    // Appliance uses duty as 0–1 fraction (UI stores percent).
    const lf =
      inputMethod === "custom"
        ? Number(item.loadFactorPct) || 0
        : (item.loadFactorPct ?? 100) / 100;
    const live = (q * h * p * lf) / 1000;
    return live.toFixed(2);
  };

  const handleRowChange = (index: any, field: any, value: any) => {
    const setter = inputMethod === "custom" ? setCustomRows : setApplianceRows;

    setter((prevRows) => {
      const updatedRows: LoadTableRow[] = [...prevRows];

      if (!updatedRows[index]) return prevRows;

      if (field === "qty") {
        updatedRows[index] = {
          ...updatedRows[index],
          qty: Number(value) || 0,
          dailyKwhExcel: undefined,
        };
      } else if (field === "hours") {
        updatedRows[index] = {
          ...updatedRows[index],
          hours: Number(value) || 0,
          dailyKwhExcel: undefined,
        };
      } else if (field === "power") {
        updatedRows[index] = {
          ...updatedRows[index],
          power: Number(value) || 0,
          dailyKwhExcel: undefined,
        };
      } else if (field === "loadFactorPct") {
        updatedRows[index] = {
          ...updatedRows[index],
          loadFactorPct: Math.min(100, Math.max(0, Number(value) || 0)),
          dailyKwhExcel: undefined,
        };
      } else if (field === "kind") {
        const nextKind = String(value);
        const next: LoadTableRow = {
          ...updatedRows[index],
          kind: nextKind,
          dailyKwhExcel: undefined,
        };
        // Changing kind on a template row moves it to A21+ so we do not
        // overwrite Appliance_Input name formulas.
        if (next.source === "template") {
          next.source = "user";
          const others = updatedRows.filter((_, i) => i !== index);
          next.excelRow = nextApplianceExcelRow(others) ?? undefined;
        } else {
          next.source = next.source || "user";
        }
        const catalogItem = equipmentCatalog.find(
          (entry) => entry.kind === nextKind,
        );
        if (catalogItem) {
          Object.assign(next, catalogNumericPrefill(catalogItem));
        }
        updatedRows[index] = next;
      }

      return updatedRows;
    });
  };

  const addEquipmentRow = (customEquipment: boolean) => {
    const setter = customEquipment ? setCustomRows : setApplianceRows;
    const setPage = customEquipment ? setCustomPage : setAppliancePage;
    setter((prev) => {
      const visible = visibleEquipmentRows(prev);
      if (visible.length >= MAX_EQUIP_ROWS) return prev;

      const usedKinds = new Set(visible.map((row) => row.kind));
      const nextUnused = equipmentCatalog.find(
        (item) => !usedKinds.has(item.kind),
      );

      if (nextUnused) {
        const removedIndex = prev.findIndex(
          (row) => row.removed && row.kind === nextUnused.kind,
        );
        if (removedIndex >= 0) {
          const next = [...prev];
          next[removedIndex] = {
            ...next[removedIndex],
            removed: false,
            ...catalogNumericPrefill(nextUnused),
            dailyKwhExcel: undefined,
          };
          setPage(Math.ceil((visible.length + 1) / ROWS_PER_PAGE));
          return next;
        }
      }

      const excelRow = customEquipment
        ? nextCustomExcelRow(prev)
        : nextApplianceExcelRow(prev);
      if (excelRow === null) return prev;

      const row = nextUnused
        ? rowFromCatalogItem(customEquipment ? "ce" : "ap", nextUnused)
        : defaultRowFromCatalog(
            customEquipment ? "ce" : "ap",
            equipmentCatalog,
          );

      const next = [...prev, { ...row, source: "user" as const, excelRow }];
      setPage(Math.ceil((visible.length + 1) / ROWS_PER_PAGE));
      return next;
    });
    setOpenApplianceSelectRow(null);
  };

  const removeEquipmentRow = (customEquipment: boolean, index: number) => {
    const setter = customEquipment ? setCustomRows : setApplianceRows;
    const setPage = customEquipment ? setCustomPage : setAppliancePage;
    setter((prev) => {
      const visibleCount = visibleEquipmentRows(prev).length;
      if (customEquipment && visibleCount <= MIN_EQUIP_ROWS) return prev;
      if (!prev[index] || prev[index].removed) return prev;

      const next = [...prev];
      next[index] = {
        ...next[index],
        qty: 0,
        removed: true,
        dailyKwhExcel: undefined,
      };

      const newVisibleCount = visibleEquipmentRows(next).length;
      setPage((currentPage) =>
        Math.min(
          currentPage,
          Math.max(1, Math.ceil(newVisibleCount / ROWS_PER_PAGE) || 1),
        ),
      );
      return next;
    });
    setOpenApplianceSelectRow((open) => {
      if (open === null) return null;
      if (open === index) return null;
      return open;
    });
  };

  useEffect(() => {
    setOpenApplianceSelectRow(null);
    setAppliancePage(1);
    setCustomPage(1);
  }, [inputMethod]);

  useEffect(() => {
    const visibleCount = visibleEquipmentRows(applianceRows).length;
    setAppliancePage((currentPage) =>
      Math.min(
        currentPage,
        Math.max(1, Math.ceil(visibleCount / ROWS_PER_PAGE) || 1),
      ),
    );
  }, [applianceRows]);

  useEffect(() => {
    const visibleCount = visibleEquipmentRows(customRows).length;
    setCustomPage((currentPage) =>
      Math.min(
        currentPage,
        Math.max(1, Math.ceil(visibleCount / ROWS_PER_PAGE) || 1),
      ),
    );
  }, [customRows]);

  /** Bill upload: store file only; Analyze Bill runs OpenAI extraction. */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFileName("No file chosen");
      setBillFile(null);
      return;
    }
    setFileName(file.name);
    setBillFile(file);
    setBillAiApplied(false);
    clearToast();
  };

  const handleAnalyzeBill = async () => {
    if (!billFile) {
      showError("Choose a bill image or PDF first.");
      return;
    }

    setIsExtractingBill(true);
    setBillAiApplied(false);
    clearToast();

    try {
      const extracted = await extractBillValues(billFile, {
        formData: getFormPayload(),
        monthlyEnergyKwh: excelEstimatedMonthlyEnergy,
      });
      await finishLoader();
      let filled = 0;

      if (extracted.monthlyUsage !== null) {
        setMonthlyUsage(String(extracted.monthlyUsage));
        monthlyUsageTouchedRef.current = true;
        setUsageUnit("kWh");
        filled += 1;
      }
      if (extracted.monthlySpend !== null) {
        setMonthlySpend(String(extracted.monthlySpend));
        setMonthlyElectricityBill(String(extracted.monthlySpend));
        filled += 1;
      }
      if (extracted.gridTariff !== null) {
        setGridTariff(String(extracted.gridTariff));
        filled += 1;
      }

      if (filled > 0) {
        setBillAiApplied(true);
      }

      if (extracted.lowConfidence || filled === 0) {
        showError(
          "We couldn't confidently extract all values. Please verify or enter manually.",
          "Review bill values",
        );
      } else {
        showSuccess(
          "Bill values extracted — review and edit if needed.",
          "Bill processed",
        );
      }
    } catch (error) {
      abortLoader();
      showError(
        error instanceof ApiError
          ? error.message
          : "Could not read values from the bill automatically — please enter them below.",
      );
    } finally {
      setIsExtractingBill(false);
    }
  };

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setOpen(false); // reset menu on desktop
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isLoadingDraft || isExtractingBill) return;
    if (monthlyUsageTouchedRef.current) return;
    const usage = formatUsageFromSpend(monthlySpend, gridTariff);
    if (usage) {
      setMonthlyUsage((prev) => (prev === usage ? prev : usage));
    }
  }, [monthlySpend, gridTariff, isLoadingDraft, isExtractingBill]);

  const getFormPayload = () =>
    buildAssessmentFormData({
      selectedProperty,
      selectedTemplate,
      selectedPower,
      inputMethod,
      selectedObjective,
      formData,
      fileName,
      billNotes,
      monthlyUsage,
      usageUnit,
      monthlySpend,
      gridTariff,
      monthlyElectricityBill,
      applianceRows,
      customRows,
      roofArea,
      backupDuration,
    });

  const liveSummaryKey = useMemo(
    () =>
      JSON.stringify({
        selectedProperty,
        selectedTemplate,
        selectedPower,
        inputMethod,
        selectedObjective,
        country: formData.country,
        state: formData.state,
        fileName,
        billNotes,
        monthlyUsage,
        usageUnit,
        monthlySpend,
        gridTariff,
        monthlyElectricityBill,
        applianceRows: equipmentLiveSummarySignature(applianceRows),
        customRows: equipmentLiveSummarySignature(customRows),
        roofArea,
        backupDuration,
      }),
    [
      selectedProperty,
      selectedTemplate,
      selectedPower,
      inputMethod,
      selectedObjective,
      formData.country,
      formData.state,
      fileName,
      billNotes,
      monthlyUsage,
      usageUnit,
      monthlySpend,
      gridTariff,
      monthlyElectricityBill,
      applianceRows,
      customRows,
      roofArea,
      backupDuration,
    ],
  );

  const hasLiveSummaryMinimumInputs =
    Boolean(selectedProperty && selectedTemplate) &&
    (inputMethod === "bill"
      ? Boolean(monthlyUsage && parseFormattedNumber(monthlyUsage) > 0)
      : inputMethod === "appliance"
        ? applianceRows.some((row) => !row.removed)
        : customRows.some((row) => !row.removed));

  useEffect(() => {
    if (
      isLoadingCatalogs ||
      isLoadingDraft ||
      isPrefilling ||
      isSubmitting ||
      isExtractingBill
    ) {
      setIsLoadingLiveSummary(false);
      return;
    }

    if (!hasLiveSummaryMinimumInputs) {
      lastLiveSummaryKeyRef.current = null;
      setIsLoadingLiveSummary(false);
      setExcelEstimatedAnnualLoad(null);
      setExcelEstimatedMonthlySpend(null);
      setExcelEstimatedMonthlyEnergy(null);
      return;
    }

    if (lastLiveSummaryKeyRef.current === liveSummaryKey) {
      liveSummaryRequestRef.current += 1;
      setIsLoadingLiveSummary(false);
      return;
    }

    const requestId = ++liveSummaryRequestRef.current;
    const timer = window.setTimeout(async () => {
      setIsLoadingLiveSummary(true);
      try {
        const summary = await getLiveSummary(getFormPayload());
        if (liveSummaryRequestRef.current !== requestId) return;
        lastLiveSummaryKeyRef.current = liveSummaryKey;
        setExcelEstimatedAnnualLoad(summary.estimatedAnnualLoadKwh);
        setExcelEstimatedMonthlySpend(summary.estimatedMonthlySpend ?? null);
        setExcelEstimatedMonthlyEnergy(
          summary.estimatedMonthlyEnergyKwh ?? null,
        );

        const rowDaily = summary.rowDailyKwh;
        if (
          Array.isArray(rowDaily) &&
          rowDaily.length > 0 &&
          (inputMethod === "custom" || inputMethod === "appliance")
        ) {
          const byExcelRow = new Map(
            rowDaily.map((entry) => [entry.excelRow, entry.dailyKwh]),
          );
          const applyDaily = (rows: LoadTableRow[]) =>
            rows.map((row) => {
              if (!Number.isFinite(row.excelRow)) return row;
              if (!byExcelRow.has(Number(row.excelRow))) return row;
              const daily = byExcelRow.get(Number(row.excelRow));
              const nextDaily =
                daily === null || daily === undefined
                  ? undefined
                  : Number(daily);
              if (
                nextDaily === row.dailyKwhExcel ||
                (nextDaily === undefined && row.dailyKwhExcel === undefined)
              ) {
                return row;
              }
              return {
                ...row,
                dailyKwhExcel: Number.isFinite(nextDaily)
                  ? nextDaily
                  : undefined,
              };
            });

          if (inputMethod === "custom") {
            setCustomRows((prev) => {
              const next = applyDaily(prev);
              return next.some((row, i) => row !== prev[i]) ? next : prev;
            });
          } else {
            setApplianceRows((prev) => {
              const next = applyDaily(prev);
              return next.some((row, i) => row !== prev[i]) ? next : prev;
            });
          }
        }
      } catch {
        if (liveSummaryRequestRef.current !== requestId) return;
        setExcelEstimatedAnnualLoad(null);
        setExcelEstimatedMonthlySpend(null);
        setExcelEstimatedMonthlyEnergy(null);
      } finally {
        if (liveSummaryRequestRef.current === requestId) {
          setIsLoadingLiveSummary(false);
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    isLoadingCatalogs,
    isLoadingDraft,
    isPrefilling,
    isSubmitting,
    isExtractingBill,
    hasLiveSummaryMinimumInputs,
    liveSummaryKey,
  ]);

  useEffect(() => {
    if (!draftIdParam) {
      setIsLoadingDraft(false);
      return;
    }

    const id = Number(draftIdParam);
    if (!Number.isFinite(id)) {
      setIsLoadingDraft(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const draft = await getAssessmentDraft(id);
        if (cancelled) return;

        setDraftId(draft.id);
        applyAssessmentFormData(draft.formData, {
          setSelectedProperty,
          setSelectedTemplate,
          setSelectedPower,
          setInputMethod,
          setSelectedObjective,
          setFormData,
          setFileName,
          setBillNotes,
          setMonthlyUsage,
          setUsageUnit,
          setMonthlySpend,
          setGridTariff,
          setMonthlyElectricityBill,
          setApplianceRows,
          setCustomRows,
          setRoofArea,
          setBackupDuration,
        });
        monthlyUsageTouchedRef.current = Boolean(
          draft.formData?.bill?.monthlyUsage,
        );

        const savedApplianceRows = draft.formData?.appliance?.rows;
        const property = draft.formData?.propertyType;
        const template = draft.formData?.template;
        if (
          (!savedApplianceRows || savedApplianceRows.length === 0) &&
          property &&
          template
        ) {
          try {
            setIsPrefilling(true);
            const prefill = await getTemplatePrefill(property, template);
            if (!cancelled) {
              setApplianceRows(
                rowsFromAppliancePrefill(prefill.applianceRows || []),
              );
            }
          } catch {
            // Draft still usable without prefill
          } finally {
            if (!cancelled) setIsPrefilling(false);
          }
        }
      } catch (error) {
        if (!cancelled) {
          abortLoader();
          showError(
            error instanceof ApiError
              ? error.message
              : "Unable to load saved assessment draft.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingDraft(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draftIdParam, showError]);

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    clearToast();

    try {
      const payload = getFormPayload();

      if (draftId) {
        await updateAssessmentDraft(draftId, payload);
        await finishLoader();
        showSuccess("Draft saved successfully.");
      } else {
        const draft = await createAssessmentDraft(payload);
        await finishLoader();
        setDraftId(draft.id);
        setSearchParams({ draft: String(draft.id) });
        showSuccess("Draft created and saved.");
      }
    } catch (error) {
      abortLoader();
      showError(
        error instanceof ApiError
          ? error.message
          : "Unable to save draft. Please try again.",
      );
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleCompleteAssessment = async () => {
    const errors: CalculateFieldErrors = {};
    if (!formData.country.trim()) {
      errors.country = "Please select a country.";
    }
    if (!formData.state.trim()) {
      errors.state = "Please select a state.";
    }
    if (!selectedPower) {
      errors.powerSetup = "Please select your current power setup.";
    }
    if (!backupDuration) {
      errors.backupDuration = "Please select a backup duration.";
    }
    if (!selectedObjective) {
      errors.mainObjective = "Please select a main objective.";
    }

    if (Object.keys(errors).length > 0) {
      setCalculateErrors(errors);
      const firstKey = (
        ["country", "state", "powerSetup", "backupDuration", "mainObjective"] as const
      ).find((key) => errors[key]);
      if (firstKey) {
        document
          .getElementById(`ass-field-${firstKey}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setCalculateErrors({});
    setIsSubmitting(true);
    clearToast();

    try {
      const payload = getFormPayload();
      const result = draftId
        ? await completeAssessmentDraft(draftId, payload)
        : await completeAssessment(payload);

      await finishLoader();
      navigate(`/assesement-result?assessment=${result.id}`);
    } catch (error) {
      abortLoader();
      showError(
        error instanceof ApiError
          ? error.message
          : "Unable to complete assessment. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  const summaryAssessmentPathTitle =
    inputMethod === "bill"
      ? "Bill"
      : inputMethod === "appliance"
        ? "Appliance"
        : "Custom";

  const summaryFirstMetricLabel =
    inputMethod === "bill" ? "MONTHLY USAGE" : "Daily Energy";
  const summaryFirstMetricUnit =
    inputMethod === "bill" ? "kWh/month" : "kWh/day";

  const summarySecondMetricLabel =
    inputMethod === "bill" ? "ESTIMATED MONTHLY SPEND" : "Monthly Energy";

  /**
   * Live summary: appliance/custom energy from client row math for instant feedback;
   * bill monthly spend + estimated annual load from Outputs B36 / B34 via live-summary.
   */
  const sumDailyKwh = (rows: LoadTableRow[]) =>
    rows.reduce((total, row) => {
      const lf = (row.loadFactorPct ?? 100) / 100;
      return (
        total +
        ((Number(row.qty) || 0) *
          (Number(row.hours) || 0) *
          (Number(row.power) || 0) *
          lf) /
          1000
      );
    }, 0);

  const activeRows = inputMethod === "custom" ? customRows : applianceRows;
  const applianceRowsWithIndex = applianceRows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !row.removed);
  const visibleApplianceCount = applianceRowsWithIndex.length;
  const appliancePagination = getPaginationMeta(
    visibleApplianceCount,
    appliancePage,
  );
  const paginatedApplianceEntries = applianceRowsWithIndex.slice(
    appliancePagination.startIndex,
    appliancePagination.endIndex,
  );
  const customRowsWithIndex = customRows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !row.removed);
  const visibleCustomCount = customRowsWithIndex.length;
  const customPagination = getPaginationMeta(visibleCustomCount, customPage);
  const paginatedCustomEntries = customRowsWithIndex.slice(
    customPagination.startIndex,
    customPagination.endIndex,
  );
  const liveDailyKwh = sumDailyKwh(activeRows);
  const liveMonthlyKwh = liveDailyKwh * 30;

  const clientAnnualLoad =
    inputMethod === "bill"
      ? parseFormattedNumber(monthlyUsage) * 12
      : liveMonthlyKwh * 12;

  const summaryFirstMetricValue =
    inputMethod === "bill" ? monthlyUsage || "0" : liveDailyKwh.toFixed(2);

  const safeMonthlySpend = Number(excelEstimatedMonthlySpend);
  const safeMonthlyKwh = Number(liveMonthlyKwh);
  const summarySecondMetricValue =
    inputMethod === "bill"
      ? `₦${Math.round(
          Number.isFinite(safeMonthlySpend) ? safeMonthlySpend : 0,
        ).toLocaleString("en-IN", {
          maximumFractionDigits: 0,
          minimumFractionDigits: 0,
        })}`
      : (Number.isFinite(safeMonthlyKwh) ? safeMonthlyKwh : 0).toFixed(1);

  const summaryEstimatedAnnualLoad =
    excelEstimatedAnnualLoad !== null &&
    Number.isFinite(Number(excelEstimatedAnnualLoad))
      ? formatIntegerWithCommas(
          String(Math.round(Number(excelEstimatedAnnualLoad))),
        )
      : Number.isFinite(clientAnnualLoad) && clientAnnualLoad > 0
        ? formatIntegerWithCommas(String(Math.round(clientAnnualLoad)))
        : "N/A";

  const loaderMessage = isSubmitting
    ? "Calculating your system..."
    : isExtractingBill
      ? "AI is analyzing your bill…"
      : isSavingDraft
        ? "Saving draft..."
        : isPrefilling
          ? "Loading template..."
          : isLoadingDraft
            ? "Loading your saved assessment..."
            : isLoadingCatalogs
              ? "Loading form options..."
              : "Please wait...";

  const loaderDetail = isExtractingBill
    ? "Reading usage, spend, and tariff from your upload."
    : undefined;

  const assessmentCtaBar = (
    <div className="d-flex gap-3 flex-wrap mt-3 mb-4 assessment-cta-bar">
      <button
        type="button"
        className="btn-primary-custom calu"
        onClick={handleCompleteAssessment}
        disabled={isApiBusy || loaderOpen}
      >
        <span className="icon-sun">
          <img src={sunone} alt="icon" />
        </span>
        <span>
          {isSubmitting ? "Calculating..." : "Calculate My Energy System"}
        </span>
        <span className="arrows">
          <img src={sunthree} alt="icon" />
        </span>
      </button>

      <button
        type="button"
        className="btn-outline-custom2 calu-2"
        onClick={handleSaveDraft}
        disabled={isApiBusy || loaderOpen}
      >
        <span className="icon-sun">
          <img src={save} alt="icon" />
        </span>
        <span>{isSavingDraft ? "Saving..." : "Save Draft"}</span>
      </button>
    </div>
  );

  return (
    <div>
      <SolarvyLoader
        open={loaderOpen || (!isSlowApi && isApiBusy)}
        message={loaderMessage}
        detail={loaderDetail}
        progress={isSlowApi || loaderOpen ? loaderProgress : undefined}
      />
      <FeedbackToast toast={toast} onClose={clearToast} />
      <div className="full-body-color">
        <section className="hero d-flex align-items-center ass-bannr py-4">
          <div className="overlay"></div>

          <div className="container-fluid px-lg-4 px-3 position-relative z-1 menu-div ass-div">
            <div className="row align-items-start text-divs gx-3 gx-lg-4">
              <div className="solar-top-navbar">
                <nav
                  className={`navbar navbar-expand-lg  ${scrolled ? "scrolled" : ""}`}
                >
                  <Link className="navbar-brand" to="/">
                    <img src={logo} alt="logo" className="solar-logo-img" />
                  </Link>

                  <button
                    className="navbar-toggler"
                    type="button"
                    onClick={handleToggle}
                  >
                    <span className="navbar-toggler-icon"></span>
                  </button>

                  <div
                    className={`collapse navbar-collapse ${open ? "show" : ""}`}
                  >
                    <ul className="navbar-nav ms-auto align-items-lg-center solar-nav-links">
                      <li className="nav-item">
                        <Link
                          className="nav-link"
                          to="/how-it-works"
                          onClick={() => setOpen(false)}
                        >
                          How It Works
                        </Link>
                      </li>

                      <li className="nav-item">
                        <Link className="nav-link" to="/sample-results">
                          Sample Results
                        </Link>
                      </li>

                      <li className="nav-item">
                        <Link className="nav-link" to="/who-its-for">
                          Who It's For
                        </Link>
                      </li>

                      <li className="nav-item">
                        <button
                          className="solar-nav-btn"
                          onClick={() => navigate("/start-assesement")}
                        >
                          Start Assessment
                          <img src={bttnarrow} alt="arrow" />
                        </button>
                      </li>
                    </ul>
                  </div>
                </nav>
              </div>
              <div className="nav-bottom-section row align-items-center">
                <div className="col-12 col-lg-12 text-white ">
                  <h1 className="bannr-text start-assesement-banner-text display-5 ass-page ">
                    Energy Assessment
                  </h1>

                  <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two">
                    Plan the right solar, battery, and hybrid system for your
                    building. Enter your details and get an instant estimate.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-lg-4 py-4">
          <div className="row g-4 align-items-start">
            <div className="col-lg-8">
              <div className="p-4 shadow-sm rounded-4 ass-first">
                <div className="d-flex align-items-center mb-3">
                  <div className="step-box me-3">1</div>
                  <div>
                    <h5 className="fw-bold mb-1 heading-ass">
                      Building Information
                    </h5>
                    <p className="text-muted small mb-0 para-ass">
                      Tell us about your property so we can tailor the
                      assessment.
                    </p>
                  </div>
                </div>

                <div className="row g-3 mb-3 start-assesement-cards">
                  {propertyOptions.map((item) => (
                    <div className="col-6 col-lg-4 d-flex" key={item.title}>
                      <div
                        className={`property-card w-100 ${selectedProperty === item.title ? "active" : ""}`}
                        onClick={() => {
                          setSelectedProperty(item.title);
                          setSelectedTemplate("");
                          setAppliancePage(1);
                          setApplianceRows((prev) =>
                            prev.filter((row) => row.source === "user"),
                          );
                          setShowTemplatePopup(true);
                        }}
                      >
                        <div className="d-flex gap-2 building-info-cards-content">
                          <div className="icon-box-tops">
                            <item.Icon
                              className="mobile-iconssss"
                              size={22}
                              strokeWidth={2}
                              aria-hidden
                            />
                          </div>

                          <div>
                            <h6 className="mb-1 fw-semibold ass-semi">
                              {item.title}
                            </h6>
                            <p className="small mb-0 text-muted ass-muted">
                              {item.desc}
                            </p>
                          </div>

                          {selectedProperty === item.title && (
                            <div className="check-icon-homss">✔</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedProperty && showTemplatePopup && (
                  <div className="template-picker-panel mb-3">
                    <div className="template-picker-header">
                      <div className="template-picker-header-main">
                        <div className="template-picker-icon" aria-hidden>
                          <LayoutGrid size={14} strokeWidth={2} />
                        </div>
                        <div>
                          <h6 className="template-picker-title ass-semi mb-1">
                            {catalogs?.templatesTitle || "Templates"}
                          </h6>
                          <p className="template-picker-subtitle para-ass mb-0">
                            Choose the closest match for{" "}
                            <strong>{selectedProperty}</strong>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="template-picker-close"
                        aria-label="Close templates"
                        onClick={closeTemplatePicker}
                      >
                        ×
                      </button>
                    </div>

                    <div className="template-picker-grid" role="list">
                      {templateOptions.length === 0 && (
                        <span className="template-picker-loading para-ass">
                          Loading templates...
                        </span>
                      )}
                      {templateOptions.map((template) => {
                        const isSelected = selectedTemplate === template;
                        return (
                          <button
                            key={template}
                            type="button"
                            role="listitem"
                            className={`template-picker-option${
                              isSelected
                                ? " template-picker-option--selected"
                                : ""
                            }`}
                            onClick={() => handleTemplateSelect(template)}
                          >
                            {template}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedTemplate && !showTemplatePopup && (
                  <div className="template-picker-summary mb-3">
                    <span className="template-picker-summary-label ass-field-label">
                      Template
                    </span>
                    <span className="template-picker-summary-value ass-semi">
                      {selectedTemplate}
                    </span>
                    {isPrefilling && (
                      <span className="template-picker-summary-status">
                        Loading...
                      </span>
                    )}
                    <button
                      type="button"
                      className="template-picker-change-btn"
                      onClick={() => setShowTemplatePopup(true)}
                    >
                      Change
                    </button>
                  </div>
                )}

                <div className="row g-3 align-items-center">
                  <div className="col-md-6" id="ass-field-country">
                    <label className="form-label ass-field-label">
                      COUNTRY
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className={`form-select ass-field-control${
                        calculateErrors.country ? " is-invalid" : ""
                      }`}
                      aria-invalid={Boolean(calculateErrors.country)}
                    >
                      <option value="">Select country</option>
                      {(catalogs?.countries?.length
                        ? catalogs.countries
                        : ["Nigeria"]
                      ).map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    {calculateErrors.country && (
                      <p className="ass-field-error" role="alert">
                        {calculateErrors.country}
                      </p>
                    )}
                  </div>

                  <div className="col-md-6" id="ass-field-state">
                    <label className="form-label ass-field-label">State</label>
                    <select
                      name="state"
                      value={
                        formData.country === "Nigeria" ? formData.state : ""
                      }
                      onChange={handleChange}
                      className={`form-select ass-field-control${
                        calculateErrors.state ? " is-invalid" : ""
                      }`}
                      aria-invalid={Boolean(calculateErrors.state)}
                    >
                      <option value="">Select State</option>
                      {(catalogs?.states?.length
                        ? catalogs.states
                        : NIGERIA_STATES_SORTED.map(([, label]) => label)
                      ).map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {calculateErrors.state && (
                      <p className="ass-field-error" role="alert">
                        {calculateErrors.state}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="p-4 shadow-sm rounded-4 ass-first mt-3"
                id="ass-field-powerSetup"
              >
                <div className="d-flex align-items-center mb-3">
                  <div className="step-box me-3">2</div>
                  <div>
                    <h5 className="fw-bold mb-1 heading-ass">
                      Current Power Setup
                    </h5>
                    <p className="text-muted small mb-0 para-ass">
                      This helps us understand your current energy
                      infrastructure.
                    </p>
                  </div>
                </div>

                {powerOptions.map((item) => (
                  <div className="parent-container onlt-this" key={item.title}>
                    <div
                      className={`property-card  ${selectedPower === item.title ? "active" : ""}`}
                      onClick={() => {
                        setSelectedPower(item.title);
                        clearCalculateError("powerSetup");
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between w-100">
                        <div className="d-flex align-items-center gap-3">
                          <div className="icon-boxs">
                            <item.Icon size={20} strokeWidth={2} aria-hidden />
                          </div>

                          <div>
                            <h6 className="mb-1 fw-semibold curr-ass">
                              {item.title}
                            </h6>
                            <p className="mb-0 small text-muted curr-ass-semi-hide">
                              {item.desc}
                            </p>
                          </div>
                        </div>

                        <div className="radio-circle ms-auto">
                          {selectedPower === item.title && (
                            <div className="radio-dot"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {calculateErrors.powerSetup && (
                  <p className="ass-field-error mt-2 mb-0" role="alert">
                    {calculateErrors.powerSetup}
                  </p>
                )}
              </div>
              <div className="p-4 shadow-sm rounded-4 ass-first mt-3">
                <div className="d-flex align-items-center">
                  <div className="step-box me-3">3</div>
                  <div>
                    <h5 className="fw-bold mb-1 heading-ass">
                      Choose Input Method
                    </h5>
                    <p className="text-muted small mb-0 para-ass">
                      Pick the easiest path - no need to know technical values.
                    </p>
                  </div>
                </div>

                <div className="container mt-2 p-1 align-items-stretch">
                  <div className="row g-3">
                    {options.map((item) => (
                      <div
                        className="col-12 col-md-6 col-lg-4 d-flex"
                        key={item.id}
                      >
                        <div
                          className={`option-card w-100 ${
                            inputMethod === item.id ? "active" : ""
                          }`}
                          onClick={() => {
                            const next = item.id as
                              | "bill"
                              | "appliance"
                              | "custom";
                            if (next === inputMethod) return;
                            setInputMethod(next);
                          }}
                        >
                          <div className="d-flex align-items-start">
                            <div className="icon-box-topss me-2 icon-box-topss-choose-input-method">
                              <item.Icon
                                size={20}
                                strokeWidth={2}
                                aria-hidden
                              />
                            </div>

                            <div className="flex-grow-1">
                              <h6 className="mb-1 fw-semibold ass-semiss">
                                {item.title}
                              </h6>
                              <p className="small mb-0 text-muted ass-mutedss">
                                {item.desc}
                              </p>
                            </div>

                            {inputMethod === item.id && (
                              <div className="check-icon">✔</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {inputMethod === "bill" && (
                <div className="monthbill-section-tab-1">
                  <div className="p-4 shadow-sm rounded-4 ass-first mt-3 bill-ai-panel">
                    <div className="d-flex align-items-start mb-3">
                      <div className="bill-ai-icon-wrap me-3" aria-hidden>
                        <Sparkles size={18} strokeWidth={2} />
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                          <h5 className="fw-bold mb-0 heading-ass">
                            AI bill assist
                          </h5>
                          <span className="bill-ai-badge">AI</span>
                        </div>
                        <p className="text-muted small mb-0 para-ass">
                          Upload a bill image or PDF. AI reads it and pre-fills
                          your monthly usage, spend, and tariff below.
                        </p>
                      </div>
                    </div>

                    <div className="row g-3 align-items-stretch">
                      <div className="col-md-6 d-flex">
                        <div className="bill-ai-upload-col w-100">
                          <label className="form-label ass-field-label ass-field-label--section mb-2">
                            Upload bill
                          </label>
                          <label
                            className={`bill-ai-upload${billFile ? " has-file" : ""}${isExtractingBill ? " is-busy" : ""}`}
                          >
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={handleFileChange}
                              disabled={isExtractingBill}
                            />
                            <span className="bill-ai-upload-icon" aria-hidden>
                              {billFile ? (
                                <Receipt size={22} strokeWidth={2} />
                              ) : (
                                <Upload size={22} strokeWidth={2} />
                              )}
                            </span>
                            <span className="bill-ai-upload-text">
                              <span className="bill-ai-upload-title">
                                {billFile
                                  ? "Bill ready to analyze"
                                  : "Choose PDF or image"}
                              </span>
                              <span className="bill-ai-upload-name">
                                {fileName}
                              </span>
                            </span>
                          </label>

                          <button
                            type="button"
                            className="bill-ai-analyze-btn"
                            disabled={!billFile || isExtractingBill}
                            onClick={handleAnalyzeBill}
                          >
                            <Sparkles size={16} strokeWidth={2} aria-hidden />
                            <span>
                              {isExtractingBill
                                ? "Analyzing…"
                                : "Analyze with AI"}
                            </span>
                          </button>
                          <p className="bill-ai-helper mb-0">
                            AI extracts monthly usage, spend, and tariff
                          </p>
                        </div>
                      </div>

                      <div className="col-md-6 d-flex">
                        <div className="bill-ai-notes-col w-100">
                          <label className="form-label ass-field-label ass-field-label--section mb-2">
                            Notes
                          </label>
                          <textarea
                            className="form-control ass-field-control notes-box ass-text-area bill-ai-notes"
                            placeholder="Any additional notes about the site, bill pattern, or load profile..."
                            value={billNotes}
                            onChange={(e) => setBillNotes(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 shadow-sm rounded-4 ass-first mt-3">
                    <div className="d-flex align-items-center mb-3">
                      <div
                        className="step-box me-3"
                        style={{ position: "relative", top: "0px" }}
                      >
                        4
                      </div>
                      <div>
                        <h5 className="fw-bold mb-1 heading-ass">
                          Bill information
                        </h5>
                        <p className="text-muted small mb-0 para-ass">
                          {billAiApplied
                            ? "These fields were filled by AI from your bill — review and edit if needed."
                            : "Enter values manually, or use AI bill assist above to fill them."}
                        </p>
                      </div>
                    </div>

                    {billAiApplied && (
                      <div className="bill-ai-banner mb-3" role="status">
                        <Sparkles size={16} strokeWidth={2} aria-hidden />
                        <span>
                          AI filled usage, spend, and tariff from your bill.
                          Double-check before calculating.
                        </span>
                      </div>
                    )}

                    <div className="container mt-4">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label ass-field-label">
                            MONTHLY ELECTRICITY USAGE
                          </label>
                          <input
                            type="text"
                            className="form-control ass-field-control"
                            placeholder=""
                            value={monthlyUsage}
                            onChange={(e) => {
                              monthlyUsageTouchedRef.current = true;
                              setMonthlyUsage(e.target.value);
                            }}
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label ass-field-label">
                            UNIT
                          </label>
                          <select
                            className="form-select ass-field-control"
                            value={usageUnit}
                            onChange={(e) => setUsageUnit(e.target.value)}
                          >
                            <option value="">Select unit</option>
                            <option value="kWh">kWh</option>
                            <option value="units">Units</option>
                          </select>
                        </div>

                        <div className="col-md-6">
                          <label className="form-label ass-field-label">
                            AVERAGE MONTHLY ELECTRICITY SPEND
                          </label>
                          <input
                            type="text"
                            className="form-control ass-field-control"
                            placeholder=""
                            value={monthlySpend}
                            onChange={(e) => setMonthlySpend(e.target.value)}
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label ass-field-label">
                            GRID TARIFF PER KWH
                          </label>
                          <input
                            type="text"
                            className="form-control ass-field-control"
                            value={gridTariff}
                            onChange={(e) => setGridTariff(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {inputMethod === "appliance" && (
                <div className="Appliance Calculator-section-tab-2">
                  <div className="p-4 shadow-sm rounded-4 ass-first mt-3">
                    <div className="d-flex align-items-center mb-3">
                      <div className="step-box me-3">4</div>
                      <div>
                        <h5 className="fw-bold mb-1 heading-ass">
                          Appliance Calculator
                        </h5>
                        <p className="text-muted small mb-0 para-ass">
                          Add your typical appliances to estimate your daily
                          energy use. This is the easiest way if you don't know
                          your kWh.{" "}
                        </p>
                      </div>
                    </div>
                    <div className="mt-1">
                      {isPrefilling && (
                        <div
                          className="alert alert-info py-2 small"
                          role="status"
                        >
                          Loading typical appliances for {selectedTemplate}...
                        </div>
                      )}
                      <div className="table-container appliance-table-allow-dropdown">
                        <table className="appliance-table mt-2">
                          <thead>
                            <tr>
                              <th>APPLIANCE</th>
                              <th>QTY</th>
                              <th>HRS/DAY</th>
                              <th>POWER (W)</th>
                              <th>DAILY KWH</th>
                              <th>ACTION</th>
                              <th
                                className="appliance-table-th-actions"
                                scope="col"
                                aria-label="Remove row"
                              />
                            </tr>
                          </thead>
                          <tbody>
                            {visibleApplianceCount === 0 && !isPrefilling && (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="text-muted small py-3"
                                >
                                  {selectedTemplate
                                    ? "No appliances for this template yet. Use Add Equipment to add your own."
                                    : "Select a property template first to load appliances from the calculator."}
                                </td>
                              </tr>
                            )}
                            {paginatedApplianceEntries.map(
                              ({ row: item, index }) => (
                                <tr
                                  key={item.id}
                                  className={
                                    openApplianceSelectRow === index
                                      ? "appliance-select-row-is-open"
                                      : undefined
                                  }
                                >
                                  <td className="appliance-cell py-2">
                                    <ApplianceKindSelect
                                      rowIndex={index}
                                      catalog={equipmentCatalog}
                                      valueKind={item.kind}
                                      onPick={(kind) =>
                                        handleRowChange(index, "kind", kind)
                                      }
                                      openRow={openApplianceSelectRow}
                                      onOpenChange={setOpenApplianceSelectRow}
                                      allowCustomName
                                    />
                                  </td>

                                  <td>
                                    <input
                                      className="form-control ass-field-control ass-field-control--table"
                                      type="number"
                                      value={item.qty}
                                      onChange={(e) =>
                                        handleRowChange(
                                          index,
                                          "qty",
                                          Number(e.target.value),
                                        )
                                      }
                                    />
                                  </td>

                                  <td>
                                    <input
                                      className="form-control ass-field-control ass-field-control--table"
                                      type="number"
                                      value={item.hours}
                                      onChange={(e) =>
                                        handleRowChange(
                                          index,
                                          "hours",
                                          Number(e.target.value),
                                        )
                                      }
                                    />
                                  </td>

                                  <td>
                                    <div className="inputs-text-bluess">
                                      <input
                                        type="number"
                                        className="form-control ass-field-control ass-field-control--table"
                                        value={item.power}
                                        onChange={(e) =>
                                          handleRowChange(
                                            index,
                                            "power",
                                            Number(e.target.value),
                                          )
                                        }
                                      />
                                    </div>
                                  </td>

                                  <td className="col-md-2 ">
                                    <div className="inputs-text-bluess inputs-text-bluess--computed">
                                      {calculateRowDailyKwh(item)}
                                    </div>
                                  </td>
                                  <td className="appliance-table-td-actions text-center align-middle py-2">
                                    <button
                                      type="button"
                                      className="ass-row-remove-btn"
                                      disabled={visibleApplianceCount <= 0}
                                      aria-label="Remove equipment row"
                                      onClick={() =>
                                        removeEquipmentRow(false, index)
                                      }
                                    >
                                      <Trash2
                                        size={18}
                                        strokeWidth={2}
                                        aria-hidden
                                      />
                                    </button>
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                      <TablePagination
                        totalRows={visibleApplianceCount}
                        page={appliancePage}
                        onPageChange={setAppliancePage}
                      />
                      <div className="buttons-actions bottom-bttns d-flex flex-wrap gap-3 mt-3">
                        <button
                          type="button"
                          className="dashed-btn"
                          onClick={() => addEquipmentRow(false)}
                        >
                          <span className="plus">+</span> Add Equipment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {inputMethod === "custom" && (
                <div className="p-4 shadow-sm rounded-4 ass-first mt-3">
                  <div className="d-flex align-items-center mb-3">
                    <div className="step-box me-3">4</div>
                    <div>
                      <h5 className="fw-bold mb-1 heading-ass">
                        Custom Equipment
                      </h5>
                      <p className="text-muted small mb-0 para-ass">
                        Upload information to match custom equipment.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="table-container appliance-table-allow-dropdown">
                      <table className="appliance-table">
                        <thead>
                          <tr>
                            <th>EQUIPMENT</th>
                            <th>RATED POWER (W)</th>
                            <th>QTY</th>
                            <th>Hrs/Day</th>
                            <th>DAILY KWH</th>
                            <th>ACTION</th>
                            <th
                              className="appliance-table-th-actions"
                              scope="col"
                              aria-label="Remove row"
                            />
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedCustomEntries.map(
                            ({ row: item, index }) => (
                              <tr
                                key={item.id}
                                className={
                                  openApplianceSelectRow === index
                                    ? "appliance-select-row-is-open"
                                    : undefined
                                }
                              >
                                <td
                                  className="appliance-cell py-2"
                                  style={{ minWidth: "180px" }}
                                >
                                  <ApplianceKindSelect
                                    rowIndex={index}
                                    catalog={equipmentCatalog}
                                    valueKind={item.kind}
                                    onPick={(kind) =>
                                      handleRowChange(index, "kind", kind)
                                    }
                                    openRow={openApplianceSelectRow}
                                    onOpenChange={setOpenApplianceSelectRow}
                                    allowCustomName
                                  />
                                </td>

                                <td>
                                  <input
                                    className="form-control ass-field-control ass-field-control--table"
                                    type="number"
                                    value={item.power}
                                    onChange={(e) =>
                                      handleRowChange(
                                        index,
                                        "power",
                                        Number(e.target.value),
                                      )
                                    }
                                  />
                                </td>

                                <td>
                                  <input
                                    className="form-control ass-field-control ass-field-control--table"
                                    type="number"
                                    value={item.qty}
                                    onChange={(e) =>
                                      handleRowChange(
                                        index,
                                        "qty",
                                        Number(e.target.value),
                                      )
                                    }
                                  />
                                </td>

                                <td>
                                  <input
                                    className="form-control ass-field-control ass-field-control--table"
                                    type="number"
                                    value={item.hours}
                                    onChange={(e) =>
                                      handleRowChange(
                                        index,
                                        "hours",
                                        Number(e.target.value),
                                      )
                                    }
                                  />
                                </td>

                                <td className="col-md-2">
                                  <div className="inputs-text-bluess inputs-text-bluess--computed">
                                    {calculateRowDailyKwh(item)}
                                  </div>
                                </td>

                                <td className="appliance-table-td-actions text-center align-middle py-2">
                                  <button
                                    type="button"
                                    className="ass-row-remove-btn"
                                    disabled={
                                      visibleCustomCount <= MIN_EQUIP_ROWS
                                    }
                                    aria-label="Remove equipment row"
                                    onClick={() =>
                                      removeEquipmentRow(true, index)
                                    }
                                  >
                                    <Trash2
                                      size={18}
                                      strokeWidth={2}
                                      aria-hidden
                                    />
                                  </button>
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>

                    <TablePagination
                      totalRows={visibleCustomCount}
                      page={customPage}
                      onPageChange={setCustomPage}
                    />

                    <div className="buttons-actions bottom-bttns d-flex flex-wrap gap-3 mt-3">
                      <button
                        type="button"
                        className="dashed-btn"
                        onClick={() => addEquipmentRow(true)}
                      >
                        <span className="plus">+</span> Add Equipment
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 shadow-sm rounded-4 ass-first mt-3">
                <div className="d-flex align-items-center mb-3">
                  <div className="step-box me-3 step-box-main-objective">5</div>
                  <div>
                    <h5 className="fw-bold mb-1 heading-ass">
                      Site and Goal Inputs
                    </h5>
                    <p className="text-muted small mb-0 para-ass">
                      These details improve the recommendation without
                      overwhelming you
                    </p>
                  </div>
                </div>

                <div className="container mt-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label ass-field-label">
                        ROOF AREA
                      </label>
                      <div className="input-wrapper">
                        <input
                          type="number"
                          className="form-control ass-field-control"
                          placeholder="200"
                          value={roofArea}
                          onChange={(e) => setRoofArea(e.target.value)}
                        />
                        <span className="unit">m²</span>
                      </div>
                    </div>

                    <div className="col-md-6" id="ass-field-backupDuration">
                      <label className="form-label ass-field-label">
                        Backup Duration Required
                      </label>
                      <select
                        name="backupDuration"
                        className={`form-select ass-field-control${
                          calculateErrors.backupDuration ? " is-invalid" : ""
                        }`}
                        value={backupDuration}
                        aria-invalid={Boolean(calculateErrors.backupDuration)}
                        onChange={(e) => {
                          setBackupDuration(e.target.value);
                          clearCalculateError("backupDuration");
                        }}
                      >
                        <option value="">Select Duration Required</option>
                        {(catalogs?.backupDurations?.length
                          ? catalogs.backupDurations
                          : ["1", "2", "3", "4", "5", "6", "7", "8"]
                        ).map((duration) => (
                          <option key={duration} value={duration}>
                            {duration}{" "}
                            {Number(duration) === 1 ? "hour" : "hours"}
                          </option>
                        ))}
                      </select>
                      {calculateErrors.backupDuration && (
                        <p className="ass-field-error" role="alert">
                          {calculateErrors.backupDuration}
                        </p>
                      )}
                    </div>
                    <p
                      className="text-muted small mb-0 para-ass"
                      id="ass-field-mainObjective"
                    >
                      Main Objective
                    </p>

                    {Objectiveoptions.map((item) => (
                      <div className="col-md-4" key={item.title}>
                        <div
                          className={`option-card option-card-main-objective ${
                            selectedObjective === item.title ? "active" : ""
                          }`}
                          onClick={() => {
                            setSelectedObjective(item.title);
                            clearCalculateError("mainObjective");
                          }}
                        >
                          <div className="d-flex option-card-main-objective-individual">
                            <div className="icon-box-topsss me-2 ">
                              <item.Icon
                                size={20}
                                strokeWidth={2}
                                aria-hidden
                              />
                            </div>

                            <div className="flex-grow-1">
                              <h6 className="mb-1 fw-semibold ass-semi clears">
                                {item.title}
                              </h6>
                              <p className="small mb-0 text-muted ass-muted">
                                {item.desc}
                              </p>
                            </div>

                            {selectedObjective === item.title && (
                              <div className="check-icon">✔</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {calculateErrors.mainObjective && (
                      <div className="col-12">
                        <p className="ass-field-error mb-0" role="alert">
                          {calculateErrors.mainObjective}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="d-none d-lg-block">{assessmentCtaBar}</div>
            </div>

            <div className="col-lg-4">
              <div
                className="assessment-summary-metrics-mobile d-lg-none"
                aria-busy={isLoadingLiveSummary}
              >
                <div
                  className={`assessment-summary-mobile-live-head${
                    isLoadingLiveSummary ? " is-updating" : ""
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  <span
                    className="assessment-summary-mobile-live-dot"
                    aria-hidden
                  />
                  <span className="assessment-summary-mobile-live-title">
                    {isLoadingLiveSummary
                      ? "Updating live summary"
                      : "Live summary"}
                  </span>
                </div>
                <p className="assessment-summary-mobile-live-hint">
                  Key figures update as you enter your assessment.
                </p>

                {isLoadingLiveSummary ? (
                  <>
                    <LiveSummaryCardSkeleton variant="mobile" />
                    <LiveSummaryCardSkeleton variant="mobile" />
                    <LiveSummaryCardSkeleton variant="mobile" />
                    <LiveSummaryCardSkeleton variant="mobile" />
                  </>
                ) : (
                  <>
                    <div className="assessment-summary-mobile-row">
                      <div className="assessment-summary-mobile-icon-wrap">
                        <img src={buleone} alt="" />
                      </div>
                      <div className="assessment-summary-mobile-body">
                        <div className="assessment-summary-mobile-value">
                          {summaryFirstMetricValue}
                        </div>
                        <div className="assessment-summary-mobile-labels">
                          <span>{summaryFirstMetricUnit}</span>
                          <span className="fw-bold">
                            {summaryFirstMetricLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="assessment-summary-mobile-row">
                      <div className="assessment-summary-mobile-icon-wrap">
                        <img src={buletwo} alt="" />
                      </div>
                      <div className="assessment-summary-mobile-body">
                        <div className="assessment-summary-mobile-value">
                          {summarySecondMetricValue}
                        </div>
                        <div className="assessment-summary-mobile-labels">
                          {inputMethod !== "bill" && <span>kWh/month</span>}
                          <span className="fw-bold">
                            {summarySecondMetricLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="assessment-summary-mobile-row">
                      <div className="assessment-summary-mobile-icon-wrap">
                        <img src={bulefour} alt="" />
                      </div>
                      <div className="assessment-summary-mobile-body">
                        <div className="assessment-summary-mobile-value">
                          {summaryEstimatedAnnualLoad}
                        </div>
                        <div className="assessment-summary-mobile-labels">
                          <span className="fw-bold text-uppercase">
                            ESTIMATED ANNUAL LOAD
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="assessment-summary-mobile-row">
                      <div className="assessment-summary-mobile-icon-wrap">
                        <img src={bulethree} alt="" />
                      </div>
                      <div className="assessment-summary-mobile-body">
                        <div className="assessment-summary-mobile-value">
                          {summaryAssessmentPathTitle}
                        </div>
                        <div className="assessment-summary-mobile-labels">
                          <span className="fw-bold text-uppercase">
                            ASSESSMENT PATH
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="d-lg-none">{assessmentCtaBar}</div>

              <div className="d-none d-lg-block p-4 rounded-4 shadow-sm right-panel assts-right">
                <div className="botton-line mb-4">
                  <div className="step-item active">
                    <span className="step-circle">✔</span>
                    <span>Building & energy context</span>
                  </div>

                  <div className="step-item active">
                    <span className="step-circle">2</span>
                    <span>Load estimate from bill or appliances</span>
                  </div>

                  <div className="step-item disabled">
                    <span className="step-circle">3</span>
                    <span>System size & savings recommendation</span>
                  </div>
                </div>

                <div
                  className="row g-3 flex-wrap"
                  aria-busy={isLoadingLiveSummary}
                >
                  {isLoadingLiveSummary ? (
                    [0, 1, 2, 3].map((key) => (
                      <div className="col-6" key={key}>
                        <LiveSummaryCardSkeleton variant="desktop" />
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="col-6">
                        <div className="stat-card text-center">
                          <div className="icon-box-build-right mb-2">
                            <img src={buleone} alt="icon" />
                          </div>
                          <h5 className="asst-h">{summaryFirstMetricValue}</h5>
                          <div className="usage-wrapper">
                            <small>{summaryFirstMetricUnit}</small>
                            <small>
                              <b>{summaryFirstMetricLabel}</b>
                            </small>
                          </div>
                        </div>
                      </div>

                      <div className="col-6">
                        <div className="stat-card text-center">
                          <div className="icon-box-build-right  mb-2">
                            <img src={buletwo} alt="icon" />
                          </div>
                          <h5 className="asst-h">{summarySecondMetricValue}</h5>
                          <div className="usage-wrapper">
                            {inputMethod !== "bill" && (
                              <small>kWh/month</small>
                            )}
                            <small>
                              <b>{summarySecondMetricLabel}</b>
                            </small>
                          </div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="stat-card text-center">
                          <div className="icon-box-build-right mb-2">
                            <img src={bulefour} alt="icon" />
                          </div>
                          <h5 className="asst-h">
                            {summaryEstimatedAnnualLoad === "N/A"
                              ? "N/A"
                              : `${summaryEstimatedAnnualLoad} kWh`}
                          </h5>
                          <div className="usage-wrapper">
                            <small>
                              <b>ESTIMATED ANNUAL LOAD</b>
                            </small>
                          </div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="stat-card text-center">
                          <div className="icon-box-build-right mb-2">
                            <img src={bulethree} alt="icon" />
                          </div>
                          <h5 className="asst-h">
                            {summaryAssessmentPathTitle}
                          </h5>
                          <small>
                            <b>ASSESSMENT PATH</b>
                          </small>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="summary-box">
                  <div
                    className={`live-header${
                      isLoadingLiveSummary ? " is-updating" : ""
                    }`}
                  >
                    <span className="dot"></span>
                    <span className="live-text">
                      {isLoadingLiveSummary
                        ? "Updating live summary…"
                        : "Live summary panel"}
                    </span>
                  </div>

                  <p className="summary-desc">
                    Solarvy updates your estimated energy and system size in
                    real time as you enter information. These values form the
                    basis for your solar, battery, and hybrid recommendations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Assesement;
