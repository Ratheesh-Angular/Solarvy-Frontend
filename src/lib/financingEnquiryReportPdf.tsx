/**
 * Solarvy Financing Enquiry Pack PDF
 *
 * Two-page A4 pack for sharing enquiry details with investors / lenders:
 *   Page 1 — Cover: branding, meta, KPIs, applicant/user, executive summary.
 *   Page 2 — Request detail, partner/route, project snapshot, consents, disclaimer.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  pdf,
} from "@react-pdf/renderer";
import type { AdminFinancingEnquiry } from "./adminApi";
import { financingStatusLabel } from "./adminApi";
import notoSansRegular from "../assets/fonts/NotoSans-Regular.ttf";
import notoSansBold from "../assets/fonts/NotoSans-Bold.ttf";
import appLogo from "../assets/images/logo-dark.png";

Font.register({
  family: "NotoSans",
  src: notoSansRegular,
});
Font.register({
  family: "NotoSans-Bold",
  src: notoSansBold,
});

const MISSING = "N/A";

export type FinancingApplicantContact = {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  visitorLabel?: string | null;
};

export type FinancingEnquiryReportPayload = {
  record: AdminFinancingEnquiry;
  applicantContact?: FinancingApplicantContact;
  /** Download date string, e.g. "4 November 2026" */
  generatedDate: string;
  logoSrc?: string;
};

const toNum = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const formatNaira = (value: unknown): string => {
  const n = toNum(value);
  if (n === null) return MISSING;
  return `₦${Math.round(n).toLocaleString("en-NG", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })}`;
};

const formatText = (value: unknown): string => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return MISSING;
  }
  return String(value);
};

