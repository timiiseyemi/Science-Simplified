import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import OpenAI from "openai";
import crypto from "crypto";
import { tenant as defaultTenant } from "@/lib/config";

const SYSTEM_PROMPT = `
You are a medical communicator trained to write clinical information for patients
at a high-school reading level (grade 10–12).

Rewrite the provided text to be:
- Clear, friendly, accurate
- Non-technical and non-promissory
- Calm and neutral in tone

Avoid medical jargon when possible.
Define unavoidable terms in plain language.
Keep sentences short and conversational.
Do NOT guarantee benefit.
Do NOT define neurofibromatosis, schwannomatosis, hidradenitis, or epidermolysis bullosa.
`;

const TENANT_CONFIG = {
  HS: {
    required: ["hidradenitis suppurativa", "hidradenitis"],
    exclude: ["mood", "parkinson", "glioblastoma"],
  },
  NF: {
    required: ["neurofibromatosis", "nf1", "nf2", "schwannomatosis"],
    exclude: [],
  },
  EB: {
    required: ["epidermolysis bullosa"],
    exclude: [],
  },
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ---------------- helpers ---------------- */

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

function trialMatchesTenant(trial, tenantKey) {
  const config = TENANT_CONFIG[tenantKey];
  if (!config) return false;

  const conditions = trial.protocolSection?.conditionsModule?.conditions || [];
  const haystack = conditions.join(" ").toLowerCase();

  const matchesRequired = config.required.some((term) =>
    haystack.includes(term.toLowerCase())
  );

  if (!matchesRequired) return false;

  if (config.exclude?.length) {
    const hasExcluded = config.exclude.some((term) =>
      haystack.includes(term.toLowerCase())
    );
    if (hasExcluded) return false;
  }

  return true;
}

function buildSourceHash(trial) {
  const p = trial.protocolSection;
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        title: p.identificationModule?.briefTitle ?? "",
        conditions: p.conditionsModule?.conditions ?? [],
        eligibility: p.eligibilityModule?.eligibilityCriteria ?? "",
        status: p.statusModule?.overallStatus ?? "",
      })
    )
    .digest("hex");
}

async function aiCall(prompt) {
  const res = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });

  return res.choices[0].message.content.trim();
}

/* ---------- AI GENERATION FUNCTIONS ---------- */
// (keep all your existing generateShortTitle, generatePatientSummary, etc. functions here - unchanged)

/* ---------- SYNC ---------- */

