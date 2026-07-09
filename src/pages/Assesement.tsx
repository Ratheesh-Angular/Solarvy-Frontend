import { useLayoutEffect, useRef, useState } from "react";
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
import {
  AirVent,
  BatteryCharging,
  Building2,
  Calculator,
  Factory,
  Fan,
  Fuel,
  Home,
  Hospital,
  Hotel,
  LayoutGrid,
  Lightbulb,
  PlugZap,
  Receipt,
  School,
  Sun,
  Trash2,
  Tv,
  Wallet,
  Wrench,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
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
  extractBillValues,
  getExcelCatalogs,
  getTemplatePrefill,
} from "../lib/excelApi";
import type {
  ExcelCatalogs,
  EquipmentCatalogItem,
  LoadTableRow,
} from "../types/assessment";

type ApplianceCatalogItem = {
  kind: string;
  label: string;
  defaultPower: number;
  Icon: LucideIcon;
};

/** Icon lookup for equipment names coming from the Excel "Equipment Default" sheet. */
const EQUIPMENT_ICON_RULES: Array<[RegExp, LucideIcon]> = [
  [/bulb|light|led/i, Lightbulb],
  [/fan/i, Fan],
  [/tv|television|display/i, Tv],
  [/ac\b|a\/c|air/i, AirVent],
  [/fridge|refrigerator|freezer|cold/i, BatteryCharging],
  [/router|wifi|cctv|computer|pos|charger/i, PlugZap],
  [/pump|motor|compressor|machine|cnc/i, Wrench],
];

function iconForEquipment(name: string): LucideIcon {
  for (const [pattern, Icon] of EQUIPMENT_ICON_RULES) {
    if (pattern.test(name)) return Icon;
  }
  return PlugZap;
}

/** Build the appliance dropdown catalog from the Excel equipment list. */
function catalogFromEquipment(
  items: EquipmentCatalogItem[],
): ApplianceCatalogItem[] {
  return items.map((item) => ({
    kind: item.name,
    label: item.name,
    defaultPower: item.watts,
    Icon: iconForEquipment(item.name),
  }));
}

