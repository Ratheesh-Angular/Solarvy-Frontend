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
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

type LoadTableRow = {
  id: string;
  kind: string;
  qty: number;
  hours: number;
  power: number;
  /** Percent 0–100; used only in Custom Equipment daily kWh. */
  loadFactorPct?: number;
};

type ApplianceCatalogItem = {
  kind: string;
  label: string;
  defaultPower: number;
  Icon: LucideIcon;
};

const APPLIANCE_CALC_CATALOG: ApplianceCatalogItem[] = [
  { kind: "led-bulb", label: "LED Bulb", defaultPower: 10, Icon: Lightbulb },
  { kind: "fan", label: "Fan", defaultPower: 75, Icon: Fan },
  { kind: "tv", label: "TV", defaultPower: 120, Icon: Tv },
  { kind: "ac", label: "AC", defaultPower: 1500, Icon: AirVent },
];

const CUSTOM_EQUIP_CATALOG: ApplianceCatalogItem[] = [
  { kind: "ce-10", label: "Ultrasound", defaultPower: 10, Icon: Lightbulb },
  { kind: "ce-120", label: "Ultrasound", defaultPower: 120, Icon: Fan },
  { kind: "ce-70", label: "Ultrasound", defaultPower: 70, Icon: Tv },
  { kind: "ce-1500", label: "Ultrasound", defaultPower: 1500, Icon: AirVent },
];

type AppliancePresetRowTemplate = Pick<
  LoadTableRow,
  "kind" | "qty" | "hours" | "power"
>;

type AppliancePresetTab = {
  id: string;
  label: string;
  rows: AppliancePresetRowTemplate[];
};

/** Preset appliance lists per home size (Daily kWh is derived in the table). */
const APPLIANCE_PRESETS: AppliancePresetTab[] = [
  {
    id: "1-bedroom",
    label: "2 Bedroom House",
    rows: [
      { kind: "led-bulb", qty: 8, hours: 6, power: 10 },
      { kind: "fan", qty: 3, hours: 8, power: 75 },
      { kind: "tv", qty: 2, hours: 4, power: 120 },
      { kind: "ac", qty: 1, hours: 6, power: 1500 },
    ],
  },
  {
    id: "2-bedroom",
    label: "2 Bedroom House",
    rows: [
      { kind: "led-bulb", qty: 8, hours: 6, power: 10 },
      { kind: "fan", qty: 3, hours: 8, power: 75 },
      { kind: "tv", qty: 2, hours: 4, power: 120 },
      { kind: "ac", qty: 1, hours: 6, power: 1500 },
    ],
  },
  {
    id: "3-bedroom",
    label: "3 Bedroom House",
    rows: [
      { kind: "led-bulb", qty: 14, hours: 6, power: 10 },
      { kind: "fan", qty: 5, hours: 10, power: 75 },
      { kind: "tv", qty: 3, hours: 5, power: 120 },
      { kind: "ac", qty: 2, hours: 7, power: 1500 },
    ],
  },
  {
    id: "duplex",
    label: "Duplex Houses",
    rows: [
      { kind: "led-bulb", qty: 18, hours: 6, power: 10 },
      { kind: "fan", qty: 7, hours: 12, power: 75 },
      { kind: "tv", qty: 4, hours: 6, power: 120 },
      { kind: "ac", qty: 3, hours: 8, power: 1500 },
    ],
  },
];

function loadApplianceRowsFromPreset(
  preset: AppliancePresetTab,
): LoadTableRow[] {
  return preset.rows.map((r) => ({
    id: newRowId("ap"),
    kind: r.kind,
    qty: r.qty,
    hours: r.hours,
    power: r.power,
  }));
}

type CustomPresetRowTemplate = Pick<
  LoadTableRow,
  "kind" | "qty" | "hours" | "power"
> & {
  loadFactorPct?: number;
};

type CustomPresetTab = {
  id: string;
  label: string;
  rows: CustomPresetRowTemplate[];
};

