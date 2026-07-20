import React, { useState, useMemo, useCallback, useEffect } from "react";

/* ============================================================================
   ADAPTIVE RECOVERABILITY SYSTEMS — Commercial Assessment Platform (v1)
   ============================================================================

   ARCHITECTURE NOTE (read before modifying):

   This is "V1 on a V3 foundation." The internal data model — EvidenceObject,
   EvidenceCategory, IndustryTemplate — is designed to survive into later
   versions where custom evidence fields, a template library, and partner
   extensions are added. V1 deliberately exposes only ONE fixed industry
   template (Banking) with no schema editor, no custom fields, and no
   internal terminology anywhere in the UI.

   The client never sees: CII, PCM, WDS, Zombie Sentinel, or any other
   internal ARG construct name. The client only ever sees:

       Evidence  →  Assessment Complete  →  Insights  →  Recommendations

   Everything between evidence and insights is the proprietary engine.
   This build calls the live Banking V1 ARG engine directly via
   fetchAdaptiveRecoverabilityAssessment() — there is no local placeholder
   scoring logic left in this file. See ARG_API_BASE_URL below for the
   endpoint, and the integration report for the confirmed response
   contract this file depends on.
   ============================================================================ */

const COLORS = {
  bgDeep: "#0A1628",
  bgPanel: "#0F2347",
  bgPanelAlt: "#122A52",
  border: "#1E3A66",
  gold: "#D4AF37",
  goldSoft: "#C9A961",
  silver: "#E8E3D5",
  silverDim: "#9FB0C9",
  green: "#3FA76B",
  amber: "#D8A23B",
  red: "#C24545",
};

/* ----------------------------------------------------------------------
   EVIDENCE SCHEMA
   Every input the client sees is an EvidenceObject. None of these labels,
   help texts, or groupings reveal internal scoring dimensions. Metadata
   is stored for future use (confidence weighting, verification workflows,
   industry filtering) but is never rendered to the client in V1.
   ---------------------------------------------------------------------- */

function evidenceObject(opts) {
  return {
    id: opts.id,
    label: opts.label,
    inputType: opts.inputType, // 'number' | 'percentage' | 'years' | 'boolean' | 'select' | 'currency_range'
    unit: opts.unit || null,
    options: opts.options || null,
    helpText: opts.helpText || "",
    sourceHint: opts.sourceHint || "",
    metadata: {
      domain: opts.domain,
      evidenceType: opts.evidenceType,
      confidence: opts.confidence || "standard",
      verificationSource: opts.verificationSource || null,
      applicableIndustries: opts.applicableIndustries || ["banking"],
    },
  };
}

