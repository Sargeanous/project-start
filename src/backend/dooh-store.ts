type SubmissionStage = "Submitted" | "In review" | "Approved" | "Scheduled" | "Published" | "Changes requested";
type AlertState = "Check required" | "Checked" | "Approval required" | "Broadcast queued" | "Broadcasting" | "Live on network";

type Priority = "Low" | "Medium" | "High";
type CampaignStatus = "Draft" | "Bidding" | "Submitted" | "In review" | "Approved" | "Scheduled" | "Published";
type ScheduleState = "Playing" | "Queued" | "Scheduled";
type FinanceState = "Pending" | "Approved" | "On hold" | "Rejected";

export interface Submission {
  id: string;
  campaign: string;
  bidder: string;
  packageName: string;
  owner: string;
  requestedStart: string;
  budget: string;
  priority: Priority;
  stage: SubmissionStage;
  creativeId: string;
  language: string;
  notes: string;
}

export interface BidderCampaign {
  id: string;
  campaign: string;
  packageName: string;
  budget: string;
  status: CampaignStatus;
  reach: string;
  nextStep: string;
}

export interface AuctionLot {
  id: string;
  lotName: string;
  packageName: string;
  network: string;
  flightWindow: string;
  impressions: string;
  floorPrice: number;
  currentBid: number;
  leadingBidder: string;
  minIncrement: number;
  bidCount: number;
  closesAt: string;
  creativeId: string;
  currency: string;
}

export interface BidRecord {
  id: string;
  lotId: string;
  lotName: string;
  campaign: string;
  bidder: string;
  amount: number;
  currency: string;
  submittedAt: string;
  status: "Leading" | "Outbid";
}

export interface ScheduleItem {
  id: string;
  time: string;
  asset: string;
  campaign: string;
  owner: string;
  state: ScheduleState;
}

export interface PublishedItem {
  id: string;
  campaign: string;
  asset: string;
  creativeId: string;
  started: string;
}

export interface EmergencyAlert {
  id: string;
  title: string;
  scope: string;
  authority: string;
  sla: string;
  audience: string;
  endTime: string;
  state: AlertState;
  criticality: "Critical" | "Major" | "Minor";
}

export interface VerificationStep {
  label: string;
  owner: string;
  state: "Check required" | "Checked" | "Needs review";
}

export interface FinanceApproval {
  id: string;
  campaign: string;
  bidder: string;
  packageName: string;
  amount: string;
  margin: string;
  risk: "Low" | "Medium" | "Elevated";
  state: FinanceState;
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  subject: string;
  at: string;
}

export interface DoohState {
  submissions: Submission[];
  campaigns: BidderCampaign[];
  schedule: ScheduleItem[];
  published: PublishedItem[];
  auctions: AuctionLot[];
  bids: BidRecord[];
  alerts: EmergencyAlert[];
  verificationSteps: VerificationStep[];
  financeApprovals: FinanceApproval[];
  activity: ActivityItem[];
}

export interface BriefPayload {
  campaign: string;
  packageName: string;
  budget: string;
  creativeId: string;
  languages: string;
  startDate: string;
  endDate: string;
  priority: "Standard" | "High";
  objective: string;
  contactName: string;
  contactEmail: string;
  brand: string;
  vertical: string;
  audience: string;
  targetZones: string[];
  daypart: string;
  reach: string;
  compliance: { uaeMedia: boolean; arabicProof: boolean; rightsCleared: boolean; noPolitical: boolean };
  assets: Array<{ name: string; type: string; size: string; illustration: string }>;
}

export interface AlertDraft {
  title: string;
  scope: string;
  content: string;
  criticality: "Critical" | "Major" | "Minor";
}

const initialVerificationSteps: VerificationStep[] = [
  { label: "Message payload", owner: "Policy engine", state: "Check required" },
  { label: "Arabic and English copy", owner: "Content reviewer", state: "Check required" },
  { label: "Authority approval", owner: "Duty officer", state: "Check required" },
  { label: "Edge cache route", owner: "CMS workflow", state: "Check required" },
];

