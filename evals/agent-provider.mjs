export default class DoohAgentProvider {
  constructor() {
    this.baseUrl = process.env.EVAL_BASE_URL || "http://127.0.0.1:5191";
  }

  id() {
    return "dooh-mediagpt-agent";
  }

  async callApi(prompt, context) {
    const vars = context?.vars || {};
    const endpoint = vars.endpoint || "agent/run";
    if (endpoint === "eval/triageSubmission") {
      const actor = vars.actor || "promptfoo";
      const role = vars.role || "reviewer";
      const submission = vars.submission || {};
      const payload = {
        campaign: submission.campaign || "Eval campaign",
        packageName: submission.packageName || "Eval package",
        budget: submission.budget || "AED 10,000",
        creativeId: submission.creativeId || "AD-DWT-011",
        priority: submission.priority || "Medium",
        brand: submission.brand || submission.bidder || "Eval advertiser",
        vertical: submission.vertical || "Retail",
        audience: submission.audience || "General public",
        targetZones: submission.targetZones || ["Reem Island"],
        daypart: submission.daypart || "Evening",
        startDate: submission.startDate || "Jul 20, 2026",
        endDate: submission.endDate || "Jul 30, 2026",
        contactEmail: submission.contactEmail || "eval@example.com",
        contactName: submission.contactName || actor,
        languages: submission.languages || "Arabic and English",
        objective: [prompt, submission.objective, submission.notes].filter(Boolean).join(" | "),
        reach: submission.reach || "100000",
        compliance: submission.compliance || {
          arabicCopy: true,
          rightsCleared: true,
          noRestrictedCategory: true,
          brandOwnerConfirmed: true,
        },
        assets: submission.assets || [],
      };

      const createResponse = await fetch(`${this.baseUrl}/api/dooh/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor, role, payload }),
      });
      const created = await createResponse.json();
      const submissionId = created?.submission?.id;
      if (!createResponse.ok || !submissionId) {
        return { output: JSON.stringify(created) };
      }
      const triageResponse = await fetch(`${this.baseUrl}/api/dooh/agent/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor, role, submissionId }),
      });
      return { output: JSON.stringify(await triageResponse.json()) };
    }
    const body = endpoint === "ai/tagSubmission"
      ? { submission: { ...(vars.submission || {}), notes: prompt } }
      : {
          message: prompt,
          role: vars.role || "admin",
          actor: vars.actor || "promptfoo",
          threadId: `eval-${Date.now()}`,
        };
    const response = await fetch(`${this.baseUrl}/api/dooh/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await response.json();
    return {
      output: JSON.stringify(json),
    };
  }
}