const BANKING_TEMPLATE = {
  id: "banking",
  label: "Banking & Deposit-Taking Institutions",
  description:
    "Evidence categories calibrated for retail and commercial banks, credit unions, and deposit-taking institutions.",
  categories: [
    {
      id: "organisation",
      label: "Organisation Profile",
      description: "Optional organisational context for the assessment session. These fields do not currently affect the Banking V1 calculation.",
      evidence: [
        evidenceObject({
          id: "org_total_assets",
          label: "Total assets under management",
          inputType: "currency_range",
          options: ["Under $1B", "$1B–$10B", "$10B–$50B", "$50B–$250B", "Over $250B"],
          domain: "profile",
          evidenceType: "scale",
        }),
        evidenceObject({
          id: "org_years_operating",
          label: "Years in operation",
          inputType: "number",
          unit: "years",
          domain: "profile",
          evidenceType: "scale",
        }),
        evidenceObject({
          id: "org_jurisdictions",
          label: "Number of regulatory jurisdictions operated in",
          inputType: "number",
          domain: "profile",
          evidenceType: "scale",
        }),
      ],
    },
    {
      id: "governance",
      label: "Governance",
      description: "Board structure, oversight, and audit arrangements.",
      evidence: [
        evidenceObject({
          id: "gov_board_meetings",
          label: "Board meetings held in the last 12 months",
          inputType: "number",
          helpText: "Include all scheduled and ad-hoc full board meetings.",
          sourceHint: "Annual report or corporate governance statement.",
          domain: "governance",
          evidenceType: "frequency",
          verificationSource: "Annual Report",
        }),
        evidenceObject({
          id: "gov_independent_directors_pct",
          label: "Proportion of board that is independent",
          inputType: "percentage",
          sourceHint: "Annual report or corporate governance disclosure.",
          domain: "governance",
          evidenceType: "composition",
          verificationSource: "Annual Report",
        }),
        evidenceObject({
          id: "gov_auditor_tenure",
          label: "Years the current external auditor has held the engagement",
          inputType: "years",
          domain: "governance",
          evidenceType: "tenure",
          verificationSource: "Audit Report",
        }),
        evidenceObject({
          id: "gov_internal_audit_independence",
          label: "Does internal audit report directly to the board or audit committee, independent of executive management?",
          inputType: "boolean",
          domain: "governance",
          evidenceType: "structure",
        }),
        evidenceObject({
          id: "gov_executive_turnover_pct",
          label: "Executive committee turnover in the last 24 months",
          inputType: "percentage",
          domain: "governance",
          evidenceType: "stability",
        }),
        evidenceObject({
          id: "gov_enforcement_actions",
          label: "Formal regulatory enforcement actions in the last 5 years",
          inputType: "number",
          domain: "governance",
          evidenceType: "regulatory_history",
        }),
        evidenceObject({
          id: "gov_independent_director_tenure",
          label: "Average tenure of independent directors",
          inputType: "years",
          helpText: "Very long average tenure can reduce independence even where formal status remains 'independent.'",
          domain: "governance",
          evidenceType: "tenure",
        }),
        evidenceObject({
          id: "gov_audit_finding_closure_days",
          label: "Average time to close internal audit findings",
          inputType: "number",
          unit: "days",
          helpText: "From the date a finding is raised to the date it is formally closed out.",
          domain: "governance",
          evidenceType: "process_speed",
        }),
      ],
    },
    {
      id: "financial",
      label: "Financial Structure",
      description: "Capital, liquidity, and funding composition.",
      evidence: [
        evidenceObject({
          id: "fin_cet1_ratio",
          label: "CET1 capital ratio",
          inputType: "percentage",
          sourceHint: "Pillar 3 disclosure or latest regulatory return.",
          domain: "financial",
          evidenceType: "capital",
          verificationSource: "Pillar 3 Disclosure",
        }),
        evidenceObject({
          id: "fin_liquidity_coverage_ratio",
          label: "Liquidity coverage ratio",
          inputType: "percentage",
          domain: "financial",
          evidenceType: "liquidity",
        }),
        evidenceObject({
          id: "fin_top10_deposit_concentration",
          label: "Proportion of deposits held by the 10 largest depositors",
          inputType: "percentage",
          domain: "financial",
          evidenceType: "concentration",
        }),
        evidenceObject({
          id: "fin_funding_sources",
          label: "Number of distinct funding sources (retail deposits, wholesale, interbank, securitisation, etc.)",
          inputType: "number",
          domain: "financial",
          evidenceType: "diversification",
        }),
        evidenceObject({
          id: "fin_unrealised_losses_pct_capital",
          label: "Unrealised securities losses as a proportion of capital",
          inputType: "percentage",
          domain: "financial",
          evidenceType: "exposure",
        }),
        evidenceObject({
          id: "fin_uninsured_deposits_pct",
          label: "Uninsured deposits as a percentage of total deposits",
          inputType: "percentage",
          domain: "financial",
          evidenceType: "deposit_sensitivity",
          helpText: "Deposits above the insured limit are more exposed to rapid, confidence-driven withdrawal.",
        }),
        evidenceObject({
          id: "fin_funding_replacement_30d_pct",
          label: "Percentage of funding that could realistically be replaced within 30 days under stressed market conditions",
          inputType: "percentage",
          domain: "financial",
          evidenceType: "replacement_capacity",
        }),
      ],
    },
    {
      id: "operations",
      label: "Operations",
      description: "Resilience of day-to-day operating capability.",
      evidence: [
        evidenceObject({
          id: "ops_system_availability",
          label: "Critical system availability over the last 12 months",
          inputType: "percentage",
          domain: "operations",
          evidenceType: "reliability",
        }),
        evidenceObject({
          id: "ops_dr_test_frequency",
          label: "Disaster recovery tests conducted in the last 12 months",
          inputType: "number",
          domain: "operations",
          evidenceType: "preparedness",
        }),
        evidenceObject({
          id: "ops_staff_turnover_pct",
          label: "Staff turnover in the last 12 months",
          inputType: "percentage",
          domain: "operations",
          evidenceType: "stability",
        }),
        evidenceObject({
          id: "ops_top_supplier_concentration",
          label: "Proportion of critical operational spend with the single largest supplier",
          inputType: "percentage",
          domain: "operations",
          evidenceType: "concentration",
        }),
        evidenceObject({
          id: "ops_incident_response_test",
          label: "Has a major incident response exercise been conducted in the last 12 months?",
          inputType: "boolean",
          domain: "operations",
          evidenceType: "preparedness",
        }),
        evidenceObject({
          id: "ops_documented_recovery_plans_pct",
          label: "Proportion of critical processes with a documented recovery plan",
          inputType: "percentage",
          helpText: "A plan existing is distinct from it having been tested — this measures coverage, not testing frequency.",
          domain: "operations",
          evidenceType: "preparedness",
        }),
        evidenceObject({
          id: "ops_single_points_of_dependency",
          label: "Single points of operational dependency identified in the most recent review",
          inputType: "number",
          helpText: "A single point of dependency is a process, system, supplier, or individual whose failure would halt a critical function with no fallback.",
          domain: "operations",
          evidenceType: "concentration",
        }),
      ],
    },
    {
      id: "adaptive",
      label: "Adaptive Indicators",
      description:
        "How quickly the organisation notices and responds to emerging issues — a forward-looking complement to the historical facts above.",
      evidence: [
        evidenceObject({
          id: "adapt_control_review_frequency",
          label: "How often are key risk controls formally reviewed?",
          inputType: "select",
          options: ["Continuously", "Monthly", "Quarterly", "Annually", "Less than annually"],
          domain: "adaptive",
          evidenceType: "process_speed",
        }),
        evidenceObject({
          id: "adapt_corrective_action_days",
          label: "Typical time to implement a corrective action after an issue is identified",
          inputType: "number",
          unit: "days",
          helpText: "Median time across issues raised in the last 12 months, not the best case.",
          domain: "adaptive",
          evidenceType: "process_speed",
        }),
        evidenceObject({
          id: "adapt_policy_update_frequency",
          label: "Significant policy or procedure updates made in the last 12 months",
          inputType: "number",
          helpText: "Updates made in response to identified issues, not routine scheduled reviews.",
          domain: "adaptive",
          evidenceType: "process_speed",
        }),
        evidenceObject({
          id: "adapt_escalation_path_tested",
          label: "Has the formal escalation path for emerging risks been tested or exercised in the last 12 months?",
          inputType: "boolean",
          domain: "adaptive",
          evidenceType: "preparedness",
        }),
      ],
    },
    {
      id: "external",
      label: "External Dependencies",
      description: "Exposure to factors outside direct organisational control.",
      evidence: [
        evidenceObject({
          id: "ext_rating_agency_count",
          label: "Number of credit rating agencies providing active coverage",
          inputType: "number",
          domain: "external",
          evidenceType: "coverage",
        }),
        evidenceObject({
          id: "ext_revenue_concentration_top3",
          label: "Proportion of revenue from the 3 largest counterparties or business lines",
          inputType: "percentage",
          domain: "external",
          evidenceType: "concentration",
        }),
        evidenceObject({
          id: "ext_independent_research_coverage",
          label: "Is the institution covered by independent equity or credit research, separate from underwriters?",
          inputType: "boolean",
          domain: "external",
          evidenceType: "transparency",
        }),
      ],
    },
  ],
};

const TEMPLATES = [BANKING_TEMPLATE];

/* ----------------------------------------------------------------------
   LIVE ARG ENGINE INTEGRATION
   Calls the deployed Banking V1 ARG API. Only fields the engine currently
   scores (governance + financial) are sent — operations/adaptive/external
   fields are collected in the UI for future use but withheld from the API
   call until those domains are live server-side, per the phased rollout plan.
   ---------------------------------------------------------------------- */

// Live Railway production endpoint. Update if the API is ever redeployed
// under a different URL.
const ARG_API_BASE_URL = "https://adaptive-recoverability-banking-api-production.up.railway.app";

// Fields the API currently scores. Keep this in sync with the engine —
// this is intentionally explicit rather than "send everything and hope"
// so an evidence field never silently reaches the API before its domain
// logic is actually built.
const API_SUPPORTED_FIELDS = new Set([
  "gov_board_meetings",
  "gov_internal_audit_independence",
  "gov_independent_directors_pct",
  "gov_auditor_tenure",
  "gov_executive_turnover_pct",
  "gov_enforcement_actions",
  "gov_independent_director_tenure",
  "gov_audit_finding_closure_days",
  "fin_cet1_ratio",
  "fin_liquidity_coverage_ratio",
  "fin_top10_deposit_concentration",
  "fin_funding_sources",
  "fin_unrealised_losses_pct_capital",
  "fin_uninsured_deposits_pct",
  "fin_funding_replacement_30d_pct",
]);

// Lookup for evidence field definitions by id, used to normalize values
// before they're sent to the API — the browser stores all input values as
// strings, but the API expects actual JSON numbers for number/percentage/
// years fields (confirmed against Swagger, which used real JSON numbers).
const EVIDENCE_BY_ID = new Map(
  BANKING_TEMPLATE.categories
    .flatMap((category) => category.evidence)
    .map((evidence) => [evidence.id, evidence])
);

function normaliseEvidenceValue(id, value) {
  const definition = EVIDENCE_BY_ID.get(id);
  if (!definition) return value;

  if (
    definition.inputType === "number" ||
    definition.inputType === "percentage" ||
    definition.inputType === "years"
  ) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return null;
    return numericValue;
  }

  return value;
}

function buildEvidencePayload(responses) {
  return Object.entries(responses)
    .filter(([id, val]) => API_SUPPORTED_FIELDS.has(id) && val !== UNKNOWN_VALUE && val !== undefined && val !== "")
    .map(([id, value]) => ({ id, value: normaliseEvidenceValue(id, value) }))
    .filter((item) => item.value !== null);
}