export async function GET(req) {
  const TENANT = defaultTenant.shortName?.toUpperCase();

  if (!TENANT || !TENANT_CONFIG[TENANT]) {
    return NextResponse.json(
      { success: false, error: "Invalid tenant" },
      { status: 400 }
    );
  }

  const SEARCH_TERMS = TENANT_CONFIG[TENANT].required;

  try {
    const url = new URL("https://clinicaltrials.gov/api/v2/studies");
    url.searchParams.set("query.cond", SEARCH_TERMS.join(" OR "));
    url.searchParams.set("pageSize", "50");

    const res = await fetch(url.toString());
    const { studies = [] } = await res.json();

    for (const study of studies) {
      const p = study.protocolSection;
      if (!trialMatchesTenant(study, TENANT)) {
        continue;
      }
      const nctId = p?.identificationModule?.nctId;
      if (!nctId) continue;

      const newHash = buildSourceHash(study);

      const existing = await sql`
        SELECT
          source_hash,
          last_synced_at,
          ai_purpose,
          ai_treatments,
          ai_design,
          ai_eligibility,
          ai_participation,
          ai_leadership,
          ai_prior_research,
          ai_locations
        FROM clinical_trials
        WHERE nct_id = ${nctId}
        LIMIT 1
      `;

      const hasAllAI =
        existing[0]?.ai_purpose &&
        existing[0]?.ai_treatments &&
        existing[0]?.ai_design &&
        existing[0]?.ai_eligibility &&
        existing[0]?.ai_participation &&
        existing[0]?.ai_leadership &&
        existing[0]?.ai_prior_research &&
        existing[0]?.ai_locations;

      const shouldSkip =
        existing.length &&
        existing[0].source_hash === newHash &&
        new Date(existing[0].last_synced_at).getTime() > Date.now() - WEEK_MS &&
        hasAllAI;

      if (shouldSkip) continue;

      let aiPayload;

      try {
        aiPayload = {
          shortTitle: await generateShortTitle(study),
          summary: await generatePatientSummary(study),
          purpose: await generatePurpose(study),
          treatments: await generateTreatments(study),
          design: await generateDesign(study),
          eligibility: await generateEligibility(study),
          participation: await generateParticipation(study),
          leadership: await generateLeadership(study),
          priorResearch: await generatePriorResearch(study),
          locations: generateLocations(study),
        };
      } catch (err) {
        console.error("AI generation failed for", nctId, err);
        continue;
      }

      if (
        !aiPayload.purpose ||
        !aiPayload.design ||
        !aiPayload.eligibility ||
        !aiPayload.participation ||
        !aiPayload.leadership ||
        !aiPayload.priorResearch ||
        !aiPayload.locations
      ) {
        continue;
      }

      await sql`
        INSERT INTO clinical_trials (
          nct_id, tenant, overall_status,
          start_date, primary_completion_date, completion_date, last_update_date,
          conditions, keywords, raw_data,
          short_title, ai_summary, ai_summary_updated_at,
          ai_purpose, ai_treatments, ai_design, ai_eligibility,
          ai_participation, ai_leadership, ai_prior_research, ai_locations,
          source_hash, is_active, last_synced_at
        )
        VALUES (
          ${nctId}, ${TENANT}, ${p.statusModule?.overallStatus ?? null},
          ${normalizeDate(p.statusModule?.startDateStruct?.date)},
          ${normalizeDate(p.statusModule?.primaryCompletionDateStruct?.date)},
          ${normalizeDate(p.statusModule?.completionDateStruct?.date)},
          ${normalizeDate(p.statusModule?.lastUpdatePostDateStruct?.date)},
          ${p.conditionsModule?.conditions ?? []},
          ${p.conditionsModule?.keywords ?? []},
          ${JSON.stringify(study)}::jsonb,
          ${aiPayload.shortTitle},
          ${aiPayload.summary}, NOW(),
          ${aiPayload.purpose},
          ${aiPayload.treatments},
          ${aiPayload.design},
          ${aiPayload.eligibility},
          ${aiPayload.participation},
          ${aiPayload.leadership},
          ${aiPayload.priorResearch},
          ${aiPayload.locations},
          ${newHash}, true, NOW()
        )
        ON CONFLICT (nct_id) DO UPDATE SET
          short_title = CASE WHEN clinical_trials.short_title_manual IS NULL THEN EXCLUDED.short_title ELSE clinical_trials.short_title END,
          ai_summary = CASE WHEN clinical_trials.ai_summary_manual IS NULL THEN EXCLUDED.ai_summary ELSE clinical_trials.ai_summary END,
          ai_purpose = CASE WHEN clinical_trials.ai_purpose_manual IS NULL THEN EXCLUDED.ai_purpose ELSE clinical_trials.ai_purpose END,
          ai_treatments = CASE WHEN clinical_trials.ai_treatments_manual IS NULL THEN EXCLUDED.ai_treatments ELSE clinical_trials.ai_treatments END,
          ai_design = CASE WHEN clinical_trials.ai_design_manual IS NULL THEN EXCLUDED.ai_design ELSE clinical_trials.ai_design END,
          ai_eligibility = CASE WHEN clinical_trials.ai_eligibility_manual IS NULL THEN EXCLUDED.ai_eligibility ELSE clinical_trials.ai_eligibility END,
          ai_participation = CASE WHEN clinical_trials.ai_participation_manual IS NULL THEN EXCLUDED.ai_participation ELSE clinical_trials.ai_participation END,
          ai_leadership = CASE WHEN clinical_trials.ai_leadership_manual IS NULL THEN EXCLUDED.ai_leadership ELSE clinical_trials.ai_leadership END,
          ai_prior_research = CASE WHEN clinical_trials.ai_prior_research_manual IS NULL THEN EXCLUDED.ai_prior_research ELSE clinical_trials.ai_prior_research END,
          ai_locations = CASE WHEN clinical_trials.ai_locations_manual IS NULL THEN EXCLUDED.ai_locations ELSE clinical_trials.ai_locations END,
          source_hash = CASE WHEN (clinical_trials.short_title_manual IS NOT NULL OR clinical_trials.ai_summary_manual IS NOT NULL OR clinical_trials.ai_purpose_manual IS NOT NULL) THEN clinical_trials.source_hash ELSE EXCLUDED.source_hash END,
          last_synced_at = NOW(),
          updated_at = NOW()
      `;
    }

    return NextResponse.json({ success: true, tenant: TENANT });
  } catch (err) {
    console.error("SYNC ERROR:", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}