/** Preset custom equipment rows per scenario (same tab labels as appliance calculator). */
const CUSTOM_PRESETS: CustomPresetTab[] = [
  {
    id: "1-bedroom",
    label: "1 Bedroom House",
    rows: [
      { kind: "ce-10", qty: 6, hours: 6, power: 10, loadFactorPct: 100 },
      { kind: "ce-120", qty: 1, hours: 4, power: 120, loadFactorPct: 100 },
      { kind: "ce-70", qty: 1, hours: 7, power: 70, loadFactorPct: 90 },
      { kind: "ce-1500", qty: 1, hours: 5, power: 1500, loadFactorPct: 65 },
    ],
  },
  {
    id: "2-bedroom",
    label: "2 Bedroom House",
    rows: [
      { kind: "ce-10", qty: 6, hours: 6, power: 10, loadFactorPct: 100 },
      { kind: "ce-120", qty: 1, hours: 4, power: 120, loadFactorPct: 100 },
      { kind: "ce-70", qty: 1, hours: 7, power: 70, loadFactorPct: 90 },
      { kind: "ce-1500", qty: 1, hours: 5, power: 1500, loadFactorPct: 65 },
    ],
  },
  {
    id: "3-bedroom",
    label: "3 Bedroom House",
    rows: [
      { kind: "ce-10", qty: 10, hours: 6, power: 10, loadFactorPct: 100 },
      { kind: "ce-120", qty: 1, hours: 5, power: 120, loadFactorPct: 100 },
      { kind: "ce-70", qty: 2, hours: 8, power: 70, loadFactorPct: 100 },
      { kind: "ce-1500", qty: 1, hours: 6, power: 1500, loadFactorPct: 100 },
    ],
  },
  {
    id: "duplex",
    label: "Duplex Houses",
    rows: [
      { kind: "led-bulb", qty: 18, hours: 6, power: 10 },
      { kind: "fan", qty: 7, hours: 12, power: 75 },
      { kind: "tv", qty: 4, hours: 6, power: 120 },
      { kind: "ac", qty: 3, hours: 8, power: 1500 },
    ],
  },
];

function loadCustomRowsFromPreset(preset: CustomPresetTab): LoadTableRow[] {
  return preset.rows.map((r) => ({
    id: newRowId("ce"),
    kind: r.kind,
    qty: r.qty,
    hours: r.hours,
    power: r.power,
    loadFactorPct: r.loadFactorPct ?? 100,
  }));
}

const MIN_EQUIP_ROWS = 1;

const newRowId = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`}`;