// Calls the live ARG engine. Throws on network failure or non-200 so the
// caller can show a real error state rather than silently falling back
// to illustrative data.
async function fetchAdaptiveRecoverabilityAssessment(template, responses, environment) {
  const body = {
    template: template.id || "banking",
    evidence: buildEvidencePayload(responses),
  };
  if (environment) body.environment = environment;

  const res = await fetch(`${ARG_API_BASE_URL}/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ARG engine returned ${res.status}: ${detail || "no further detail"}`);
  }

  return res.json();
}

// Adapts the API's rich reasoning-chain response into the flat shape
// ExecutiveDashboard currently expects, so the dashboard can go live
// before it's upgraded to render intervention_paths natively.
// ⚠ This is a bridge, not the destination — see the accompanying report
// Backend's `name` field collapses to the same string for mechanisms that
// share a mechanism type but have different triggers (e.g. buffer_reduction
// fires for both "capital" and "liquidity", both labeled "Resilience
// Buffers" by the API) — which caused the same label to appear under both
// Top Strengths and Top Vulnerabilities when one trigger was positive and
// the other negative. This disambiguates by trigger only where needed;
// everything else falls through to the backend's own name unchanged.
const sectionLabelStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 10.5,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: COLORS.goldSoft,
  fontWeight: 600,
  marginBottom: 3,
};

const sectionTextStyle = {
  fontSize: 13.5,
  color: COLORS.silverDim,
  lineHeight: 1.5,
};

function getConstraintLabel(c) {
  if (c.mechanism === "buffer_reduction") {
    if (c.trigger === "capital") return "Capital Resilience";
    if (c.trigger === "liquidity") return "Liquidity Resilience";
    return "Resilience Buffers";
  }
  if (c.mechanism === "decision_quality") {
    if (c.trigger === "oversight") return "Board Oversight";
    return c.name || "Decision Quality";
  }
  if (c.mechanism === "signal_quality") {
    if (c.trigger === "independence") return "Independent Assurance";
    return c.name || "Signal Quality";
  }
  if (c.mechanism === "decoupling") {
    if (c.trigger === "concentration") return "Depositor Concentration";
    return c.name || "Dependency Concentration";
  }
  if (c.mechanism === "optionality_preservation") {
    if (c.trigger === "funding") return "Funding Diversity";
    return c.name || "Strategic Optionality";
  }
  if (c.mechanism === "response_speed") {
    if (c.trigger === "remediation") return "Remediation Capacity";
    if (c.trigger === "governance_interaction") return "Governance Interaction";
    return c.name || "Response Speed";
  }
  return c.name || c.mechanism || "Structural factor";
}

// for the plan to render structural_mechanism_assessment/intervention_paths directly.
function mapApiResponseToDashboardResult(apiResponse) {
  // Confirmed Banking V1 contract (locked with the API-side model):
  //   score            → processing.overall_score
  //   classification   → processing.classification   (authoritative — no frontend reclassification)
  //   confidence       → processing.adaptive_recoverability.confidence   (0–100 scale)
  //   executive summary→ processing.executive_summary
  //   structural mechanism assessment → processing.adaptive_recoverability.structural_mechanism_assessment
  //   intervention paths   → processing.intervention_paths

  // Validate the shape we depend on before reading anything from it. A
  // missing/changed response should surface a clear error, not a React
  // crash or a fabricated fallback result.
  const proc = apiResponse?.processing;
  if (!proc) {
    throw new Error(
      "The assessment engine returned an invalid response: processing data was missing."
    );
  }
  const ar = proc.adaptive_recoverability || {};

  const rawScore = Number(proc.overall_score);
  const score = Number.isFinite(rawScore) ? Math.round(rawScore) : 0;

  // Classification is the backend's authority. The dashboard does not run
  // its own score-threshold logic — that was the exact "silent semantic
  // drift" this integration was frozen to prevent.
  const status = proc.classification;
  // Explicit mapping from confirmed top-level processing.classification
  // values (not the adaptive_state.recoverability_state labels, which are
  // a different field — "Reduced Recoverability" / "Healthy Recoverability"
  // never actually appear here).
  const CLASSIFICATION_COLORS = {
    "Highly Recoverable": COLORS.green,
    "Recoverable": COLORS.green,
    "Constrained Recoverability": COLORS.amber,
    "Low Recoverability": COLORS.red,
  };
  const statusColor = CLASSIFICATION_COLORS[status] || COLORS.silverDim;

  // Confidence shown as the raw figure, no categorical band. The backend
  // hasn't formally defined confidence bands, and two rounds of proposed
  // frontend thresholds (90, then 85) were both unverified guesses — safer
  // to show the number and let the client read it directly. Guarded against
  // non-numeric values and rounded to one decimal rather than displaying
  // long floating-point tails.
  const confidenceRaw = Number(ar.confidence);
  const confidenceValue = Number.isFinite(confidenceRaw)
    ? Math.round(confidenceRaw * 10) / 10
    : null;
  const confidence = confidenceValue === null ? "Not available" : `${confidenceValue}%`;

  const executiveSummary = proc.executive_summary ?? null;

  // domainScores kept 0–1 for compatibility with the existing stress-test view.
  // Read dynamically — Banking V1 currently only returns governance and
  // financial; operations/adaptive/external should not be assumed present.
  const domainScores = {};
  Object.entries(proc.domains || {}).forEach(([domain, d]) => {
    domainScores[domain] = (d?.score ?? 0) / 100;
  });

  // Backend field renamed from dominant_constraints to
  // structural_mechanism_assessment (final pre-freeze schema adjustment) —
  // the array now includes healthy/neutral mechanisms alongside
  // constraints, not just negatively-directed ones, so the old name was
  // misleading. Fallback to the legacy name kept temporarily; remove once
  // the renamed field is confirmed deployed on Railway.
  // Order preserved as returned (filter, not sort) — backend sorts
  // descending by structural_priority; severity is a separate, independent
  // axis (current impairment) and must not be used to reorder this array.
  const structuralMechanismAssessment =
    (Array.isArray(ar.structural_mechanism_assessment) && ar.structural_mechanism_assessment) ||
    (Array.isArray(ar.dominant_constraints) && ar.dominant_constraints) ||
    [];
  // Not yet rendered anywhere in the commercial UI (kept for a future
  // analyst/detail view, same as before the rename). When it is rendered:
  // a mechanism with severity: "none" must not be visually presented as a
  // vulnerability or active constraint — severity now describes only
  // current impairment, not systemic importance, so "none" severity items
  // are healthy mechanisms that happen to be in this array, not omissions.

  // ---- dashboard_summary integration ----
  // CONFIRMED against an actual raw Swagger response (2026-07-18, local
  // backend) — processing.dashboard_summary is real, with top_strengths,
  // top_vulnerabilities, priority_recommendations, strength_details,
  // vulnerability_details, and recommendation_details all present exactly
  // as previously described. This is now treated as authoritative, not
  // optional. No fallback to structural_mechanism_assessment-derived labels for the
  // three summary arrays — a soft fallback here would silently reproduce
  // the exact broken output (empty strengths, duplicate generic labels)
  // if a deployment is ever running a stale backend build, which is worse
  // than a loud, diagnosable failure for a commercial assessment tool.
  const dashboardSummary = proc.dashboard_summary;

  if (!dashboardSummary || typeof dashboardSummary !== "object") {
    throw new Error(
      "The assessment engine response did not include processing.dashboard_summary. Confirm that the deployed backend is running the current engine version."
    );
  }
  if (
    !Array.isArray(dashboardSummary.top_strengths) ||
    !Array.isArray(dashboardSummary.top_vulnerabilities) ||
    !Array.isArray(dashboardSummary.priority_recommendations)
  ) {
    throw new Error("The assessment engine returned an incomplete dashboard_summary.");
  }

  const strengths = dashboardSummary.top_strengths;
  const vulnerabilities = dashboardSummary.top_vulnerabilities;

  // The three *_details arrays are richer than the summary arrays but
  // aren't strictly required above — a summary-only response is still
  // valid, just renders as simple label lists rather than detail cards.
  const strengthDetails = Array.isArray(dashboardSummary.strength_details) ? dashboardSummary.strength_details : [];
  const vulnerabilityDetails = Array.isArray(dashboardSummary.vulnerability_details)
    ? dashboardSummary.vulnerability_details
    : [];
  const recommendationDetails = Array.isArray(dashboardSummary.recommendation_details)
    ? dashboardSummary.recommendation_details
    : [];

  // Raw intervention path objects retained rather than flattened to a single
  // string — structural_observation, adaptive_objective, pathway_categories,
  // and advisory_scope are each rendered as their own section in the
  // dashboard rather than being collapsed into one line.
  const interventionPaths = Array.isArray(proc.intervention_paths) ? proc.intervention_paths : [];

  // dashboard_summary.priority_recommendations is guaranteed present at
  // this point — the earlier validation throws if it's missing, so this
  // no longer needs a fallback branch.
  const recommendations = dashboardSummary.priority_recommendations;

  // Confirmed against every real Swagger response seen in this build:
  // adaptive_state is nested under adaptive_recoverability, not directly
  // under processing. (Corrected — the previous version read
  // proc.adaptive_state, which would always have been undefined.)
  const adaptiveState = ar.adaptive_state || null;
  const environment = proc.environment || apiResponse.environment || null;

  return {
    score,
    rawScore: Number.isFinite(rawScore) ? rawScore : null,
    status,
    statusColor,
    confidence,
    confidenceValue,
    // Deliberately not color-coded against a threshold — no backend-defined
    // confidence bands exist yet, so the figure is shown neutrally rather
    // than implying a judgment the engine hasn't made.
    confidenceColor: COLORS.silverDim,
    executiveSummary,
    strengths,
    vulnerabilities,
    recommendations,
    strengthDetails,
    vulnerabilityDetails,
    recommendationDetails,
    structuralMechanismAssessment,
    interventionPaths,
    domainScores,
    adaptiveState,
    environment,
    // Full raw response retained so nothing is thrown away even when a
    // field isn't yet surfaced in the commercial UI (e.g. propagation,
    // loop_analysis, and other analyst-level internals stay here rather
    // than being displayed by default).
    _raw: apiResponse,
  };
}

