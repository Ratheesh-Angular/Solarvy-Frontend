import {
  adminGetVisitorDetail,
  type AdminInstallerSnapshot,
  type AdminExpertReview,
  type AdminRequestIntro,
} from "./adminApi";

export type ResolvedLeadInstaller = {
  installerName: string;
  matchPct: number | null;
  snapshot: AdminInstallerSnapshot | null;
  inferred: boolean;
};

type ResolveArgs = {
  visitorId: string | null | undefined;
  leadCreatedAt: string;
  cta: "request_intro" | "expert_review";
  existingName?: string | null;
  existingSnapshot?: AdminInstallerSnapshot | null;
  existingMatchPct?: number | null;
  assessmentId?: number | null;
  /** Optional preloaded visitor detail to avoid repeat fetches. */
  visitorDetail?: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readMetaInstallerName(metadata: unknown): string {
  const meta = asRecord(metadata);
  if (!meta) return "";
  return String(meta.installerName ?? meta.installer_name ?? "").trim();
}

function readEventType(event: Record<string, unknown>): string {
  return String(event.eventType ?? event.event_type ?? "").trim();
}

function readCreatedAtMs(event: Record<string, unknown>): number {
  const raw = event.createdAt ?? event.created_at;
  if (!raw) return Number.NaN;
  return new Date(String(raw)).getTime();
}

function snapshotFromMatch(match: Record<string, unknown>): AdminInstallerSnapshot {
  const matchPctRaw = match.matchPct ?? match.match_pct;
  const matchPct =
    matchPctRaw != null && Number.isFinite(Number(matchPctRaw))
      ? Number(matchPctRaw)
      : null;
  const cardRaw = match.cardNumber ?? match.card_number;
  return {
    installerName:
      String(match.installerName ?? match.installer_name ?? "").trim() || null,
    cardNumber:
      cardRaw != null && Number.isFinite(Number(cardRaw))
        ? Number(cardRaw)
        : null,
    matchPct,
    matchTier: String(match.matchTier ?? match.match_tier ?? "").trim() || null,
    bestSuitedFor:
      String(match.bestSuitedFor ?? match.best_suited_for ?? "").trim() || null,
    coverage: String(match.coverage ?? "").trim() || null,
    strengths: String(match.strengths ?? "").trim() || null,
    pricing: String(match.pricing ?? "").trim() || null,
    response: String(match.response ?? "").trim() || null,
  };
}

function findMatchSnapshot(
  assessments: unknown[],
  installerName: string,
  preferredAssessmentId: number | null | undefined,
): AdminInstallerSnapshot | null {
  const wanted = installerName.trim().toLowerCase();
  if (!wanted) return null;

  const ordered = [...assessments];
  if (preferredAssessmentId != null) {
    ordered.sort((a, b) => {
      const aId = Number(asRecord(a)?.id);
      const bId = Number(asRecord(b)?.id);
      const aPref = aId === preferredAssessmentId ? 0 : 1;
      const bPref = bId === preferredAssessmentId ? 0 : 1;
      return aPref - bPref;
    });
  }

  for (const assessment of ordered) {
    const row = asRecord(assessment);
    if (!row) continue;
    const results = asRecord(row.results) || asRecord(row.result);
    const matches = results?.installerMatches ?? results?.installer_matches;
    if (!Array.isArray(matches)) continue;
    for (const match of matches) {
      const matchRow = asRecord(match);
      if (!matchRow) continue;
      const name = String(
        matchRow.installerName ?? matchRow.installer_name ?? "",
      )
        .trim()
        .toLowerCase();
      if (name === wanted) return snapshotFromMatch(matchRow);
    }
  }
  return null;
}

function resolveFromVisitorDetail(
  detail: Record<string, unknown>,
  args: ResolveArgs,
): ResolvedLeadInstaller | null {
  const timeline = Array.isArray(detail.timeline)
    ? (detail.timeline as Record<string, unknown>[])
    : [];
  const leadMs = new Date(args.leadCreatedAt).getTime();

  const withName = timeline
    .map((event) => {
      const meta = asRecord(event.metadata) || {};
      const name = readMetaInstallerName(meta);
      if (!name) return null;
      const cta = String(meta.cta ?? "").trim();
      return {
        event,
        name,
        cta,
        createdMs: readCreatedAtMs(event),
        eventType: readEventType(event),
      };
    })
    .filter(Boolean) as Array<{
    event: Record<string, unknown>;
    name: string;
    cta: string;
    createdMs: number;
    eventType: string;
  }>;

  const scored = withName
    .map((item) => {
      let score = 0;
      if (item.eventType === "cta_click") score += 10;
      if (item.cta === args.cta) score += 40;
      if (Number.isFinite(item.createdMs) && Number.isFinite(leadMs)) {
        const delta = Math.abs(item.createdMs - leadMs);
        if (delta <= 30 * 60 * 1000) score += 30;
        else if (delta <= 24 * 60 * 60 * 1000) score += 15;
        if (item.createdMs <= leadMs + 60_000) score += 10;
        score -= Math.min(20, delta / (60 * 60 * 1000));
      }
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best?.name) return null;

  const assessments = Array.isArray(detail.assessments)
    ? detail.assessments
    : [];
  const snapshot = findMatchSnapshot(
    assessments,
    best.name,
    args.assessmentId,
  );

  return {
    installerName: best.name,
    matchPct: snapshot?.matchPct ?? null,
    snapshot,
    inferred: true,
  };
}

/**
 * Use persisted installer when present; otherwise recover from visitor CTA
 * activity (and enrich from assessment matches when possible).
 */
export async function resolveLeadInstaller(
  args: ResolveArgs,
): Promise<ResolvedLeadInstaller | null> {
  const existingName = String(args.existingName ?? "").trim();
  if (existingName) {
    return {
      installerName: existingName,
      matchPct: args.existingMatchPct ?? args.existingSnapshot?.matchPct ?? null,
      snapshot: args.existingSnapshot ?? null,
      inferred: false,
    };
  }

  if (args.visitorDetail) {
    return resolveFromVisitorDetail(args.visitorDetail, args);
  }

  if (!args.visitorId) return null;

  try {
    const detail = (await adminGetVisitorDetail(
      args.visitorId,
    )) as Record<string, unknown>;
    return resolveFromVisitorDetail(detail, args);
  } catch {
    return null;
  }
}

type LeadLike = AdminRequestIntro | AdminExpertReview;

/**
 * Fill missing installerName on list rows by recovering from visitor activity.
 * Visitor detail requests are cached per visitorId for the batch.
 */
export async function enrichLeadsWithInstallers<T extends LeadLike>(
  items: T[],
  cta: "request_intro" | "expert_review",
): Promise<T[]> {
  if (!items.length) return items;

  const detailCache = new Map<string, Promise<Record<string, unknown> | null>>();

  const loadDetail = (visitorId: string) => {
    const existing = detailCache.get(visitorId);
    if (existing) return existing;
    const promise = adminGetVisitorDetail(visitorId)
      .then((detail) => detail as Record<string, unknown>)
      .catch(() => null);
    detailCache.set(visitorId, promise);
    return promise;
  };

  return Promise.all(
    items.map(async (item) => {
      if (String(item.installerName ?? "").trim()) return item;
      if (!item.visitorId) return item;

      const detail = await loadDetail(item.visitorId);
      if (!detail) return item;

      const resolved = await resolveLeadInstaller({
        visitorId: item.visitorId,
        leadCreatedAt: item.createdAt,
        cta,
        existingName: item.installerName,
        existingSnapshot: item.installerSnapshot,
        existingMatchPct: item.matchPct,
        assessmentId: item.assessmentId,
        visitorDetail: detail,
      });

      if (!resolved) return item;
      return {
        ...item,
        installerName: resolved.installerName,
        matchPct: resolved.matchPct ?? item.matchPct,
        installerSnapshot: resolved.snapshot ?? item.installerSnapshot,
      };
    }),
  );
}