const defaultRowFromCatalog = (
  prefix: string,
  catalog: ApplianceCatalogItem[],
  customEquipment: boolean,
): LoadTableRow => {
  const first = catalog[0];
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
  const [selected, setSelected] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState(1);
  const [selectedPower, setSelectedPower] = useState(1);
  const [inputMethod, setInputMethod] = useState<
    "bill" | "appliance" | "custom"
  >("bill");
  const [selectedObjectiveId, setSelectedObjectiveId] = useState("bill");
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

  const Objectiveoptions: {
    id: string;
    title: string;
    desc: string;
    Icon: LucideIcon;
  }[] = [
    {
      id: "bill",
      title: "Reduce Diesel Use",
      desc: "Cut diesel consumption.",
      Icon: Fuel,
    },
    {
      id: "appliance",
      title: "Reduce Electricity Bills",
      desc: "Lower monthly energy costs.",
      Icon: Wallet,
    },
    {
      id: "custom",
      title: "Backup During Outages",
      desc: "Maintain power when grid fails.",
      Icon: BatteryCharging,
    },
  ];

  const propertyOptions: {
    id: number;
    title: string;
    desc: string;
    Icon: LucideIcon;
  }[] = [
    {
      id: 1,
      title: "Home",
      desc: "Backup and lower energy bills",
      Icon: Home,
    },
    {
      id: 2,
      title: "Hotel",
      desc: "Optimise generator and hybrid power",
      Icon: Hotel,
    },
    {
      id: 3,
      title: "Factory",
      desc: "Support larger equipment loads",
      Icon: Factory,
    },
    {
      id: 4,
      title: "Commercial Building",
      desc: "Reduce business electricity cost",
      Icon: Building2,
    },
    {
      id: 5,
      title: "Hospital",
      desc: "Reliable power for critical systems",
      Icon: Hospital,
    },
    {
      id: 6,
      title: "School",
      desc: "Maximise daytime solar savings",
      Icon: School,
    },
  ];

  const powerOptions: {
    id: number;
    title: string;
    desc: string;
    Icon: LucideIcon;
  }[] = [
    {
      id: 1,
      title: "Grid + Generator",
      desc: "Grid supply with backup generator",
      Icon: PlugZap,
    },
    {
      id: 2,
      title: "Grid Only",
      desc: "Utility electricity supply only",
      Icon: LayoutGrid,
    },
    {
      id: 3,
      title: "Solar + Grid",
      desc: "Solar connected with utility supply",
      Icon: Sun,
    },
  ];

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

  const categories = [
    "Hospitals",
    "Factories",
    "Hotels",
    "Clinics",
    "Farms",
    "Workshops",
  ];

  const [activeTab, setActiveTab] = useState("Businesses");

  const [appliancePresetTabId, setAppliancePresetTabId] = useState(
    APPLIANCE_PRESETS[0].id,
  );
  const [applianceRows, setApplianceRows] = useState<LoadTableRow[]>(() =>
    loadApplianceRowsFromPreset(APPLIANCE_PRESETS[0]),
  );
  const [customPresetTabId, setCustomPresetTabId] = useState(
    CUSTOM_PRESETS[1].id,
  );
  const [customRows, setCustomRows] = useState<LoadTableRow[]>(() =>
    loadCustomRowsFromPreset(CUSTOM_PRESETS[1]),
  );

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
        const catalog =
          inputMethod === "custom"
            ? CUSTOM_EQUIP_CATALOG
            : APPLIANCE_CALC_CATALOG;
        const opt = catalog.find((o) => o.kind === value);
        if (opt) updatedRows[index].power = opt.defaultPower;
      }

      return updatedRows;
    });
  };

  const addEquipmentRow = (customEquipment: boolean) => {
    const row = defaultRowFromCatalog(
      customEquipment ? "ce" : "ap",
      customEquipment ? CUSTOM_EQUIP_CATALOG : APPLIANCE_CALC_CATALOG,
      customEquipment,
    );
    if (customEquipment) setCustomRows((prev) => [...prev, row]);
    else setApplianceRows((prev) => [...prev, row]);
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

  const handleFileChange = (e: any) => {
    if (e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    } else {
      setFileName("No file chosen");
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
  const summarySecondMetricValue = inputMethod === "bill" ? "N200,000" : "1.9";

  /** Shared display values — update in one place for desktop & mobile summaries. */
  const summaryFirstMetricValue = "11.3";
  const summaryEstimatedAnnualLoad = "340";

  const assessmentCtaBar = (
    <div className="d-flex gap-3 flex-wrap mt-3 mb-4 assessment-cta-bar">
      <button
        type="button"
        className="btn-primary-custom calu"
        onClick={() => navigate("/assesement-result")}
      >
        <span className="icon-sun">
          <img src={sunone} alt="icon" />
        </span>
        <span>Calculate My Energy System</span>
        <span className="arrows">
          <img src={sunthree} alt="icon" />
        </span>
      </button>

      <button className="btn-outline-custom2 calu-2">
        <span className="icon-sun">
          <img src={save} alt="icon" />
        </span>
        <span>Save Draft</span>
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
                    <div className="col-6 col-lg-4 d-flex" key={item.id}>
                      <div
                        className={`property-card w-100 ${selectedProperty === item.id ? "active" : ""}`}
                        onClick={() => setSelectedProperty(item.id)}
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

                          {selectedProperty === item.id && (
                            <div className="check-icon-homss">✔</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

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
                      <option value="Nigeria">Nigeria</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label ass-field-label">STATE</label>
                    <select
                      name="state"
                      value={
                        formData.country === "Nigeria" ? formData.state : ""
                      }
                      onChange={handleChange}
                      className="form-select ass-field-control"
                    >
                      <option value="">Select state</option>
                      {NIGERIA_STATES_SORTED.map(([slug, label]) => (
                        <option key={slug} value={label}>
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
                  <div className="parent-container onlt-this">
                    <div
                      key={item.id}
                      className={`property-card  ${selectedPower === item.id ? "active" : ""}`}
                      onClick={() => setSelectedPower(item.id)}
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
                          {selectedPower === item.id && (
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
                              <span className="file-btn">Choose file</span>
                              <span className="file-name">{fileName}</span>
                              <input type="file" onChange={handleFileChange} />
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
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label ass-field-label">
                            UNIT
                          </label>
                          <select className="form-select ass-field-control">
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
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label ass-field-label">
                            GRID TARIFF PER KWH
                          </label>
                          <input
                            type="text"
                            className="form-control ass-field-control"
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label ass-field-label">
                            PEAK LOAD (Optional)
                          </label>
                          <input
                            type="text"
                            className="form-control ass-field-control"
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label ass-field-label">
                            AVERAGE OUTAGE HOURS / DAY
                          </label>
                          <input
                            type="text"
                            className="form-control ass-field-control"
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
                      <div
                        className="tag-row appliance-preset-tabs"
                        role="tablist"
                        aria-label="Typical load by home size"
                      >
                        {APPLIANCE_PRESETS.map((preset) => {
                          const selected = appliancePresetTabId === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              role="tab"
                              aria-selected={selected}
                              className={`badge-custom appliance-preset-tab${selected ? " appliance-preset-tab--selected" : ""}`}
                              onClick={() => {
                                setAppliancePresetTabId(preset.id);
                                setApplianceRows(
                                  loadApplianceRowsFromPreset(preset),
                                );
                                setOpenApplianceSelectRow(null);
                              }}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
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
                                    catalog={APPLIANCE_CALC_CATALOG}
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
                    <div
                      className="tag-row appliance-preset-tabs"
                      role="tablist"
                      aria-label="Typical custom equipment by scenario"
                    >
                      {CUSTOM_PRESETS.map((preset) => {
                        const selected = customPresetTabId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            className={`badge-custom appliance-preset-tab${selected ? " appliance-preset-tab--selected" : ""}`}
                            onClick={() => {
                              setCustomPresetTabId(preset.id);
                              setCustomRows(loadCustomRowsFromPreset(preset));
                              setOpenApplianceSelectRow(null);
                            }}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
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
                                  catalog={CUSTOM_EQUIP_CATALOG}
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
                        />
                        <span className="unit">m²</span>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label ass-field-label">
                        Backup Duration Required
                      </label>
                      <select
                        name="country"
                        className="form-select ass-field-control"
                      >
                        <option value="">Select Duration Required</option>
                        <option value="Nigeria">1</option>
                        <option value="India">2</option>
                        <option value="USA">3</option>
                        <option value="USA">4</option>
                        <option value="USA">5</option>
                        <option value="USA">6</option>
                        <option value="USA">7</option>
                        <option value="USA">8</option>
                      </select>
                    </div>
                    <p className="text-muted small mb-0 para-ass">
                      Main Objective
                    </p>

                    {Objectiveoptions.map((item) => (
                      <div className="col-md-4" key={item.id}>
                        <div
                          className={`option-card option-card-main-objective ${
                            selectedObjectiveId === item.id ? "active" : ""
                          }`}
                          onClick={() => setSelectedObjectiveId(item.id)}
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

                            {selectedObjectiveId === item.id && (
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