// Derives a "live" version of a template that only includes categories/fields
// the API currently scores. The full template (all 5 domains, 26 fields) stays
// intact in code for when operations/adaptive/external are activated — this
// just prevents the live portal from collecting evidence that has no effect
// on the frozen Banking V1 result, per the agreed integration boundary.
function deriveLiveTemplate(fullTemplate) {
  const liveCategories = fullTemplate.categories
    .map((cat) => {
      // Organisation Profile is contextual only — it doesn't feed the
      // frozen Banking V1 calculation, but per the agreed portal scope it
      // may stay visible for context rather than being hidden like the
      // unsupported scoring domains.
      if (cat.id === "organisation") return cat;
      return {
        ...cat,
        evidence: cat.evidence.filter((f) => API_SUPPORTED_FIELDS.has(f.id)),
      };
    })
    .filter((cat) => cat.id === "organisation" || cat.evidence.length > 0);

  return { ...fullTemplate, categories: liveCategories };
}

/* ----------------------------------------------------------------------
   INPUT COMPONENTS
   ---------------------------------------------------------------------- */

const UNKNOWN_VALUE = "__unknown__";

function FieldShell({ children, label, helpText, sourceHint, isUnknown, onToggleUnknown }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <label
          style={{
            display: "block",
            fontSize: 14.5,
            color: COLORS.silver,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            marginBottom: 6,
          }}
        >
          {label}
        </label>
        <button
          type="button"
          onClick={onToggleUnknown}
          style={{
            background: "none",
            border: "none",
            color: isUnknown ? COLORS.gold : COLORS.silverDim,
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            cursor: "pointer",
            whiteSpace: "nowrap",
            textDecoration: isUnknown ? "none" : "underline",
            opacity: isUnknown ? 1 : 0.7,
            flexShrink: 0,
          }}
        >
          {isUnknown ? "✓ Marked unknown" : "Don't know / not available"}
        </button>
      </div>
      {helpText && (
        <div style={{ fontSize: 12.5, color: COLORS.silverDim, marginBottom: 10, lineHeight: 1.5 }}>
          {helpText}
        </div>
      )}
      {isUnknown ? (
        <div
          style={{
            padding: "13px 14px",
            border: `1px dashed ${COLORS.border}`,
            borderRadius: 8,
            color: COLORS.silverDim,
            fontSize: 13.5,
            fontStyle: "italic",
          }}
        >
          Marked as unknown — the assessment will proceed without this evidence.
        </div>
      ) : (
        children
      )}
      {sourceHint && !isUnknown && (
        <div
          style={{
            fontSize: 11.5,
            color: COLORS.goldSoft,
            marginTop: 6,
            fontStyle: "italic",
          }}
        >
          Typically found in: {sourceHint}
        </div>
      )}
    </div>
  );
}

const inputBaseStyle = {
  width: "100%",
  background: COLORS.bgPanelAlt,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  color: COLORS.silver,
  padding: "12px 14px",
  fontSize: 15,
  fontFamily: "'Inter', sans-serif",
  outline: "none",
  boxSizing: "border-box",
};