const formatSize = (value: number | null | undefined, unit: string): string | null => {
  if (value == null || !Number.isFinite(value)) return null;
  return `${(Math.round(value * 10) / 10).toLocaleString("en-NG")} ${unit}`;
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return MISSING;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return MISSING;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function formatFinancingReportDate(date = new Date()): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const colors = {
  navy: "#1b3b6b",
  navyDeep: "#193760",
  orange: "#F5921E",
  text: "#3a3f47",
  textDark: "#22303f",
  muted: "#7f8b9a",
  line: "#d8e0e9",
  tableHeaderBg: "#e9eef4",
  white: "#ffffff",
  noteCream: "#fbf3e0",
  noteCreamBorder: "#eddaae",
  panelBlue: "#eaf1f9",
  panelBlueBorder: "#d3e0ef",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.white,
    paddingTop: 30,
    paddingBottom: 46,
    paddingHorizontal: 36,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  brandLogo: {
    width: 120,
    height: 36,
    objectFit: "contain",
  },
  headerMeta: {
    textAlign: "right",
  },
  headerMetaLabel: {
    fontSize: 7,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerMetaValue: {
    fontSize: 9,
    fontFamily: "NotoSans-Bold",
    color: colors.navy,
  },
  footer: {
    position: "absolute",
    left: 36,
    right: 36,
    bottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: colors.muted,
  },
  eyebrow: {
    fontSize: 8,
    color: colors.navy,
    fontFamily: "NotoSans-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontFamily: "NotoSans-Bold",
    color: colors.navy,
    lineHeight: 1.2,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    color: colors.text,
    lineHeight: 1.4,
    marginBottom: 10,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginBottom: 10,
  },
  metaItem: {
    width: "50%",
    marginBottom: 12,
  },
  metaLabel: {
    fontSize: 7.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 12,
    fontFamily: "NotoSans-Bold",
    color: colors.navy,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "NotoSans-Bold",
    color: colors.navy,
    marginTop: 12,
    marginBottom: 8,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 3,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  kpiLabel: {
    fontSize: 6.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  kpiValue: {
    fontSize: 10,
    fontFamily: "NotoSans-Bold",
    color: colors.navy,
  },
  darkPanel: {
    marginTop: 14,
    backgroundColor: colors.navyDeep,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  darkPanelTitle: {
    fontSize: 9,
    fontFamily: "NotoSans-Bold",
    color: colors.white,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  darkPanelText: {
    fontSize: 9,
    color: "#dbe4f0",
    lineHeight: 1.5,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.tableHeaderBg,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: "NotoSans-Bold",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  colLeft: {
    width: "42%",
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  colRight: {
    width: "58%",
    paddingLeft: 8,
  },
  cellLabel: {
    fontSize: 9,
    color: colors.textDark,
  },
  cellValue: {
    fontSize: 9,
    color: colors.navy,
  },
  listBlock: {
    marginTop: 4,
    marginBottom: 6,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 4,
    gap: 6,
  },
  listBullet: {
    fontSize: 9,
    fontFamily: "NotoSans-Bold",
    color: colors.orange,
    width: 10,
  },
  listText: {
    flex: 1,
    fontSize: 8.5,
    color: colors.text,
    lineHeight: 1.4,
  },
  noteBox: {
    marginTop: 10,
    backgroundColor: colors.noteCream,
    borderWidth: 1,
    borderColor: colors.noteCreamBorder,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  noteText: {
    fontSize: 7.5,
    color: colors.text,
    lineHeight: 1.5,
  },
  noteBold: {
    fontFamily: "NotoSans-Bold",
    color: colors.navy,
  },
  bluePanel: {
    marginTop: 8,
    backgroundColor: colors.panelBlue,
    borderWidth: 1,
    borderColor: colors.panelBlueBorder,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  bluePanelTitle: {
    fontSize: 7.5,
    fontFamily: "NotoSans-Bold",
    color: colors.navy,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  bluePanelText: {
    fontSize: 8.5,
    color: colors.text,
    lineHeight: 1.45,
  },
  helpBox: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  helpTitle: {
    fontSize: 9,
    fontFamily: "NotoSans-Bold",
    color: colors.navy,
    marginBottom: 3,
  },
  helpText: {
    fontSize: 8,
    color: colors.text,
    lineHeight: 1.4,
    marginBottom: 4,
  },
  helpContact: {
    fontSize: 8,
    fontFamily: "NotoSans-Bold",
    color: colors.navy,
  },
});

function BrandLockup({ logoSrc }: { logoSrc?: string }) {
  return <Image src={logoSrc || appLogo} style={styles.brandLogo} />;
}

function ReportHeader({
  reference,
  logoSrc,
}: {
  reference: string;
  logoSrc?: string;
}) {
  return (
    <View style={styles.headerRow} fixed>
      <BrandLockup logoSrc={logoSrc} />
      <View style={styles.headerMeta}>
        <Text style={styles.headerMetaLabel}>Enquiry reference</Text>
        <Text style={styles.headerMetaValue}>{reference}</Text>
      </View>
    </View>
  );
}

function ReportFooter({ reference }: { reference: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {reference} · SolarVy Financing Enquiry
      </Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

function TwoColTable({
  columns,
  rows,
}: {
  columns: [{ header: string }, { header: string }];
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <View style={styles.colLeft}>
          <Text style={styles.tableHeaderText}>{columns[0].header}</Text>
        </View>
        <View style={styles.colRight}>
          <Text style={styles.tableHeaderText}>{columns[1].header}</Text>
        </View>
      </View>
      {rows.map((row, index) => (
        <View
          style={[
            styles.tableRow,
            index === rows.length - 1 ? { borderBottomWidth: 0 } : {},
          ]}
          key={`${row.label}-${index}`}
        >
          <View style={styles.colLeft}>
            <Text style={styles.cellLabel}>{row.label}</Text>
          </View>
          <View style={styles.colRight}>
            <Text style={styles.cellValue}>{row.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <Text style={styles.listText}>{MISSING}</Text>;
  }
  return (
    <View style={styles.listBlock}>
      {items.map((item) => (
        <View style={styles.listItem} key={item}>
          <Text style={styles.listBullet}>•</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function FinancingEnquiryDocument({
  record,
  applicantContact,
  generatedDate,
  logoSrc,
}: FinancingEnquiryReportPayload) {
  const project = record.projectSnapshot || {};
  const partner = record.partnerSnapshot || {};
  const requirements = Array.isArray(partner.requirements)
    ? partner.requirements.filter((item) => String(item || "").trim())
    : [];
  const sharedItems = Array.isArray(record.sharedItems)
    ? record.sharedItems.filter((item) => String(item || "").trim())
    : [];

  const projectCost = project.estimatedSystemCost ?? null;
  const financedShare =
    projectCost && record.amountToFinance
      ? Math.round((record.amountToFinance / projectCost) * 1000) / 10
      : null;

  const solar = formatSize(project.recommendedSolarKwp, "kWp");
  const battery = formatSize(project.recommendedBatteryKwh, "kWh");
  const system = [solar, battery].filter(Boolean).join(" + ") || MISSING;
  const projectLocation =
    [project.city, project.state]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .join(", ") || MISSING;
  const assessmentRef =
    record.assessmentRef ||
    project.assessmentRef ||
    project.requestedAssessmentRef ||
    null;

  const contact = applicantContact || {};
  const geoLocation =
    [contact.city, contact.region, contact.country]
      .filter((v) => v && String(v).trim())
      .join(", ") || MISSING;

  const amountLabel = formatNaira(record.amountToFinance);
  const partnerName = formatText(record.partnerName);
  const routeLabel = formatText(record.routeLabel || record.routeId);
  const statusLabel = financingStatusLabel(record.status);

  const consents = [
    {
      label:
        "Agreed to share the enquiry and assessment details with financing partners",
      checked: record.consentShare,
    },
    {
      label:
        "Confirmed the information is correct and authorised SolarVy to send it",
      checked: record.confirmAccurate,
    },
    {
      label: "Understood the enquiry is not an approval or credit offer",
      checked: record.confirmTerms,
    },
  ];

  return (
    <Document
      title={`SolarVy Financing Enquiry ${record.reference}`}
      author="SolarVy"
      subject="Financing enquiry pack"
    >
      <Page size="A4" style={styles.page}>
        <ReportHeader reference={record.reference} logoSrc={logoSrc} />

        <Text style={styles.eyebrow}>Financing enquiry pack</Text>
        <Text style={styles.title}>Shareable financing summary</Text>
        <Text style={styles.subtitle}>
          Prepared for preliminary review by financing partners, lenders and
          investors. Generated {generatedDate}.
        </Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Reference</Text>
            <Text style={styles.metaValue}>{formatText(record.reference)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Submitted</Text>
            <Text style={styles.metaValue}>
              {formatDateTime(record.createdAt)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>{statusLabel}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Assessment</Text>
            <Text style={styles.metaValue}>{formatText(assessmentRef)}</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Amount requested</Text>
            <Text style={styles.kpiValue}>{amountLabel}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Deposit available</Text>
            <Text style={styles.kpiValue}>
              {formatNaira(record.depositAvailable)}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Est. project cost</Text>
            <Text style={styles.kpiValue}>{formatNaira(projectCost)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Financed share</Text>
            <Text style={styles.kpiValue}>
              {financedShare != null ? `${financedShare}%` : MISSING}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Applicant / user</Text>
        <TwoColTable
          columns={[{ header: "Field" }, { header: "Details" }]}
          rows={[
            { label: "Full name", value: formatText(contact.fullName) },
            { label: "Email", value: formatText(contact.email) },
            { label: "Phone", value: formatText(contact.phone) },
            { label: "Visitor profile", value: formatText(contact.visitorLabel) },
            { label: "Recorded location", value: geoLocation },
            {
              label: "Enquiry location",
              value: formatText(record.location),
            },
            {
              label: "Applicant type",
              value: formatText(record.applicantType),
            },
          ]}
        />

        <View style={styles.darkPanel}>
          <Text style={styles.darkPanelTitle}>Executive summary</Text>
          <Text style={styles.darkPanelText}>
            The applicant requested {amountLabel} via {routeLabel}, selecting{" "}
            {partnerName} as the preferred financing partner
            {assessmentRef ? ` (linked assessment ${assessmentRef})` : ""}. This
            pack summarises the enquiry snapshot captured at submission for
            preliminary partner review.
          </Text>
        </View>

        <ReportFooter reference={record.reference} />
      </Page>

      <Page size="A4" style={styles.page}>
        <ReportHeader reference={record.reference} logoSrc={logoSrc} />

        <Text style={styles.sectionTitle}>Financing request</Text>
        <TwoColTable
          columns={[{ header: "Field" }, { header: "Details" }]}
          rows={[
            {
              label: "Applicant type",
              value: formatText(record.applicantType),
            },
            {
              label: "Amount to finance",
              value: formatNaira(record.amountToFinance),
            },
            {
              label: "Deposit available",
              value: formatNaira(record.depositAvailable),
            },
            {
              label: "Repayment period",
              value: formatText(
                record.repaymentLabel || record.repaymentPeriod,
              ),
            },
            {
              label: "Monthly income / revenue",
              value: formatText(record.incomeRange),
            },
            { label: "Location", value: formatText(record.location) },
            {
              label: "Notes from the user",
              value: formatText(record.notes?.trim() || null),
            },
          ]}
        />

        <Text style={styles.sectionTitle}>Selected route & partner</Text>
        <TwoColTable
          columns={[{ header: "Field" }, { header: "Details" }]}
          rows={[
            { label: "Financing route", value: routeLabel },
            { label: "Partner", value: partnerName },
            {
              label: "Partner description",
              value: formatText(partner.description),
            },
          ]}
        />
        <Text style={styles.bluePanelTitle}>Indicative requirements</Text>
        <BulletList items={requirements} />

        <Text style={styles.sectionTitle}>Project at submission</Text>
        <TwoColTable
          columns={[{ header: "Field" }, { header: "Details" }]}
          rows={[
            { label: "Assessment", value: formatText(assessmentRef) },
            {
              label: "Property type",
              value: formatText(project.propertyType),
            },
            { label: "Project location", value: projectLocation },
            { label: "Recommended system", value: system },
            {
              label: "Estimated system cost",
              value: formatNaira(project.estimatedSystemCost),
            },
            {
              label: "Est. annual savings",
              value: formatNaira(project.netAnnualSavings),
            },
          ]}
        />

        <Text style={styles.sectionTitle}>Consent & shared information</Text>
        <BulletList
          items={consents.map(
            (item) => `${item.checked ? "Yes" : "No"} — ${item.label}`,
          )}
        />
        <View style={styles.bluePanel}>
          <Text style={styles.bluePanelTitle}>Information agreed to share</Text>
          <BulletList items={sharedItems} />
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            <Text style={styles.noteBold}>Disclaimer. </Text>
            This document is a preliminary financing enquiry summary prepared by
            SolarVy. It is not a credit offer, loan approval, or guarantee of
            financing. Final eligibility, rates and repayment terms are
            determined solely by the financing provider.
          </Text>
        </View>

        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>Questions about this enquiry?</Text>
          <Text style={styles.helpText}>
            Contact SolarVy for clarification or supporting assessment details.
          </Text>
          <Text style={styles.helpContact}>info@solarvy.ng</Text>
        </View>

        <ReportFooter reference={record.reference} />
      </Page>
    </Document>
  );
}

export async function downloadFinancingEnquiryReport(
  payload: FinancingEnquiryReportPayload,
): Promise<void> {
  const blob = await pdf(
    <FinancingEnquiryDocument
      record={payload.record}
      applicantContact={payload.applicantContact}
      generatedDate={payload.generatedDate}
      logoSrc={payload.logoSrc}
    />,
  ).toBlob();

  const safeRef = String(payload.record.reference || payload.record.id).replace(
    /[^\w.-]+/g,
    "-",
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Solarvy-Financing-Enquiry-${safeRef}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