const initialState: DoohState = {
  submissions: [
    {
      id: "SUB-1048",
      campaign: "Airport retail launch",
      bidder: "Advertiser",
      packageName: "Airport and premium roadside",
      owner: "Maya Haddad",
      requestedStart: "Jul 08, 2026",
      budget: "AED 420,000",
      priority: "Low",
      stage: "In review",
      creativeId: "etihad-retail",
      language: "Arabic and English",
      notes: "Airport retail creative with bilingual copy and weekend flight targeting.",
    },
    {
      id: "SUB-1047",
      campaign: "Yas summer promotion",
      bidder: "Yas Tourism",
      packageName: "Leisure loop",
      owner: "Hamad Al Ketbi",
      requestedStart: "Jul 12, 2026",
      budget: "AED 285,000",
      priority: "Low",
      stage: "Approved",
      creativeId: "yas-tourism",
      language: "Arabic and English",
      notes: "Tourism campaign approved for Yas and airport routes.",
    },
    {
      id: "SUB-1046",
      campaign: "Coastal road closure",
      bidder: "DMT",
      packageName: "Civic emergency lane",
      owner: "Noura Salem",
      requestedStart: "Today",
      budget: "Public notice",
      priority: "Medium",
      stage: "Scheduled",
      creativeId: "weather-alert",
      language: "Arabic first",
      notes: "Public notice scheduled after dual-control approval.",
    },
    {
      id: "SUB-1045",
      campaign: "National observance takeover",
      bidder: "ADMO",
      packageName: "Full estate civic takeover",
      owner: "Khaled Mansoor",
      requestedStart: "Jul 18, 2026",
      budget: "Civic allocation",
      priority: "High",
      stage: "Submitted",
      creativeId: "holiday-notice",
      language: "Arabic and English",
      notes: "Awaiting cultural review and schedule lock.",
    },
  ],
  campaigns: [
    {
      id: "CMP-221",
      campaign: "Airport retail launch",
      packageName: "Airport and premium roadside",
      budget: "AED 420,000",
      status: "In review",
      reach: "1.4M est.",
      nextStep: "ADMO content review",
    },
    {
      id: "CMP-219",
      campaign: "Weekend mall offer",
      packageName: "Downtown retail loop",
      budget: "AED 160,000",
      status: "Published",
      reach: "790k delivered",
      nextStep: "Proof-of-play reconciliation",
    },
  ],
  schedule: [
    { id: "SCH-001", time: "08:00", asset: "AD-HWY-001", campaign: "Road safety rotation", owner: "ADMO", state: "Playing" },
    { id: "SCH-002", time: "09:30", asset: "AD-BUS-022", campaign: "Yas summer promotion", owner: "Yas Tourism", state: "Queued" },
    { id: "SCH-003", time: "11:00", asset: "AD-DWT-011", campaign: "Weekend mall offer", owner: "Retail Majlis", state: "Scheduled" },
    { id: "SCH-004", time: "14:00", asset: "AD-BRG-014", campaign: "Industrial safety notice", owner: "DMT", state: "Scheduled" },
  ],
  published: [
    { id: "PUB-001", campaign: "Road safety rotation", asset: "AD-HWY-001", creativeId: "road-safety", started: "08:00" },
    { id: "PUB-002", campaign: "Yas summer promotion", asset: "AD-BUS-022", creativeId: "yas-tourism", started: "09:30" },
    { id: "PUB-003", campaign: "Weekend mall offer", asset: "AD-DWT-011", creativeId: "mall-footfall", started: "11:00" },
    { id: "PUB-004", campaign: "Industrial safety notice", asset: "AD-BRG-014", creativeId: "industrial-notice", started: "14:00" },
  ],
  auctions: [
    {
      id: "LOT-4411",
      lotName: "Corniche prime - evening rotation",
      packageName: "Airport and premium roadside",
      network: "12 panels - Corniche, Airport Road",
      flightWindow: "Jul 20 - Aug 03, 2026",
      impressions: "1.4M weekly",
      floorPrice: 380000,
      currentBid: 442000,
      leadingBidder: "Yas Tourism",
      minIncrement: 5000,
      bidCount: 7,
      closesAt: "Jul 04, 2026 - 18:00",
      creativeId: "etihad-retail",
      currency: "AED",
    },
    {
      id: "LOT-4408",
      lotName: "Downtown retail loop - weekend",
      packageName: "Downtown retail loop",
      network: "18 mall and urban panels",
      flightWindow: "Jul 12 - Jul 26, 2026",
      impressions: "790k weekly",
      floorPrice: 150000,
      currentBid: 168500,
      leadingBidder: "Retail Majlis",
      minIncrement: 2500,
      bidCount: 4,
      closesAt: "Jul 03, 2026 - 12:00",
      creativeId: "mall-footfall",
      currency: "AED",
    },
    {
      id: "LOT-4402",
      lotName: "Yas leisure loop - summer flight",
      packageName: "Yas leisure loop",
      network: "9 panels - Yas Island and hotel corridor",
      flightWindow: "Jul 15 - Aug 15, 2026",
      impressions: "620k weekly",
      floorPrice: 210000,
      currentBid: 210000,
      leadingBidder: "No bids yet",
      minIncrement: 5000,
      bidCount: 0,
      closesAt: "Jul 05, 2026 - 20:00",
      creativeId: "yas-tourism",
      currency: "AED",
    },
  ],
  bids: [],
  alerts: [
    {
      id: "ALT-901",
      title: "Weather alert broadcast",
      scope: "Al Ain and highway gateways",
      authority: "NCEMA",
      sla: "Display within 60s",
      audience: "Drivers and commuters",
      endTime: "Today 18:00",
      state: "Check required",
      criticality: "Critical",
    },
    {
      id: "ALT-884",
      title: "Road closure notice",
      scope: "Corniche westbound",
      authority: "DMT",
      sla: "Display within 5m",
      audience: "City traffic",
      endTime: "Jul 02, 08:00",
      state: "Approval required",
      criticality: "Major",
    },
  ],
  verificationSteps: initialVerificationSteps,
  financeApprovals: [
    {
      id: "FIN-1200",
      campaign: "Airport retail launch",
      bidder: "Advertiser",
      packageName: "Airport and premium roadside",
      amount: "AED 420,000",
      margin: "24%",
      risk: "Low",
      state: "Pending",
    },
  ],
  activity: [
    { id: "ACT-001", actor: "System", action: "Seeded demo state", subject: "DOOH platform", at: new Date().toISOString() },
  ],
};