function EvidenceInput({ evidence, value, onChange }) {
  const { inputType, unit, options } = evidence;

  if (inputType === "boolean") {
    return (
      <div style={{ display: "flex", gap: 10 }}>
        {["Yes", "No"].map((opt) => {
          const boolVal = opt === "Yes";
          const selected = value === boolVal;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(boolVal)}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 8,
                border: `1px solid ${selected ? COLORS.gold : COLORS.border}`,
                background: selected ? "rgba(212,175,55,0.12)" : COLORS.bgPanelAlt,
                color: selected ? COLORS.gold : COLORS.silverDim,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (inputType === "currency_range" || inputType === "select") {
    return (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputBaseStyle, cursor: "pointer" }}
      >
        <option value="" disabled>
          {inputType === "select" ? "Select an option" : "Select a range"}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputBaseStyle, paddingRight: unit || inputType === "percentage" ? 48 : 14 }}
        placeholder="0"
      />
      {(unit || inputType === "percentage" || inputType === "years") && (
        <span
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: COLORS.silverDim,
            fontSize: 13,
            fontFamily: "'Inter', sans-serif",
            pointerEvents: "none",
          }}
        >
          {inputType === "percentage" ? "%" : unit || (inputType === "years" ? "yrs" : "")}
        </span>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------
   PROGRESS RAIL
   ---------------------------------------------------------------------- */

function ProgressRail({ categories, currentIndex, onJump }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 36,
      }}
    >
      {categories.map((cat, i) => {
        const state = i < currentIndex ? "done" : i === currentIndex ? "active" : "pending";
        return (
          <button
            key={cat.id}
            onClick={() => i <= currentIndex && onJump(i)}
            disabled={i > currentIndex}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 999,
              border: `1px solid ${state === "active" ? COLORS.gold : COLORS.border}`,
              background: state === "active" ? "rgba(212,175,55,0.1)" : "transparent",
              color: state === "pending" ? COLORS.silverDim : state === "active" ? COLORS.gold : COLORS.silver,
              fontFamily: "'Inter', sans-serif",
              fontSize: 12.5,
              fontWeight: state === "active" ? 600 : 500,
              cursor: i <= currentIndex ? "pointer" : "default",
              opacity: state === "pending" ? 0.5 : 1,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: state === "done" ? COLORS.green : state === "active" ? COLORS.gold : COLORS.border,
              }}
            />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------------
   EXECUTIVE DASHBOARD (output — no internal terminology, ever)
   ---------------------------------------------------------------------- */

function ScoreDial({ score, color, size = 140 }) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.border} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${c * pct} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text
        x="50%"
        y="48%"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'JetBrains Mono', monospace"
        fontSize={size * 0.26}
        fontWeight="700"
        fill={COLORS.silver}
      >
        {score}
      </text>
      <text
        x="50%"
        y="68%"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Inter', sans-serif"
        fontSize={size * 0.075}
        fill={COLORS.silverDim}
        letterSpacing="0.05em"
      >
        OUT OF 100
      </text>
    </svg>
  );
}

/* ----------------------------------------------------------------------
   COMPARISON REFERENCE POINTS
   Illustrative reference scores for context only — not a re-assessment of
   any real, currently operating institution. The two historical entries
   reflect publicly reported outcomes and are presented as historical
   scenarios, consistent with the demonstration dashboard.
   ---------------------------------------------------------------------- */

const COMPARISON_REFERENCES = [
  {
    id: "strong_ref",
    label: "Tier-1 Commercial Bank (Illustrative)",
    note: "Fictional high-recoverability reference",
    score: 88,
    color: COLORS.green,
  },
  {
    id: "svb_ref",
    label: "Silicon Valley Bank",
    note: "Historical scenario — 2023",
    score: 41,
    color: COLORS.red,
  },
  {
    id: "wamu_ref",
    label: "Washington Mutual",
    note: "Historical scenario — 2008",
    score: 9,
    color: COLORS.red,
  },
];

function ComparisonView({ result, onBack }) {
  const allBars = [
    { id: "your_org", label: "This Assessment", score: result.score, color: result.statusColor, isYou: true },
    ...COMPARISON_REFERENCES,
  ].sort((a, b) => b.score - a.score);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 80px" }}>
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: COLORS.goldSoft,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          marginBottom: 10,
          textAlign: "center",
        }}
      >
        Comparative Context
      </div>
      <h1
        style={{
          textAlign: "center",
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: 24,
          color: COLORS.silver,
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        Where this result sits on the spectrum
      </h1>
      <p
        style={{
          textAlign: "center",
          color: COLORS.silverDim,
          fontSize: 13.5,
          lineHeight: 1.6,
          marginBottom: 44,
          maxWidth: 540,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        These reference points are illustrative — a fictional high-recoverability
        archetype, and two historical scenarios shown for context. They are not a
        re-assessment of any current institution.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {allBars.map((b) => (
          <div key={b.id}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 13.5,
                  color: b.isYou ? COLORS.gold : COLORS.silver,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: b.isYou ? 700 : 500,
                }}
              >
                {b.label}
                {b.isYou && " (current result)"}
              </span>
              <span
                style={{
                  fontSize: 13.5,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: COLORS.silver,
                }}
              >
                {b.score}
              </span>
            </div>
            <div style={{ height: 10, background: COLORS.border, borderRadius: 5, overflow: "hidden" }}>
              <div
                style={{
                  width: `${b.score}%`,
                  height: "100%",
                  background: b.color,
                  border: b.isYou ? `1px solid ${COLORS.gold}` : "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            {b.note && (
              <div style={{ fontSize: 11.5, color: COLORS.silverDim, marginTop: 4, fontStyle: "italic" }}>
                {b.note}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 48 }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            color: COLORS.silverDim,
            padding: "10px 22px",
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Back to assessment
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   SCENARIO STRESS TESTING
   Each scenario applies a different modifier per domain rather than a
   single uniform multiplier, so a Liquidity Stress scenario depresses
   Financial Structure sharply while leaving Governance largely intact,
   and an Operational Shock hits Operations hardest. The overall score
   is then re-aggregated using the same domain weights the engine uses,
   so this stays internally consistent with how the baseline score was
   computed. Per-domain modifiers are illustrative, calibrated so the
   blended severity roughly matches the headline figures used in the
   public demonstration dashboard's scenario gallery.
   ---------------------------------------------------------------------- */

/* ----------------------------------------------------------------------
   LIVE STRESS TEST
   Per the confirmed integration boundary with the API-side model: the
   frontend does not simulate scenario stress with local multipliers. Each
   scenario re-runs POST /calculate with a real `environment` value, and
   the backend's own result is shown as-is — no frontend scoring,
   classification, or reweighting. Score/percentage movement shown on each
   comparison card is pure display math computed from two already-final
   backend scores; it is never fed back into any calculation.

   STRESS_SCENARIOS is deliberately narrower than the full set of valid API
   environment keys. The frozen API accepts five ("normal", "governance_shift",
   "liquidity_shock", "cyber_attack", "crisis"), but only two are exposed in
   the portal so far — the other two (cyber_attack, crisis) are a later,
   deliberate portal-scope expansion once their backend profiles are
   confirmed against a real response, not an API limitation.
   ---------------------------------------------------------------------- */

// Scenarios compared against baseline. Both are fetched together when this
// view opens — a failure in one must never hide or destroy the other, or
// the baseline result (per the acceptance criteria this was built against).
const STRESS_SCENARIOS = [
  { id: "liquidity_shock", label: "Liquidity Shock" },
  { id: "governance_shift", label: "Governance Shift" },
];

// Pure display math — point/percentage change for the comparison card only.
// Never fed back into scoring, classification, or any other calculation;
// the backend's own numbers are what's displayed everywhere else.
function computeScoreMovement(baselineScore, stressedScore) {
  const pointChange = stressedScore - baselineScore;
  const reduction = baselineScore - stressedScore;
  const percentageReduction = baselineScore > 0 ? (reduction / baselineScore) * 100 : 0;
  const direction = pointChange < 0 ? "decline" : pointChange > 0 ? "improvement" : "unchanged";
  return { pointChange, reduction, percentageReduction, direction };
}

function StressScenarioCard({ label, baseline, scenarioResult, isLoading, error }) {
  if (isLoading) {
    return (
      <div style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "22px 24px", marginBottom: 24 }}>
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 16, color: COLORS.silver, marginBottom: 10 }}>{label}</div>
        <div style={{ color: COLORS.silverDim, fontSize: 13.5 }}>Calculating…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "22px 24px", marginBottom: 24 }}>
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 16, color: COLORS.silver, marginBottom: 10 }}>{label}</div>
        <div style={{ color: COLORS.red, fontSize: 13.5, lineHeight: 1.5 }}>
          {label} comparison is currently unavailable. The baseline assessment remains valid.
        </div>
      </div>
    );
  }

  if (!scenarioResult) return null;

  const { pointChange, percentageReduction, direction } = computeScoreMovement(baseline.score, scenarioResult.score);
  const changeColor = direction === "decline" ? COLORS.red : direction === "improvement" ? COLORS.green : COLORS.silverDim;
  const changeLabel =
    direction === "decline"
      ? `−${Math.abs(Math.round(pointChange * 10) / 10)} points (${Math.round(percentageReduction * 10) / 10}% reduction)`
      : direction === "improvement"
      ? `+${Math.round(pointChange * 10) / 10} points`
      : "No change";

  const summary =
    scenarioResult.executiveSummary && typeof scenarioResult.executiveSummary === "object"
      ? scenarioResult.executiveSummary.overall_assessment
      : typeof scenarioResult.executiveSummary === "string"
      ? scenarioResult.executiveSummary
      : null;

  return (
    <div style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "24px 26px", marginBottom: 24 }}>
      <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 16, color: COLORS.silver, marginBottom: 14 }}>{label}</div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: COLORS.silver }}>
          {baseline.score} → {scenarioResult.score}
        </span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: scenarioResult.statusColor }}>
          {scenarioResult.status}
        </span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: changeColor, marginBottom: 16 }}>
        {changeLabel}
      </div>

      {summary && (
        <div style={{ fontSize: 13.5, color: COLORS.silverDim, lineHeight: 1.55, marginBottom: 14 }}>{summary}</div>
      )}

      {scenarioResult.vulnerabilities.length > 0 && (
        <div style={{ marginBottom: scenarioResult.recommendations.length > 0 ? 10 : 0 }}>
          <div style={sectionLabelStyle}>Vulnerabilities under this scenario</div>
          <div style={{ fontSize: 13, color: COLORS.silverDim, lineHeight: 1.5 }}>
            {scenarioResult.vulnerabilities.join(" · ")}
          </div>
        </div>
      )}
    </div>
  );
}

