// Structured output of the standalone plan review (ai/review.ts). Not part of the self-healing pipeline.

export const VERDICTS = ["APPROVE", "APPROVE_WITH_CHANGES", "REJECT"] as const;
export const FINDING_TYPES = ["REQUIRED_FIX", "RECOMMENDED", "VERIFICATION"] as const;
export const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

export type ReviewFinding = {
    id: string;
    type: typeof FINDING_TYPES[number];
    severity: typeof SEVERITIES[number];
    file: string;
    problem: string;
    action: string;
    requirementIds: string[];
};

export type PlanReview = {
    verdict: typeof VERDICTS[number];
    summary: string;
    findings: ReviewFinding[];
    assumptions: string[];
    validationChecklist: string[];
};

// JSON Schema for the Responses API (strict mode: every property required, no extra properties)
export const PLAN_REVIEW_JSON_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["verdict", "summary", "findings", "assumptions", "validationChecklist"],
    properties: {
        verdict: { type: "string", enum: [...VERDICTS] },
        summary: { type: "string" },
        findings: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "type", "severity", "file", "problem", "action", "requirementIds"],
                properties: {
                    id: { type: "string", description: "F1, F2, ... in order" },
                    type: { type: "string", enum: [...FINDING_TYPES] },
                    severity: { type: "string", enum: [...SEVERITIES] },
                    file: { type: "string", description: "Project-relative path the finding is about, or the plan path" },
                    problem: { type: "string" },
                    action: { type: "string", description: "The concrete change to make in the plan" },
                    requirementIds: { type: "array", items: { type: "string" }, description: "AC<n> / E<n> affected, empty if none" },
                },
            },
        },
        assumptions: { type: "array", items: { type: "string" } },
        validationChecklist: { type: "array", items: { type: "string" } },
    },
} as const;

export function renderPlanReviewMarkdown(review: PlanReview, planPath: string, model: string): string {
    const lines: string[] = [
        `# Plan Review: ${planPath}`,
        "",
        `- Verdict: **${review.verdict}**`,
        `- Model: ${model}`,
        `- Findings: ${FINDING_TYPES.map(type => `${type} ${review.findings.filter(f => f.type === type).length}`).join(", ")}`,
        "",
        "## Summary",
        "",
        review.summary,
        "",
        "## Findings",
        "",
    ];

    if (review.findings.length === 0) lines.push("None.", "");
    for (const finding of review.findings) {
        const ids = finding.requirementIds.length > 0 ? ` (${finding.requirementIds.join(", ")})` : "";
        lines.push(
            `### ${finding.id} [${finding.severity}] ${finding.type}${ids}`,
            "",
            `- File: \`${finding.file}\``,
            `- Problem: ${finding.problem}`,
            `- Action: ${finding.action}`,
            "",
        );
    }

    lines.push("## Assumptions", "", ...(review.assumptions.length ? review.assumptions.map(a => `- ${a}`) : ["None."]), "");
    lines.push("## Validation Checklist", "", ...(review.validationChecklist.length ? review.validationChecklist.map(c => `- ${c}`) : ["None."]), "");
    return lines.join("\n");
}