declare global {
  // eslint-disable-next-line no-var
  var __doohBackendState: DoohState | undefined;
}

function cloneState(state: DoohState): DoohState {
  return JSON.parse(JSON.stringify(state)) as DoohState;
}

function cloneInitialState(): DoohState {
  return cloneState(initialState);
}

function formatNow() {
  return new Date().toISOString();
}

function addActivity(state: DoohState, actor: string, action: string, subject: string) {
  state.activity = [
    {
      id: nextId("ACT", state.activity),
      actor,
      action,
      subject,
      at: formatNow(),
    },
    ...state.activity,
  ].slice(0, 80);
}

function nextId(prefix: string, items: Array<{ id: string }>) {
  const highest = items.reduce((max, item) => {
    const numeric = Number.parseInt(item.id.replace(/\D/g, ""), 10);
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
}

function campaignStatusFromStage(stage: SubmissionStage): CampaignStatus {
  if (stage === "In review") return "In review";
  if (stage === "Approved") return "Approved";
  if (stage === "Scheduled") return "Scheduled";
  if (stage === "Published") return "Published";
  return "Submitted";
}

function campaignNextStep(stage: SubmissionStage) {
  if (stage === "Submitted") return "ADMO intake review";
  if (stage === "In review") return "Human moderation";
  if (stage === "Approved") return "Schedule slot selection";
  if (stage === "Scheduled") return "Awaiting publish";
  if (stage === "Published") return "Proof-of-play reconciliation";
  return "Bidder revision required";
}

async function readPersistedState(): Promise<DoohState | null> {
  try {
    if (typeof process === "undefined" || !process.versions?.node) return null;
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const raw = await readFile(join(process.cwd(), ".dooh-data", "state.json"), "utf8");
    return JSON.parse(raw) as DoohState;
  } catch {
    return null;
  }
}

async function writePersistedState(state: DoohState) {
  try {
    if (typeof process === "undefined" || !process.versions?.node) return;
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const dir = join(process.cwd(), ".dooh-data");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "state.json"), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  } catch {
    // The app still runs in environments without filesystem persistence.
  }
}

export async function getState(): Promise<DoohState> {
  if (!globalThis.__doohBackendState) {
    globalThis.__doohBackendState = (await readPersistedState()) ?? cloneInitialState();
    await writePersistedState(globalThis.__doohBackendState);
  }
  return cloneState(globalThis.__doohBackendState);
}

async function commit(mutator: (state: DoohState) => void | Promise<void>): Promise<DoohState> {
  const state = await getState();
  await mutator(state);
  globalThis.__doohBackendState = cloneState(state);
  await writePersistedState(state);
  return cloneState(state);
}

export async function resetState(): Promise<DoohState> {
  const state = cloneInitialState();
  globalThis.__doohBackendState = cloneState(state);
  await writePersistedState(state);
  return cloneState(state);
}

export async function createSubmission(payload: BriefPayload, actor: string): Promise<{ state: DoohState; submission: Submission }> {
  let created!: Submission;
  const state = await commit((draft) => {
    created = {
      id: nextId("SUB", draft.submissions),
      campaign: payload.campaign.trim(),
      bidder: actor || payload.brand || "Bidder",
      packageName: payload.packageName,
      owner: payload.contactName || actor || "Bidder account",
      requestedStart: payload.startDate || "Jul 15, 2026",
      budget: payload.budget,
      priority: payload.priority === "High" ? "High" : "Medium",
      stage: "Submitted",
      creativeId: payload.creativeId,
      language: payload.languages,
      notes: payload.objective || "Submitted from the bidder workspace and waiting for ADMO CMS review.",
    };
    draft.submissions = [created, ...draft.submissions];
    draft.campaigns = [
      {
        id: nextId("CMP", draft.campaigns),
        campaign: created.campaign,
        packageName: created.packageName,
        budget: created.budget,
        status: "Submitted",
        reach: payload.reach || "Pending ADMO estimate",
        nextStep: "ADMO content review",
      },
      ...draft.campaigns.filter((campaign) => campaign.campaign !== created.campaign),
    ];
    draft.financeApprovals = [
      {
        id: nextId("FIN", draft.financeApprovals),
        campaign: created.campaign,
        bidder: created.bidder,
        packageName: created.packageName,
        amount: created.budget,
        margin: "Model pending",
        risk: created.priority === "High" ? "Elevated" : "Medium",
        state: "Pending",
      },
      ...draft.financeApprovals,
    ];
    addActivity(draft, actor, "Submitted campaign brief", created.campaign);
  });
  return { state, submission: created };
}

export async function placeBid(payload: { lotId: string; amount: number; campaign: string }, actor: string): Promise<{ state: DoohState; bid: BidRecord }> {
  let bid!: BidRecord;
  const state = await commit((draft) => {
    const lot = draft.auctions.find((item) => item.id === payload.lotId);
    if (!lot) throw new Error("Auction lot not found");
    const minNext = lot.currentBid + lot.minIncrement;
    if (!Number.isFinite(payload.amount) || payload.amount < minNext) {
      throw new Error(`Minimum bid is ${lot.currency} ${minNext}`);
    }

    draft.bids = draft.bids.map((item) => (item.lotId === lot.id && item.status === "Leading" ? { ...item, status: "Outbid" } : item));
    lot.currentBid = payload.amount;
    lot.leadingBidder = actor || "Bidder";
    lot.bidCount += 1;
    bid = {
      id: nextId("BID", draft.bids),
      lotId: lot.id,
      lotName: lot.lotName,
      campaign: payload.campaign.trim() || `Bid on ${lot.lotName}`,
      bidder: actor || "Bidder",
      amount: payload.amount,
      currency: lot.currency,
      submittedAt: formatNow(),
      status: "Leading",
    };
    draft.bids = [bid, ...draft.bids];
    draft.campaigns = [
      {
        id: nextId("CMP", draft.campaigns),
        campaign: bid.campaign,
        packageName: lot.packageName,
        budget: `${lot.currency} ${payload.amount.toLocaleString("en-US")}`,
        status: "Bidding",
        reach: lot.impressions,
        nextStep: `Auction closes ${lot.closesAt}`,
      },
      ...draft.campaigns.filter((campaign) => !(campaign.campaign === bid.campaign && campaign.status === "Bidding")),
    ];
    draft.financeApprovals = [
      {
        id: nextId("FIN", draft.financeApprovals),
        campaign: bid.campaign,
        bidder: bid.bidder,
        packageName: lot.packageName,
        amount: `${lot.currency} ${payload.amount.toLocaleString("en-US")}`,
        margin: "Auction",
        risk: "Medium",
        state: "Pending",
      },
      ...draft.financeApprovals,
    ];
    addActivity(draft, actor, "Placed bid", lot.lotName);
  });
  return { state, bid };
}

export async function updateSubmissionStage(id: string, stage: SubmissionStage, actor: string): Promise<{ state: DoohState; submission: Submission }> {
  let submission!: Submission;
  const state = await commit((draft) => {
    const item = draft.submissions.find((entry) => entry.id === id);
    if (!item) throw new Error("Submission not found");
    item.stage = stage;
    submission = { ...item };
    draft.campaigns = draft.campaigns.map((campaign) =>
      campaign.campaign === item.campaign
        ? { ...campaign, status: campaignStatusFromStage(stage), nextStep: campaignNextStep(stage) }
        : campaign,
    );
    if (stage === "Scheduled" && !draft.schedule.some((slot) => slot.campaign === item.campaign)) {
      draft.schedule = [
        ...draft.schedule,
        {
          id: nextId("SCH", draft.schedule),
          time: "16:00",
          asset: "AD-HWY-001",
          campaign: item.campaign,
          owner: item.bidder,
          state: "Queued",
        },
      ];
    }
    if (stage === "Published" && !draft.published.some((published) => published.campaign === item.campaign)) {
      draft.published = [
        {
          id: nextId("PUB", draft.published),
          campaign: item.campaign,
          asset: "AD-HWY-001",
          creativeId: item.creativeId,
          started: "Now",
        },
        ...draft.published,
      ];
    }
    addActivity(draft, actor, `Moved submission to ${stage}`, item.campaign);
  });
  return { state, submission };
}

export async function playScheduleItem(id: string, actor: string): Promise<DoohState> {
  return commit((draft) => {
    const slot = draft.schedule.find((item) => item.id === id);
    if (!slot) throw new Error("Schedule item not found");
    slot.state = "Playing";
    if (!draft.published.some((item) => item.campaign === slot.campaign && item.asset === slot.asset)) {
      const submission = draft.submissions.find((item) => item.campaign === slot.campaign);
      draft.published = [
        {
          id: nextId("PUB", draft.published),
          campaign: slot.campaign,
          asset: slot.asset,
          creativeId: submission?.creativeId ?? "live-slate",
          started: "Now",
        },
        ...draft.published,
      ];
    }
    addActivity(draft, actor, "Started scheduled campaign", slot.campaign);
  });
}

export async function createAlert(payload: AlertDraft, actor: string): Promise<{ state: DoohState; alert: EmergencyAlert }> {
  let alert!: EmergencyAlert;
  const state = await commit((draft) => {
    alert = {
      id: nextId("ALT", draft.alerts),
      title: payload.title.trim(),
      scope: payload.scope || "Estate-wide",
      authority: actor || "Duty officer",
      sla: payload.criticality === "Critical" ? "Display within 60s" : "Display within 5m",
      audience: "Public",
      endTime: "Default 2 hours",
      state: "Check required",
      criticality: payload.criticality,
    };
    draft.alerts = [alert, ...draft.alerts];
    draft.verificationSteps = cloneState({ ...initialState, verificationSteps: initialVerificationSteps }).verificationSteps;
    addActivity(draft, actor, "Created emergency alert", alert.title);
  });
  return { state, alert };
}

export async function runEmergencyChecks(id: string, actor: string): Promise<DoohState> {
  return commit((draft) => {
    const alert = draft.alerts.find((item) => item.id === id);
    if (!alert) throw new Error("Alert not found");
    draft.verificationSteps = draft.verificationSteps.map((step) => ({ ...step, state: "Checked" }));
    alert.state = "Approval required";
    addActivity(draft, actor, "Completed emergency checks", alert.title);
  });
}

export async function queueEmergencyBroadcast(id: string, actor: string): Promise<DoohState> {
  return commit((draft) => {
    const alert = draft.alerts.find((item) => item.id === id);
    if (!alert) throw new Error("Alert not found");
    const checked = draft.verificationSteps.every((step) => step.state === "Checked");
    if (!checked) throw new Error("Checks must be completed before broadcast queue");
    alert.state = "Broadcast queued";
    addActivity(draft, actor, "Queued emergency broadcast", alert.title);
  });
}

export async function broadcastEmergencyNow(id: string, actor: string): Promise<DoohState> {
  return commit((draft) => {
    const alert = draft.alerts.find((item) => item.id === id);
    if (!alert) throw new Error("Alert not found");
    const checked = draft.verificationSteps.every((step) => step.state === "Checked");
    if (!checked) throw new Error("Checks must be completed before broadcast");
    alert.state = "Live on network";
    draft.published = [
      {
        id: nextId("PUB", draft.published),
        campaign: alert.title,
        asset: alert.scope,
        creativeId: "weather-alert",
        started: "Now",
      },
      ...draft.published,
    ];
    addActivity(draft, actor, "Broadcast emergency alert", alert.title);
  });
}

export async function resetEmergencyAlert(id: string, actor: string): Promise<DoohState> {
  return commit((draft) => {
    const alert = draft.alerts.find((item) => item.id === id);
    if (!alert) throw new Error("Alert not found");
    alert.state = "Check required";
    draft.verificationSteps = initialVerificationSteps.map((step) => ({ ...step }));
    addActivity(draft, actor, "Reset emergency checks", alert.title);
  });
}

export async function decideFinanceApproval(id: string, state: FinanceState, actor: string): Promise<DoohState> {
  return commit((draft) => {
    const approval = draft.financeApprovals.find((item) => item.id === id);
    if (!approval) throw new Error("Finance approval not found");
    approval.state = state;
    addActivity(draft, actor, `Finance decision: ${state}`, approval.campaign);
  });
}