function StressTestView({ result: baseline, template, responses, onBack }) {
  const [scenarioResults, setScenarioResults] = useState({});
  const [scenarioErrors, setScenarioErrors] = useState({});
  const [loadingScenarios, setLoadingScenarios] = useState({});
  const hasFetched = React.useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    // Both scenarios fetched together, independently — one failing must
    // not block or hide the other (Promise.allSettled, not Promise.all).
    STRESS_SCENARIOS.forEach(async (scenario) => {
      setLoadingScenarios((prev) => ({ ...prev, [scenario.id]: true }));
      try {
        const apiResponse = await fetchAdaptiveRecoverabilityAssessment(template, responses, scenario.id);
        setScenarioResults((prev) => ({ ...prev, [scenario.id]: mapApiResponseToDashboardResult(apiResponse) }));
      } catch (err) {
        setScenarioErrors((prev) => ({
          ...prev,
          [scenario.id]: err.message || "The assessment engine could not be reached.",
        }));
      } finally {
        setLoadingScenarios((prev) => ({ ...prev, [scenario.id]: false }));
      }
    });
  }, [template, responses]);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 80px" }}>
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: COLORS.goldSoft,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          marginBottom: 10,
          textAlign: "center",
        }}
      >
        Scenario Stress Test
      </div>
      <h1
        style={{
          textAlign: "center",
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: 24,
          color: COLORS.silver,
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        How this result moves under stress
      </h1>
      <p
        style={{
          textAlign: "center",
          color: COLORS.silverDim,
          fontSize: 13.5,
          lineHeight: 1.6,
          marginBottom: 12,
          maxWidth: 540,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        Each scenario below applies a different operating environment to the
        same submitted evidence and re-runs the assessment engine. Results
        are calculated live by the engine, not simulated — the evidence has
        not changed, only the environment it's assessed against.
      </p>
      <p
        style={{
          textAlign: "center",
          color: COLORS.silverDim,
          fontSize: 12,
          fontStyle: "italic",
          lineHeight: 1.6,
          marginBottom: 36,
          maxWidth: 540,
          marginLeft: "auto",
          marginRight: "auto",
          opacity: 0.8,
        }}
      >
        Baseline: {baseline.score} — {baseline.status}
      </p>

      {STRESS_SCENARIOS.map((scenario) => (
        <StressScenarioCard
          key={scenario.id}
          label={scenario.label}
          baseline={baseline}
          scenarioResult={scenarioResults[scenario.id]}
          isLoading={Boolean(loadingScenarios[scenario.id])}
          error={scenarioErrors[scenario.id]}
        />
      ))}

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            color: COLORS.silverDim,
            padding: "10px 22px",
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Back to assessment
        </button>
      </div>
    </div>
  );
}

function ExecutiveDashboard({ result, onRestart, template, responses }) {
  const [showComparison, setShowComparison] = useState(false);
  const [showStressTest, setShowStressTest] = useState(false);

  if (showComparison) {
    return <ComparisonView result={result} onBack={() => setShowComparison(false)} />;
  }

  if (showStressTest) {
    return (
      <StressTestView
        result={result}
        template={template}
        responses={responses}
        onBack={() => setShowStressTest(false)}
      />
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: COLORS.goldSoft,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          marginBottom: 10,
          textAlign: "center",
        }}
      >
        Assessment Complete
      </div>
      <h1
        style={{
          textAlign: "center",
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: 28,
          color: COLORS.silver,
          fontWeight: 600,
          marginBottom: 36,
        }}
      >
        Overall Adaptive Recoverability
      </h1>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <ScoreDial score={result.score} color={result.statusColor} />
      </div>
      <div
        style={{
          textAlign: "center",
          fontFamily: "'Inter', sans-serif",
          fontSize: 15,
          fontWeight: 600,
          color: result.statusColor,
          marginBottom: 10,
        }}
      >
        Status: {result.status}
      </div>
      <div
        style={{
          textAlign: "center",
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: result.confidenceColor,
          marginBottom: 10,
        }}
      >
        Confidence in this assessment: {result.confidence}
      </div>

      {result.adaptiveState && (
        <div
          style={{
            textAlign: "center",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            color: COLORS.silverDim,
            marginBottom: 48,
          }}
        >
          {/* Prefer the new field name; fall back to the legacy name during
              migration — both are currently populated with identical values
              per the API-side model's handover, but only one may exist in
              an older deployed backend. */}
          Adaptive Operating State:{" "}
          {result.adaptiveState.adaptive_operating_state || result.adaptiveState.recoverability_state || "—"}
        </div>
      )}

      {result.executiveSummary && (
        <div
          style={{
            background: COLORS.bgPanel,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: "26px 28px",
            marginBottom: 40,
          }}
        >
          <h3
            style={{
              margin: "0 0 16px",
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: 16,
              color: COLORS.silver,
            }}
          >
            Executive Summary
          </h3>
          {typeof result.executiveSummary === "string" ? (
            <p style={{ fontSize: 13.5, color: COLORS.silver, lineHeight: 1.6, margin: 0 }}>
              {result.executiveSummary}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                ["Overall assessment", result.executiveSummary.overall_assessment],
                ["Primary constraint", result.executiveSummary.primary_constraint],
                ["Secondary constraint", result.executiveSummary.secondary_constraint],
                ["Greatest structural strength", result.executiveSummary.greatest_structural_strength],
                ["Recommended focus", result.executiveSummary.recommended_focus],
                ["Overall priority", result.executiveSummary.overall_priority],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <div
                      style={{
                        fontSize: 10.5,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: COLORS.goldSoft,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 600,
                        marginBottom: 3,
                      }}
                    >
                      {label}
                    </div>
                    <div style={{ fontSize: 13.5, color: COLORS.silver, lineHeight: 1.55 }}>{value}</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: COLORS.bgPanel,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: "22px 22px",
          }}
        >
          <h3
            style={{
              margin: "0 0 14px",
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: 16,
              color: COLORS.green,
            }}
          >
            Top Strengths
          </h3>
          {result.strengths.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {result.strengths.map((s, i) => (
                <li key={`${s}-${i}`} style={{ color: COLORS.silverDim, fontSize: 13.5, marginBottom: 8, lineHeight: 1.5 }}>
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: COLORS.silverDim, fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
              No material structural strengths were identified in the returned priority set.
            </p>
          )}
        </div>

        <div
          style={{
            background: COLORS.bgPanel,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: "22px 22px",
          }}
        >
          <h3
            style={{
              margin: "0 0 14px",
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: 16,
              color: COLORS.amber,
            }}
          >
            Top Vulnerabilities
          </h3>
          {result.vulnerabilities.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {result.vulnerabilities.map((v, i) => (
                <li key={`${v}-${i}`} style={{ color: COLORS.silverDim, fontSize: 13.5, marginBottom: 8, lineHeight: 1.5 }}>
                  {v}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: COLORS.silverDim, fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
              No dominant vulnerabilities were identified in the returned priority set. This
              reflects the current priority set only, not a claim of zero risk.
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          background: COLORS.bgPanel,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: "24px 26px",
          marginBottom: 40,
        }}
      >
        <h3
          style={{
            margin: "0 0 16px",
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: 17,
            color: COLORS.silver,
          }}
        >
          Priority Recommendations
        </h3>
        {(() => {
          // Three-tier preference: rich recommendation_details cards (best),
          // then intervention_paths cards (has structural_observation but
          // not the priority_label/text pairing), then the guaranteed-
          // present plain recommendations list as a last resort — that
          // last one can never be empty once dashboard_summary validation
          // above has passed, so this never renders a true empty state
          // unless the backend genuinely returned zero recommendations.
          if (result.recommendationDetails.length > 0) {
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {result.recommendationDetails.map((r, i) => {
                  const title = getConstraintLabel({ mechanism: r.mechanism, trigger: r.trigger, name: r.label });
                  return (
                    <div
                      key={`${r.domain}-${r.mechanism}-${r.trigger}-${i}`}
                      style={{
                        borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`,
                        paddingTop: i === 0 ? 0 : 18,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          marginBottom: 8,
                          gap: 12,
                        }}
                      >
                        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.silver }}>
                          {title}
                        </div>
                        {r.priority_label && (
                          <div
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: 11,
                              color: COLORS.goldSoft,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.priority_label}
                          </div>
                        )}
                      </div>

                      {r.text && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={sectionLabelStyle}>Structural observation</div>
                          <div style={sectionTextStyle}>{r.text}</div>
                        </div>
                      )}

                      {r.adaptive_objective && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={sectionLabelStyle}>Adaptive objective</div>
                          <div style={sectionTextStyle}>{r.adaptive_objective}</div>
                        </div>
                      )}

                      {Array.isArray(r.pathway_categories) && r.pathway_categories.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={sectionLabelStyle}>Potential pathways</div>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {r.pathway_categories.map((pc) => (
                              <li key={pc} style={sectionTextStyle}>
                                {pc}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {r.advisory_scope && (
                        <div>
                          <div style={sectionLabelStyle}>Advisory scope</div>
                          <div style={{ ...sectionTextStyle, fontStyle: "italic", opacity: 0.85 }}>
                            {r.advisory_scope}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          if (result.interventionPaths.length > 0) {
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {result.interventionPaths.map((p, i) => {
                  const title =
                    p.mechanism_type || p.trigger
                      ? getConstraintLabel({ mechanism: p.mechanism_type, trigger: p.trigger, name: p.name })
                      : `Recommendation ${i + 1}`;
                  return (
                    <div
                      key={i}
                      style={{
                        borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}`,
                        paddingTop: i === 0 ? 0 : 18,
                      }}
                    >
                      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.silver, marginBottom: 8 }}>
                        {title}
                      </div>
                      {p.structural_observation && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={sectionLabelStyle}>Structural observation</div>
                          <div style={sectionTextStyle}>{p.structural_observation}</div>
                        </div>
                      )}
                      {p.adaptive_objective && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={sectionLabelStyle}>Adaptive objective</div>
                          <div style={sectionTextStyle}>{p.adaptive_objective}</div>
                        </div>
                      )}
                      {Array.isArray(p.pathway_categories) && p.pathway_categories.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={sectionLabelStyle}>Potential pathways</div>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {p.pathway_categories.map((pc) => (
                              <li key={pc} style={sectionTextStyle}>
                                {pc}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {p.advisory_scope && (
                        <div>
                          <div style={sectionLabelStyle}>Advisory scope</div>
                          <div style={{ ...sectionTextStyle, fontStyle: "italic", opacity: 0.85 }}>{p.advisory_scope}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          if (result.recommendations.length > 0) {
            return (
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {result.recommendations.map((r, i) => (
                  <li key={`${r}-${i}`} style={{ color: COLORS.silverDim, fontSize: 14, marginBottom: 8, lineHeight: 1.5 }}>
                    {r}
                  </li>
                ))}
              </ul>
            );
          }

          return (
            <p style={{ color: COLORS.silverDim, fontSize: 14, lineHeight: 1.5, margin: 0 }}>
              No priority recommendations were generated for this assessment.
            </p>
          );
        })()}
      </div>

      <div style={{ textAlign: "center" }}>
        {/* "Compare to reference systems" hidden for the first mock-client
            portal release: ComparisonView's historical figures (SVB: 41,
            WaMu: 9) are pre-Banking-V1 illustrative numbers that no longer
            match frozen calibration outputs (SVB calibrates at 58.1 under
            Banking V1). Re-enable once ComparisonView is updated with real
            calibration scenario outputs, clearly labeled as such. */}
        <button
          onClick={() => setShowStressTest(true)}
          style={{
            background: "transparent",
            border: `1px solid ${COLORS.gold}`,
            borderRadius: 8,
            color: COLORS.gold,
            padding: "10px 25px",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: 13.5,
            cursor: "pointer",
            marginBottom: 14,
            display: "block",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Run scenario stress test
        </button>
        <button
          onClick={onRestart}
          style={{
            background: "transparent",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            color: COLORS.silverDim,
            padding: "10px 22px",
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Start a new assessment
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   TEMPLATE SELECTOR
   ---------------------------------------------------------------------- */

function TemplateSelector({ onSelect }) {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: COLORS.goldSoft,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          marginBottom: 14,
        }}
      >
        New Assessment
      </div>
      <h1
        style={{
          fontFamily: "'Source Serif 4', Georgia, serif",
          fontSize: 30,
          color: COLORS.silver,
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        Select an organisation type
      </h1>
      <p style={{ color: COLORS.silverDim, fontSize: 14.5, lineHeight: 1.6, marginBottom: 36 }}>
        Each assessment is tailored to the evidence available for the relevant sector. Additional sectors are added over time.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            style={{
              textAlign: "left",
              padding: "20px 22px",
              borderRadius: 10,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.bgPanel,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: 17,
                color: COLORS.silver,
                marginBottom: 6,
              }}
            >
              {t.label}
            </div>
            <div style={{ fontSize: 13, color: COLORS.silverDim, lineHeight: 1.5 }}>{t.description}</div>
          </button>
        ))}
        <div
          style={{
            padding: "20px 22px",
            borderRadius: 10,
            border: `1px dashed ${COLORS.border}`,
            color: COLORS.silverDim,
            fontSize: 13,
            fontStyle: "italic",
          }}
        >
          Additional sectors (Insurance, Infrastructure, Healthcare, Manufacturing) are added as templates become available.
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   MAIN APP
   ---------------------------------------------------------------------- */

export default function ARGCommercialAssessment() {
  const [template, setTemplate] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [result, setResult] = useState(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentError, setAssessmentError] = useState(null);

  const handleChange = useCallback((id, value) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
  }, []);

  const isReviewStep = template && stepIndex === template.categories.length;

  const handleNext = () => {
    if (template && stepIndex < template.categories.length) {
      setStepIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const handleRunAssessment = async () => {
    setIsAssessing(true);
    setAssessmentError(null);
    try {
      const apiResponse = await fetchAdaptiveRecoverabilityAssessment(template, responses, "normal");
      setResult(mapApiResponseToDashboardResult(apiResponse));
    } catch (err) {
      setAssessmentError(err.message || "The assessment engine could not be reached.");
    } finally {
      setIsAssessing(false);
    }
  };

  const handleRestart = () => {
    setTemplate(null);
    setStepIndex(0);
    setResponses({});
    setResult(null);
    setAssessmentError(null);
  };

  if (!template) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bgDeep, fontFamily: "'Inter', sans-serif" }}>
        <TemplateSelector onSelect={(t) => setTemplate(deriveLiveTemplate(t))} />
      </div>
    );
  }

  if (result) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bgDeep, fontFamily: "'Inter', sans-serif" }}>
        <ExecutiveDashboard result={result} onRestart={handleRestart} template={template} responses={responses} />
      </div>
    );
  }

  if (isAssessing) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.bgDeep,
          fontFamily: "'Inter', sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          color: COLORS.silver,
        }}
      >
        <div style={{ fontSize: 15 }}>Calculating adaptive recoverability…</div>
        <div style={{ fontSize: 12.5, color: COLORS.silverDim }}>
          Running evidence through the ARG reasoning engine
        </div>
      </div>
    );
  }

  if (assessmentError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.bgDeep,
          fontFamily: "'Inter', sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ color: COLORS.red, fontSize: 15, maxWidth: 480 }}>
          The assessment engine could not be reached: {assessmentError}
        </div>
        <button
          type="button"
          onClick={handleRunAssessment}
          style={{
            background: COLORS.gold,
            color: COLORS.bgDeep,
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  const currentCategory = template.categories[stepIndex];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bgDeep, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: COLORS.goldSoft,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            marginBottom: 18,
          }}
        >
          {template.label}
        </div>

        <ProgressRail
          categories={[...template.categories, { id: "review", label: "Review" }]}
          currentIndex={stepIndex}
          onJump={setStepIndex}
        />

        {!isReviewStep ? (
          <>
            <h2
              style={{
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: 24,
                color: COLORS.silver,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {currentCategory.label}
            </h2>
            <p style={{ color: COLORS.silverDim, fontSize: 14, marginBottom: 32, lineHeight: 1.5 }}>
              {currentCategory.description}
            </p>

            {currentCategory.evidence.map((ev) => {
              const isUnknown = responses[ev.id] === UNKNOWN_VALUE;
              return (
                <FieldShell
                  key={ev.id}
                  label={ev.label}
                  helpText={ev.helpText}
                  sourceHint={ev.sourceHint}
                  isUnknown={isUnknown}
                  onToggleUnknown={() => handleChange(ev.id, isUnknown ? "" : UNKNOWN_VALUE)}
                >
                  <EvidenceInput
                    evidence={ev}
                    value={responses[ev.id]}
                    onChange={(val) => handleChange(ev.id, val)}
                  />
                </FieldShell>
              );
            })}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 36 }}>
              <button
                onClick={handleBack}
                disabled={stepIndex === 0}
                style={{
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  background: "transparent",
                  color: stepIndex === 0 ? COLORS.border : COLORS.silverDim,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  cursor: stepIndex === 0 ? "default" : "pointer",
                }}
              >
                Back
              </button>
              <button
                onClick={handleNext}
                style={{
                  padding: "12px 28px",
                  borderRadius: 8,
                  border: "none",
                  background: COLORS.gold,
                  color: COLORS.bgDeep,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <h2
              style={{
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: 24,
                color: COLORS.silver,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Review
            </h2>
            <p style={{ color: COLORS.silverDim, fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
              Confirm the evidence below before running the assessment. Any section can be revisited to make changes.
            </p>

            {template.categories.map((cat) => {
              const answeredCount = cat.evidence.filter((ev) => {
                const v = responses[ev.id];
                return v !== undefined && v !== "" && v !== null;
              }).length;
              return (
                <div
                  key={cat.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 0",
                    borderBottom: `1px solid ${COLORS.border}`,
                  }}
                >
                  <span style={{ color: COLORS.silver, fontSize: 14.5 }}>{cat.label}</span>
                  <span style={{ color: COLORS.silverDim, fontSize: 13 }}>
                    {answeredCount} / {cat.evidence.length} provided
                  </span>
                </div>
              );
            })}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 36 }}>
              <button
                onClick={handleBack}
                style={{
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  background: "transparent",
                  color: COLORS.silverDim,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Back
              </button>
              <button
                onClick={handleRunAssessment}
                style={{
                  padding: "12px 28px",
                  borderRadius: 8,
                  border: "none",
                  background: COLORS.gold,
                  color: COLORS.bgDeep,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: 14.5,
                  cursor: "pointer",
                }}
              >
                Run Assessment
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