const FALLBACK_EQUIPMENT_CATALOG: ApplianceCatalogItem[] = [
  { kind: "LED bulb", label: "LED bulb", defaultPower: 10, Icon: Lightbulb },
  { kind: "Fan", label: "Fan", defaultPower: 60, Icon: Fan },
  { kind: "TV", label: "TV", defaultPower: 100, Icon: Tv },
  { kind: "AC 1HP", label: "AC 1HP", defaultPower: 900, Icon: AirVent },
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
/** Excel Appliance_Input / Custom_Equipment tables support rows 4–23. */
const MAX_EQUIP_ROWS = 20;

const newRowId = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`}`;

const defaultRowFromCatalog = (
  prefix: string,
  catalog: ApplianceCatalogItem[],
  customEquipment: boolean,
): LoadTableRow => {
  const first = catalog[0] ?? FALLBACK_EQUIPMENT_CATALOG[0];
  return {
    id: newRowId(prefix),
    kind: first.kind,
    qty: 1,
    hours: 8,
    power: first.defaultPower,
    ...(customEquipment ? { loadFactorPct: 100 } : {}),
  };
};

function ApplianceKindSelect({
  rowIndex,
  catalog,
  valueKind,
  onPick,
  openRow,
  onOpenChange,
}: {
  rowIndex: number;
  catalog: ApplianceCatalogItem[];
  valueKind: string;
  onPick: (kind: string) => void;
  openRow: number | null;
  onOpenChange: (row: number | null) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);
  const selected = catalog.find((o) => o.kind === valueKind);
  const isOpen = openRow === rowIndex;
  const TriggerIcon = selected?.Icon ?? Lightbulb;

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPos(null);
      return;
    }
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const margin = 16;
      const maxMenuW = Math.min(340, vw - margin * 2);
      const minWidth = Math.min(Math.max(r.width, 200), maxMenuW);
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
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(isOpen ? null : rowIndex);
        }}
      >
        <span className="appliance-select-trigger-inner">
          <span className="tables-icon-box-custom appliance-select-icon-wrap">
            <TriggerIcon
              size={18}
              strokeWidth={2}
              aria-hidden
              className="appliance-select-trigger-icon"
            />
          </span>
          <span className="appliance-select-label">
            {selected?.label ?? "—"}
          </span>
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
              <ul
                className="appliance-select-menu appliance-select-menu--portal"
                role="listbox"
                style={{
                  position: "fixed",
                  top: menuPos.top,
                  left: menuPos.left,
                  minWidth: menuPos.minWidth,
                  maxWidth: "min(340px, calc(100vw - 32px))",
                  zIndex: 1000000,
                }}
              >
                {catalog.map((opt) => {
                  const OptionIcon = opt.Icon;
                  const active = opt.kind === valueKind;
                  return (
                    <li key={opt.kind} role="none">
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`appliance-select-option${active ? " is-active" : ""}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onPick(opt.kind);
                          onOpenChange(null);
                        }}
                      >
                        <span className="tables-icon-box-custom appliance-select-icon-wrap">
                          <OptionIcon size={18} strokeWidth={2} aria-hidden />
                        </span>
                        <span>{opt.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
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
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [billNotes, setBillNotes] = useState("");
  const [monthlyUsage, setMonthlyUsage] = useState("");
  const [usageUnit, setUsageUnit] = useState("");
  const [monthlySpend, setMonthlySpend] = useState("");
  const [gridTariff, setGridTariff] = useState("");
  const [monthlyElectricityBill, setMonthlyElectricityBill] = useState("");
  const [roofArea, setRoofArea] = useState("");
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
      desc: "Enter kWh directly from your bill.",
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
  };

  const [applianceRows, setApplianceRows] = useState<LoadTableRow[]>([]);
  const [customRows, setCustomRows] = useState<LoadTableRow[]>([]);

  // Load dropdown catalogs from the Excel workbook (auto-refreshes when the
  // client uploads an updated template — backend caches by file mtime).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getExcelCatalogs();
        if (!cancelled) setCatalogs(data);
      } catch {
        // fall back to hardcoded options; page stays usable
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Seed one editable row per table once the equipment catalog is known.
  useEffect(() => {
    if (!equipmentCatalog.length) return;
    setApplianceRows((prev) =>
      prev.length
        ? prev
        : [defaultRowFromCatalog("ap", equipmentCatalog, false)],
    );
    setCustomRows((prev) =>
      prev.length
        ? prev
        : [defaultRowFromCatalog("ce", equipmentCatalog, true)],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogs]);

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

  /** Select a template in the popup: Excel recalculates and returns prefill rows. */
  const handleTemplateSelect = async (template: string) => {
    setSelectedTemplate(template);
    setShowTemplatePopup(false);
    setIsPrefilling(true);
    setSaveError("");

    try {
      const prefill = await getTemplatePrefill(selectedProperty, template);
      if (prefill.applianceRows.length) {
        setApplianceRows(
          prefill.applianceRows.map((row) => ({
            id: newRowId("ap"),
            kind: row.name,
            qty: row.qty,
            hours: row.hours,
            power: row.watts,
            loadFactorPct: Math.round((row.dutyCycle || 1) * 100),
          })),
        );
      }
    } catch (error) {
      setSaveError(
        error instanceof ApiError
          ? error.message
          : "Unable to load template appliances from the calculator.",
      );
    } finally {
      setIsPrefilling(false);
    }
  };

  const [openApplianceSelectRow, setOpenApplianceSelectRow] = useState<
    number | null
  >(null);

  const calculateRowDailyKwh = (item: LoadTableRow) => {
    const lf = (item.loadFactorPct ?? 100) / 100;
    const q = Number(item.qty) || 0;
    const h = Number(item.hours) || 0;
    const p = Number(item.power) || 0;
    return ((q * h * p * lf) / 1000).toFixed(2);
  };

  const handleRowChange = (index: any, field: any, value: any) => {
    const setter = inputMethod === "custom" ? setCustomRows : setApplianceRows;

    setter((prevRows) => {
      const updatedRows: LoadTableRow[] = [...prevRows];

      if (!updatedRows[index]) return prevRows;

      if (field === "qty") {
        updatedRows[index].qty = Number(value) || 0;
      } else if (field === "hours") {
        updatedRows[index].hours = Number(value) || 0;
      } else if (field === "power") {
        updatedRows[index].power = Number(value) || 0;
      } else if (field === "loadFactorPct") {
        updatedRows[index].loadFactorPct = Math.min(
          100,
          Math.max(0, Number(value) || 0),
        );
      } else if (field === "kind") {
        updatedRows[index].kind = String(value);
      }

      if (field === "kind") {
        const opt = equipmentCatalog.find((o) => o.kind === value);
        if (opt) updatedRows[index].power = opt.defaultPower;
      }

      return updatedRows;
    });
  };

  const addEquipmentRow = (customEquipment: boolean) => {
    const row = defaultRowFromCatalog(
      customEquipment ? "ce" : "ap",
      equipmentCatalog,
      customEquipment,
    );
    const setter = customEquipment ? setCustomRows : setApplianceRows;
    // Excel table supports max 20 rows (rows 4–23)
    setter((prev) => (prev.length >= MAX_EQUIP_ROWS ? prev : [...prev, row]));
    setOpenApplianceSelectRow(null);
  };

  const removeEquipmentRow = (customEquipment: boolean, index: number) => {
    const setter = customEquipment ? setCustomRows : setApplianceRows;
    setter((prev) =>
      prev.length <= MIN_EQUIP_ROWS ? prev : prev.filter((_, i) => i !== index),
    );
    setOpenApplianceSelectRow((open) => {
      if (open === null) return null;
      if (open === index) return null;
      if (open > index) return open - 1;
      return open;
    });
  };

  useEffect(() => {
    setOpenApplianceSelectRow(null);
  }, [inputMethod]);

  /** Bill upload: extract usage/spend/tariff with OCR and prefill (editable). */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFileName("No file chosen");
      return;
    }

    setFileName(file.name);
    setIsExtractingBill(true);
    setSaveError("");

    try {
      const extracted = await extractBillValues(file);
      let filled = 0;

      if (extracted.monthlyUsage !== null) {
        setMonthlyUsage(String(extracted.monthlyUsage));
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
        setSaveMessage("Bill values extracted — review and edit if needed.");
        setSaveError("");
      } else {
        setSaveError(
          "Could not detect bill values automatically. Please enter them manually.",
        );
      }
    } catch (error) {
      setSaveError(
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
      } catch (error) {
        if (!cancelled) {
          setSaveError(
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
  }, [draftIdParam]);

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const payload = getFormPayload();

      if (draftId) {
        await updateAssessmentDraft(draftId, payload);
        setSaveMessage("Draft saved successfully.");
      } else {
        const draft = await createAssessmentDraft(payload);
        setDraftId(draft.id);
        setSearchParams({ draft: String(draft.id) });
        setSaveMessage("Draft created and saved.");
      }
    } catch (error) {
      setSaveError(
        error instanceof ApiError
          ? error.message
          : "Unable to save draft. Please try again.",
      );
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleCompleteAssessment = async () => {
    setIsSubmitting(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const payload = getFormPayload();
      const result = draftId
        ? await completeAssessmentDraft(draftId, payload)
        : await completeAssessment(payload);

      navigate(`/assesement-result?assessment=${result.id}`);
    } catch (error) {
      setSaveError(
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
   * Live summary mirrors the Excel SUM formulas client-side for instant
   * feedback (Appliance_Input!L4/L5, Custom_Equipment!M4/M5, Bill_Input!B5).
   * Excel remains authoritative at Calculate time.
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
  const liveDailyKwh = sumDailyKwh(activeRows);
  const liveMonthlyKwh = liveDailyKwh * 30;

  const summaryFirstMetricValue =
    inputMethod === "bill" ? monthlyUsage || "0" : liveDailyKwh.toFixed(2);

  const summarySecondMetricValue =
    inputMethod === "bill"
      ? monthlySpend
        ? `N${Number(monthlySpend).toLocaleString()}`
        : "—"
      : liveMonthlyKwh.toFixed(1);

  const summaryEstimatedAnnualLoad =
    inputMethod === "bill"
      ? monthlyUsage
        ? String(Math.round(Number(monthlyUsage) * 12))
        : "—"
      : String(Math.round(liveDailyKwh * 365));

  const assessmentCtaBar = (
    <div className="d-flex gap-3 flex-wrap mt-3 mb-4 assessment-cta-bar">
      <button
        type="button"
        className="btn-primary-custom calu"
        onClick={handleCompleteAssessment}
        disabled={isSubmitting || isLoadingDraft}
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
        disabled={isSavingDraft || isLoadingDraft}
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
          {isLoadingDraft && (
            <div className="alert alert-info mb-3" role="status">
              Loading your saved assessment...
            </div>
          )}

          {saveMessage && (
            <div className="alert alert-success mb-3" role="status">
              {saveMessage}
            </div>
          )}

          {saveError && (
            <div className="alert alert-danger mb-3" role="alert">
              {saveError}
            </div>
          )}

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
                  <div className="col-md-6">
                    <label className="form-label ass-field-label">
                      COUNTRY
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="form-select ass-field-control"
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
                  </div>

                  <div className="col-md-6">
                    <label className="form-label ass-field-label">State</label>
                    <select
                      name="state"
                      value={
                        formData.country === "Nigeria" ? formData.state : ""
                      }
                      onChange={handleChange}
                      className="form-select ass-field-control"
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
                  </div>
                </div>
              </div>

              <div className="p-4 shadow-sm rounded-4 ass-first mt-3">
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
                      onClick={() => setSelectedPower(item.title)}
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
                          onClick={() =>
                            setInputMethod(
                              item.id as "bill" | "appliance" | "custom",
                            )
                          }
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
                  <div className="p-4 shadow-sm rounded-4 ass-first mt-3">
                    <div className="row mt-2 g-3">
                      <div className="col-md-6">
                        <label className="form-label ass-field-label ass-field-label--section mb-2">
                          Upload Bill (optional)
                        </label>
                        <div className="upload-box-ass text-center">
                          <div className="file-upload">
                            <label className="file-label">
                              <span className="file-btn">
                                {isExtractingBill
                                  ? "Reading bill..."
                                  : "Choose file"}
                              </span>
                              <span className="file-name">{fileName}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleFileChange}
                                disabled={isExtractingBill}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label ass-field-label ass-field-label--section mb-2">
                          Notes
                        </label>
                        <textarea
                          className="form-control ass-field-control notes-box ass-text-area"
                          placeholder="Any additional notes about the site, bill pattern, or load profile..."
                          value={billNotes}
                          onChange={(e) => setBillNotes(e.target.value)}
                        />
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
                      </div>
                    </div>

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
                            onChange={(e) => setMonthlyUsage(e.target.value)}
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
                            {applianceRows.map((item, index) => (
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
                                    disabled={
                                      applianceRows.length <= MIN_EQUIP_ROWS
                                    }
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
                            ))}
                          </tbody>
                        </table>
                      </div>
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
                            <th>LOAD FACTOR</th>
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
                          {customRows.map((item, index) => (
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

                              <td className="text-center">
                                <div className="inputs-text-bluess inputs-text-bluess--computed">
                                  {calculateRowDailyKwh(item)}
                                </div>
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
                                  disabled={customRows.length <= MIN_EQUIP_ROWS}
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
                          ))}
                        </tbody>
                      </table>
                    </div>

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

                    <div className="col-md-6">
                      <label className="form-label ass-field-label">
                        Backup Duration Required
                      </label>
                      <select
                        name="backupDuration"
                        className="form-select ass-field-control"
                        value={backupDuration}
                        onChange={(e) => setBackupDuration(e.target.value)}
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
                    </div>
                    <p className="text-muted small mb-0 para-ass">
                      Main Objective
                    </p>

                    {Objectiveoptions.map((item) => (
                      <div className="col-md-4" key={item.title}>
                        <div
                          className={`option-card option-card-main-objective ${
                            selectedObjective === item.title ? "active" : ""
                          }`}
                          onClick={() => setSelectedObjective(item.title)}
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
                  </div>
                </div>
              </div>

              <div className="d-none d-lg-block">{assessmentCtaBar}</div>
            </div>

            <div className="col-lg-4">
              <div className="assessment-summary-metrics-mobile d-lg-none">
                <div
                  className="assessment-summary-mobile-live-head"
                  role="status"
                  aria-live="polite"
                >
                  <span
                    className="assessment-summary-mobile-live-dot"
                    aria-hidden
                  />
                  <span className="assessment-summary-mobile-live-title">
                    Live summary
                  </span>
                </div>
                <p className="assessment-summary-mobile-live-hint">
                  Key figures update as you enter your assessment.
                </p>

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
                      <span className="fw-bold">{summaryFirstMetricLabel}</span>
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

                <div className="row g-3 flex-wrap">
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
                        {inputMethod !== "bill" && <small>kWh/month</small>}
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
                      <h5 className="asst-h">{summaryEstimatedAnnualLoad}</h5>
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
                      <h5 className="asst-h">{summaryAssessmentPathTitle}</h5>
                      <small>
                        <b>ASSESSMENT PATH</b>
                      </small>
                    </div>
                  </div>
                </div>

                <div className="summary-box">
                  <div className="live-header">
                    <span className="dot"></span>
                    <span className="live-text">Live summary panel</span>
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
