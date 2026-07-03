export type LocalizedText = {
  en: string;
  ar: string;
};

export type KnowledgeCollectionId =
  | "governance"
  | "creative"
  | "commercial"
  | "emergency"
  | "network"
  | "proof"
  | "integrations"
  | "mediagpt";

export type KnowledgeStatus = "Indexed" | "Indexing" | "Queued" | "Needs review";
export type KnowledgeType = "Policy" | "SOP" | "Manual" | "Rate card" | "Contract" | "Dataset" | "Runbook" | "Template";
export type Sensitivity = "Public" | "Internal" | "Confidential" | "Restricted";

export interface OntologyEntity {
  id: string;
  name: LocalizedText;
  layer: LocalizedText;
  definition: LocalizedText;
  examples: string[];
  relationships: string[];
}

export interface KnowledgeCollection {
  id: KnowledgeCollectionId;
  name: LocalizedText;
  description: LocalizedText;
  owner: string;
  sensitivity: Sensitivity;
  documents: number;
  chunks: number;
  usedBy: string[];
  domains: string[];
}

export interface KnowledgeSource {
  id: string;
  collectionId: KnowledgeCollectionId;
  title: LocalizedText;
  type: KnowledgeType;
  status: KnowledgeStatus;
  owner: string;
  version: string;
  effectiveDate: string;
  sensitivity: Sensitivity;
  chunks: number;
  lastIndexed: string;
  summary: LocalizedText;
  body: LocalizedText;
  linkedEntities: string[];
  tags: string[];
  citations: string[];
  usedBy: string[];
}

export type DoohRuleStatus = "Active" | "Strict" | "Draft";
export type DoohRuleMode = "Enforce" | "Recommend" | "Monitor";
export type DoohRuleSeverity = "Critical" | "High" | "Medium" | "Low";

export interface RuleTestCase {
  input: string;
  expected: string;
}

export interface DoohRule {
  id: string;
  title: LocalizedText;
  family: string;
  scope: string;
  workflowStage: string;
  mode: DoohRuleMode;
  status: DoohRuleStatus;
  severity: DoohRuleSeverity;
  enabled: boolean;
  condition: LocalizedText;
  action: LocalizedText;
  recommendedAction: string;
  owner: string;
  sourceId: string;
  overridePolicy: LocalizedText;
  effectiveDate: string;
  version: string;
  aiEffect: LocalizedText;
  linkedEntities: string[];
  testCases: RuleTestCase[];
}

export interface RuleSimulationContext {
  id: string;
  label: LocalizedText;
  type: "Submission" | "Emergency" | "Bid" | "Asset" | "Schedule" | "Proof";
  input: LocalizedText;
  matchingRuleIds: string[];
  citedSourceIds: string[];
  recommendation: LocalizedText;
  action: LocalizedText;
  tone: "good" | "warn" | "danger" | "info";
}

export interface DemoScenario {
  id: string;
  title: LocalizedText;
  persona: string;
  workflow: string;
  trigger: LocalizedText;
  rules: string[];
  sources: string[];
  outcome: LocalizedText;
  nextAction: LocalizedText;
  status: "Ready" | "Draft" | "Needs data";
}

export const doohOntology: OntologyEntity[] = [
  {
    id: "ONT-ASSET",
    name: { en: "Asset", ar: "الأصل الإعلاني" },
    layer: { en: "Operations", ar: "العمليات" },
    definition: { en: "A physical DOOH display location with screen, controller, connectivity, BoM, maintenance and proof-of-play obligations.", ar: "موقع عرض إعلاني رقمي خارجي يتضمن الشاشة ووحدة التحكم والاتصال وقائمة المكونات والصيانة وإثبات التشغيل." },
    examples: ["AD-HWY-001", "Yas Island Loop", "Airport Road Premium"],
    relationships: ["Zone", "BoM component", "Schedule item", "Proof-of-play ledger"],
  },
  {
    id: "ONT-COMPONENT",
    name: { en: "BoM component", ar: "مكون قائمة المواد" },
    layer: { en: "Network and Devices", ar: "الشبكة والأجهزة" },
    definition: { en: "A maintainable hardware or software component inside an asset: LED cabinet, PSU, controller, router, sensor or edge compute module.", ar: "مكون عتادي أو برمجي قابل للصيانة داخل الأصل مثل خزانة LED أو مزود الطاقة أو وحدة التحكم أو الراوتر أو الحساس أو وحدة الحوسبة الطرفية." },
    examples: ["PSU-48V-600W", "Edge-Orin-07", "5G router"],
    relationships: ["Asset", "Service order", "Purchase order", "Telemetry signal"],
  },
  {
    id: "ONT-SUBMISSION",
    name: { en: "Submission", ar: "طلب الحملة" },
    layer: { en: "CMS", ar: "إدارة المحتوى" },
    definition: { en: "A bidder or internal campaign packet including creative, language, rights, targeting, budget and desired schedule.", ar: "ملف حملة من المعلن أو من الداخل يتضمن التصميم واللغة والحقوق والاستهداف والميزانية والجدولة المطلوبة." },
    examples: ["Airport retail launch", "Yas summer promotion"],
    relationships: ["Creative asset", "Rule finding", "Bidder communication", "Schedule item"],
  },
  {
    id: "ONT-CREATIVE",
    name: { en: "Creative asset", ar: "الأصل الإبداعي" },
    layer: { en: "Content", ar: "المحتوى" },
    definition: { en: "A static, video, audio or document asset submitted for playback, review or supporting evidence.", ar: "صورة أو فيديو أو صوت أو مستند يتم تقديمه للتشغيل أو المراجعة أو كدليل داعم." },
    examples: ["Arabic-first civic slate", "Retail motion pack"],
    relationships: ["Submission", "Media library", "Content rule", "Proof-of-play"],
  },
  {
    id: "ONT-RULE",
    name: { en: "Rule", ar: "قاعدة" },
    layer: { en: "Governance", ar: "الحوكمة" },
    definition: { en: "A versioned internal control that conditions AI reasoning, allowed workflow actions and human approval paths.", ar: "ضابط داخلي بإصدار محدد يوجه تفكير الذكاء الاصطناعي والإجراءات المسموحة ومسارات الاعتماد البشري." },
    examples: ["Arabic parity", "Emergency authority", "Bid margin floor"],
    relationships: ["Knowledge source", "AI recommendation", "Workflow stage", "Audit log"],
  },
  {
    id: "ONT-KNOWLEDGE",
    name: { en: "Knowledge source", ar: "مصدر معرفة" },
    layer: { en: "Intelligence", ar: "الذكاء" },
    definition: { en: "A managed document, table, SOP, template or dataset indexed for MediaGPT answers and citations.", ar: "مستند أو جدول أو إجراء أو قالب أو مجموعة بيانات تتم إدارتها وفهرستها لإجابات MediaGPT واستشهاداته." },
    examples: ["Creative review policy", "Emergency broadcast SOP"],
    relationships: ["Rule", "Agent skill", "Citation", "Scenario"],
  },
  {
    id: "ONT-ALERT",
    name: { en: "Emergency alert", ar: "تنبيه طارئ" },
    layer: { en: "Alerts", ar: "التنبيهات" },
    definition: { en: "A time-sensitive public or civic message requiring authority validation, bilingual payload, SLA and edge distribution control.", ar: "رسالة عامة أو مدنية حساسة زمنياً تتطلب تحقق الجهة المخولة والنص ثنائي اللغة ومستوى الخدمة والتحكم في التوزيع الطرفي." },
    examples: ["Weather alert broadcast", "Coastal road closure"],
    relationships: ["Authority", "CAP-UAE payload", "Edge cache", "Verification step"],
  },
  {
    id: "ONT-BID",
    name: { en: "Bid", ar: "عرض مزايدة" },
    layer: { en: "Commercial", ar: "التجاري" },
    definition: { en: "A commercial offer for a package, zone or asset group with budget, impression expectation and finance approval state.", ar: "عرض تجاري لحزمة أو منطقة أو مجموعة أصول يتضمن الميزانية والتوقعات وعدالة السعر وحالة الاعتماد المالي." },
    examples: ["Corniche prime evening rotation"],
    relationships: ["Rate card", "Campaign", "Finance rule", "Marketplace lot"],
  },
  {
    id: "ONT-POP",
    name: { en: "Proof-of-play", ar: "إثبات التشغيل" },
    layer: { en: "Audit", ar: "التدقيق" },
    definition: { en: "Signed evidence that a creative played on a screen at a scheduled time, reconciled against edge and CMS records.", ar: "دليل موقّع بأن التصميم عُرض على شاشة في الوقت المجدول وتمت مطابقته مع سجلات الحافة وإدارة المحتوى." },
    examples: ["POP-AD-HWY-001-20260701"],
    relationships: ["Schedule item", "Asset", "Campaign", "Finance reconciliation"],
  },
  {
    id: "ONT-ACTION",
    name: { en: "Governed action", ar: "إجراء محكوم" },
    layer: { en: "Workflow", ar: "سير العمل" },
    definition: { en: "An AI-proposed or user-triggered action that changes platform state, sends communication, creates a task or blocks a workflow.", ar: "إجراء يقترحه الذكاء الاصطناعي أو ينفذه المستخدم ويغير حالة المنصة أو يرسل رسالة أو ينشئ مهمة أو يوقف سير عمل." },
    examples: ["Request bidder changes", "Queue broadcast", "Create service order"],
    relationships: ["Rule", "Profile", "Notification", "Audit log"],
  },
];

export const knowledgeCollections: KnowledgeCollection[] = [
  {
    id: "governance",
    name: { en: "Governance and policy", ar: "الحوكمة والسياسات" },
    description: { en: "ADMO operating policies, media council controls, public-sector tone and delegated authority.", ar: "سياسات تشغيل مكتب أبوظبي الإعلامي وضوابط المجلس الإعلامي والنبرة العامة وصلاحيات التفويض." },
    owner: "Platform governance",
    sensitivity: "Confidential",
    documents: 36,
    chunks: 6420,
    usedBy: ["MediaGPT Moderator", "MediaGPT Compliance"],
    domains: ["Policy", "Authority", "Audit"],
  },
  {
    id: "creative",
    name: { en: "Creative review and media", ar: "مراجعة المحتوى والوسائط" },
    description: { en: "Creative guidelines, Arabic/English parity, legibility, brand safety, rights and media asset handling.", ar: "إرشادات التصميم وتكافؤ العربية والإنجليزية والوضوح وسلامة العلامة والحقوق وإدارة الأصول الإعلامية." },
    owner: "CMS governance",
    sensitivity: "Internal",
    documents: 48,
    chunks: 9120,
    usedBy: ["MediaGPT Moderator", "MediaGPT Studio"],
    domains: ["CMS", "Creative", "Rights"],
  },
  {
    id: "commercial",
    name: { en: "Commercial and rate cards", ar: "التجاري وبطاقات الأسعار" },
    description: { en: "Packages, rate cards, auction assumptions, margin floors, competitive separation and bidder terms.", ar: "الحزم وبطاقات الأسعار وافتراضات المزادات وحدود الهامش والفصل التنافسي وشروط المزايدين." },
    owner: "Commercial finance",
    sensitivity: "Restricted",
    documents: 29,
    chunks: 5012,
    usedBy: ["MediaGPT Finance", "MediaGPT Optimizer"],
    domains: ["Finance", "Bidding", "Yield"],
  },
  {
    id: "emergency",
    name: { en: "Emergency operations", ar: "عمليات الطوارئ" },
    description: { en: "Emergency broadcast SOPs, CAP-UAE payload templates, SLA escalation, authority and edge override paths.", ar: "إجراءات بث الطوارئ وقوالب CAP-UAE وتصعيد مستوى الخدمة والصلاحيات ومسارات التجاوز الطرفي." },
    owner: "Control room",
    sensitivity: "Restricted",
    documents: 22,
    chunks: 4060,
    usedBy: ["MediaGPT Orchestrator", "MediaGPT Sentinel"],
    domains: ["Emergency", "SLA", "Edge"],
  },
  {
    id: "network",
    name: { en: "Network, devices and maintenance", ar: "الشبكة والأجهزة والصيانة" },
    description: { en: "Asset manuals, BoM, BoQ, telemetry dictionaries, spare parts, service orders and PO playbooks.", ar: "أدلة الأصول وقوائم المواد والكميات وقواميس القياس وقطع الغيار وأوامر الخدمة وأدلة أوامر الشراء." },
    owner: "Network operations",
    sensitivity: "Confidential",
    documents: 54,
    chunks: 11480,
    usedBy: ["MediaGPT Maintainer", "MediaGPT Sentinel"],
    domains: ["Maintenance", "BoM", "Telemetry"],
  },
  {
    id: "proof",
    name: { en: "Proof-of-play and audit", ar: "إثبات التشغيل والتدقيق" },
    description: { en: "Signed playback evidence, reconciliation logic, audit export format and settlement controls.", ar: "أدلة التشغيل الموقعة ومنطق المطابقة وتنسيقات التصدير وضوابط التسوية." },
    owner: "Audit and reconciliation",
    sensitivity: "Internal",
    documents: 18,
    chunks: 3204,
    usedBy: ["MediaGPT Insights", "MediaGPT Finance"],
    domains: ["Audit", "Ledger", "Settlement"],
  },
  {
    id: "integrations",
    name: { en: "Integrations and data contracts", ar: "التكاملات وعقود البيانات" },
    description: { en: "CMS, ERP, IoT, edge, file import, media library and API payload contracts.", ar: "عقود بيانات إدارة المحتوى وتخطيط الموارد وإنترنت الأشياء والحافة واستيراد الملفات ومكتبة الوسائط والواجهات البرمجية." },
    owner: "Technical Platform Owner",
    sensitivity: "Confidential",
    documents: 31,
    chunks: 6880,
    usedBy: ["MediaGPT Orchestrator", "MediaGPT Insights"],
    domains: ["API", "ERP", "IoT"],
  },
  {
    id: "mediagpt",
    name: { en: "MediaGPT operating manuals", ar: "أدلة تشغيل MediaGPT" },
    description: { en: "Agent boundaries, skill runbooks, prompt contracts, citation requirements and human approval paths.", ar: "حدود الوكلاء وأدلة تشغيل المهارات وعقود الموجهات ومتطلبات الاستشهاد ومسارات الاعتماد البشري." },
    owner: "AI product governance",
    sensitivity: "Confidential",
    documents: 26,
    chunks: 5380,
    usedBy: ["All MediaGPT agents"],
    domains: ["AI", "Skills", "Governance"],
  },
];

export const seedKnowledgeSources: KnowledgeSource[] = [
  {
    id: "KB-GOV-001",
    collectionId: "governance",
    title: { en: "ADMO unified DOOH operating charter", ar: "ميثاق تشغيل منصة الإعلانات الخارجية الموحدة" },
    type: "Policy",
    status: "Indexed",
    owner: "Platform governance",
    version: "v1.0",
    effectiveDate: "2026-07-01",
    sensitivity: "Confidential",
    chunks: 742,
    lastIndexed: "Today 09:22",
    summary: { en: "Defines roles, delegated authority, governance boundaries and client-facing operating principles.", ar: "يحدد الأدوار والصلاحيات وحدود الحوكمة ومبادئ التشغيل أمام العميل." },
    body: { en: "The platform separates bidder workflows from ADMO internal workflows. AI may recommend actions, but named ADMO users approve regulated content, emergency broadcast, finance override and high-impact operational changes.", ar: "تفصل المنصة بين مسارات المزايدين والمسارات الداخلية لمكتب أبوظبي الإعلامي. يمكن للذكاء الاصطناعي أن يوصي بالإجراءات، لكن المستخدمين المسمّين يعتمدون المحتوى المنظم وبث الطوارئ والتجاوزات المالية والتغييرات التشغيلية عالية الأثر." },
    linkedEntities: ["ONT-RULE", "ONT-ACTION", "ONT-SUBMISSION"],
    tags: ["governance", "roles", "approval"],
    citations: ["Section 2.1 Delegated authority", "Section 4.3 AI action limits"],
    usedBy: ["MediaGPT Orchestrator", "MediaGPT Compliance"],
  },
  {
    id: "KB-CRE-001",
    collectionId: "creative",
    title: { en: "Outdoor creative legibility standard", ar: "معيار وضوح المحتوى الخارجي" },
    type: "Policy",
    status: "Indexed",
    owner: "CMS governance",
    version: "v2.4",
    effectiveDate: "2026-06-15",
    sensitivity: "Internal",
    chunks: 684,
    lastIndexed: "Today 08:40",
    summary: { en: "Defines safe text size, contrast, CTA, logo area and motion constraints by road speed and viewing distance.", ar: "يحدد حجم النص الآمن والتباين ومنطقة الدعوة للإجراء والشعار وقيود الحركة حسب سرعة الطريق ومسافة المشاهدة." },
    body: { en: "Highway-facing assets require larger CTA and brand claims than pedestrian panels. CTA text should remain legible at 40m, with minimum contrast 4.5:1 and no essential information below the lower safe band.", ar: "تتطلب الأصول المواجهة للطرق السريعة دعوات إجراء وادعاءات علامة أكبر من لوحات المشاة. يجب أن تبقى الدعوة للإجراء واضحة على مسافة 40 مترًا مع تباين لا يقل عن 4.5:1 وعدم وضع المعلومات الأساسية في النطاق السفلي غير الآمن." },
    linkedEntities: ["ONT-CREATIVE", "ONT-SUBMISSION", "ONT-ASSET"],
    tags: ["legibility", "CTA", "contrast", "highway"],
    citations: ["Clause 3.2 Highway copy", "Table 4 Viewing distance"],
    usedBy: ["MediaGPT Moderator", "MediaGPT Studio"],
  },
  {
    id: "KB-CRE-002",
    collectionId: "creative",
    title: { en: "Arabic-English copy parity guide", ar: "دليل تكافؤ النص العربي والإنجليزي" },
    type: "Manual",
    status: "Indexed",
    owner: "Arabic QA",
    version: "v1.7",
    effectiveDate: "2026-05-20",
    sensitivity: "Internal",
    chunks: 812,
    lastIndexed: "Today 08:35",
    summary: { en: "Terminology, RTL punctuation, public-sector tone and required Arabic parity checks.", ar: "المصطلحات وعلامات الترقيم من اليمين إلى اليسار والنبرة العامة وفحوصات تكافؤ العربية المطلوبة." },
    body: { en: "Arabic copy must not be materially weaker, smaller or less visible than English copy. Civic, emergency and public-interest campaigns are Arabic-first unless a named authority approves otherwise.", ar: "يجب ألا يكون النص العربي أضعف أو أصغر أو أقل ظهورًا من النص الإنجليزي. الحملات المدنية والطوارئ والمصلحة العامة عربية أولًا ما لم تعتمد جهة مخولة خلاف ذلك." },
    linkedEntities: ["ONT-CREATIVE", "ONT-RULE"],
    tags: ["Arabic", "RTL", "parity", "tone"],
    citations: ["Section 1 Arabic-first principle", "Checklist A RTL punctuation"],
    usedBy: ["MediaGPT Compliance", "MediaGPT Moderator"],
  },
  {
    id: "KB-CRE-003",
    collectionId: "creative",
    title: { en: "Rights, copyright and brand safety playbook", ar: "دليل الحقوق وسلامة العلامة" },
    type: "Manual",
    status: "Indexed",
    owner: "Legal and CMS",
    version: "v1.3",
    effectiveDate: "2026-04-10",
    sensitivity: "Confidential",
    chunks: 533,
    lastIndexed: "Yesterday",
    summary: { en: "Checklist for licensed media, talent releases, trademark similarity and restricted symbol detection.", ar: "قائمة تحقق للوسائط المرخصة وإخلاءات المواهب وتشابه العلامات ورصد الرموز المقيدة." },
    body: { en: "Creative packs must include usage rights for image, music, motion, voice and talent. Suspected logo similarity should not block automatically unless rule severity is Critical; it should create a named reviewer task.", ar: "يجب أن تتضمن حزم المحتوى حقوق استخدام الصور والموسيقى والحركة والصوت والمواهب. لا يحظر تشابه الشعار تلقائيًا إلا إذا كانت درجة القاعدة حرجة؛ بل ينشئ مهمة لمراجع محدد." },
    linkedEntities: ["ONT-CREATIVE", "ONT-ACTION"],
    tags: ["rights", "copyright", "logo", "talent"],
    citations: ["Rights matrix R-4", "Trademark escalation note"],
    usedBy: ["MediaGPT Moderator"],
  },
  {
    id: "KB-COM-001",
    collectionId: "commercial",
    title: { en: "2026 DOOH rate card and bid floor model", ar: "بطاقة أسعار 2026 ونموذج حد المزايدة" },
    type: "Rate card",
    status: "Indexed",
    owner: "Commercial finance",
    version: "v3.2",
    effectiveDate: "2026-07-01",
    sensitivity: "Restricted",
    chunks: 618,
    lastIndexed: "Yesterday",
    summary: { en: "Package floor prices, target margin, seasonal uplift and inventory scarcity assumptions.", ar: "حدود أسعار الحزم والهامش المستهدف والزيادات الموسمية وافتراضات ندرة المخزون." },
    body: { en: "Premium roadside and airport packages require finance review when proposed value is below the configured floor, margin falls below target, or campaign requests exclusivity without uplift.", ar: "تتطلب حزم الطرق المميزة والمطار مراجعة مالية عندما تكون القيمة المقترحة دون الحد المحدد أو ينخفض الهامش عن الهدف أو تطلب الحملة حصرية دون زيادة." },
    linkedEntities: ["ONT-BID", "ONT-RULE"],
    tags: ["rate card", "bid floor", "margin"],
    citations: ["Floor table F-2026", "Margin rule 4.1"],
    usedBy: ["MediaGPT Finance", "MediaGPT Optimizer"],
  },
  {
    id: "KB-COM-002",
    collectionId: "commercial",
    title: { en: "Competitive separation and exclusivity terms", ar: "شروط الفصل التنافسي والحصرية" },
    type: "Contract",
    status: "Indexed",
    owner: "Commercial legal",
    version: "v1.6",
    effectiveDate: "2026-03-01",
    sensitivity: "Restricted",
    chunks: 402,
    lastIndexed: "Jun 30, 2026",
    summary: { en: "Rules for same-category brands, sponsor exclusivity, time windows and zone-level separation.", ar: "قواعد العلامات من الفئة نفسها والحصرية والرعايات ونوافذ الوقت والفصل حسب المنطقة." },
    body: { en: "Competitors in the same category should not be scheduled in the same zone takeover window unless the package explicitly allows shared rotation.", ar: "لا ينبغي جدولة المنافسين في الفئة نفسها ضمن نافذة استحواذ المنطقة نفسها إلا إذا سمحت الحزمة صراحة بالتناوب المشترك." },
    linkedEntities: ["ONT-BID", "ONT-SUBMISSION", "ONT-RULE"],
    tags: ["exclusivity", "competitive separation"],
    citations: ["Clause 5 Category separation", "Appendix B shared rotation"],
    usedBy: ["MediaGPT Scheduler", "MediaGPT Finance"],
  },
  {
    id: "KB-EMG-001",
    collectionId: "emergency",
    title: { en: "Emergency broadcast SOP", ar: "إجراء بث الطوارئ" },
    type: "SOP",
    status: "Indexed",
    owner: "Control room",
    version: "v2.0",
    effectiveDate: "2026-06-01",
    sensitivity: "Restricted",
    chunks: 930,
    lastIndexed: "Today 09:05",
    summary: { en: "Authority validation, bilingual payload, SLA, edge route, queue and broadcast controls.", ar: "التحقق من الجهة المخولة والنص ثنائي اللغة ومستوى الخدمة ومسار الحافة وضوابط القائمة والبث." },
    body: { en: "Emergency messages must pass four checks before queue or immediate broadcast: payload validity, Arabic copy review, dual-control authority and protected edge cache readiness.", ar: "يجب أن تمر رسائل الطوارئ بأربع فحوصات قبل وضعها في القائمة أو بثها فورًا: صلاحية الحمولة، مراجعة النص العربي، صلاحية التحكم المزدوج، وجاهزية ذاكرة الحافة المحمية." },
    linkedEntities: ["ONT-ALERT", "ONT-ACTION", "ONT-RULE"],
    tags: ["emergency", "SLA", "authority", "edge"],
    citations: ["Step 2 Dual control", "Step 4 Edge cache"],
    usedBy: ["MediaGPT Orchestrator", "MediaGPT Sentinel"],
  },
  {
    id: "KB-EMG-002",
    collectionId: "emergency",
    title: { en: "CAP-UAE public warning payload template", ar: "قالب حمولة التحذير العام CAP-UAE" },
    type: "Template",
    status: "Indexed",
    owner: "Emergency operations",
    version: "v1.2",
    effectiveDate: "2026-05-01",
    sensitivity: "Internal",
    chunks: 260,
    lastIndexed: "Jun 27, 2026",
    summary: { en: "Required fields for scope, certainty, severity, language bundle, expiry and authority.", ar: "الحقول المطلوبة للنطاق واليقين والشدة وحزمة اللغة والانتهاء والجهة المخولة." },
    body: { en: "A warning payload is not complete without scope, default end time, audience, authority, Arabic text, English text and fallback route.", ar: "لا تكتمل حمولة التحذير دون النطاق ووقت الانتهاء الافتراضي والجمهور والجهة والنص العربي والإنجليزي ومسار الاحتياط." },
    linkedEntities: ["ONT-ALERT"],
    tags: ["CAP", "payload", "template"],
    citations: ["CAP field list", "Expiry defaults"],
    usedBy: ["MediaGPT Orchestrator"],
  },
  {
    id: "KB-NET-001",
    collectionId: "network",
    title: { en: "Premium roadside LED cabinet maintenance manual", ar: "دليل صيانة خزانة LED للطرق المميزة" },
    type: "Manual",
    status: "Indexed",
    owner: "Network operations",
    version: "v4.1",
    effectiveDate: "2026-02-15",
    sensitivity: "Confidential",
    chunks: 1240,
    lastIndexed: "Jun 30, 2026",
    summary: { en: "Component locations, PSU fault diagnosis, cabinet thermal thresholds and safe replacement steps.", ar: "مواقع المكونات وتشخيص أعطال مزود الطاقة وحدود الحرارة وخطوات الاستبدال الآمن." },
    body: { en: "A degraded PSU should be inspected within 24 hours when cabinet temperature exceeds threshold or voltage ripple is unstable. A faulty PSU should create an urgent service order and reserve a spare part.", ar: "يجب فحص مزود الطاقة المتدهور خلال 24 ساعة عند تجاوز حرارة الخزانة أو عدم استقرار تموج الجهد. أما المزود المعطل فينشئ أمر خدمة عاجلًا ويحجز قطعة غيار." },
    linkedEntities: ["ONT-ASSET", "ONT-COMPONENT", "ONT-ACTION"],
    tags: ["PSU", "LED cabinet", "thermal", "service order"],
    citations: ["PSU diagnostic table", "Thermal threshold T-7"],
    usedBy: ["MediaGPT Maintainer", "MediaGPT Sentinel"],
  },
  {
    id: "KB-NET-002",
    collectionId: "network",
    title: { en: "Spare parts PO and SO operating playbook", ar: "دليل أوامر شراء قطع الغيار وأوامر الخدمة" },
    type: "Runbook",
    status: "Indexed",
    owner: "O&M administration",
    version: "v1.9",
    effectiveDate: "2026-06-10",
    sensitivity: "Confidential",
    chunks: 876,
    lastIndexed: "Today 07:50",
    summary: { en: "How asset row, BoM component, PO, SO, ETA and technician state must be linked.", ar: "كيفية ربط صف الأصل ومكون قائمة المواد وأمر الشراء وأمر الخدمة وموعد الوصول وحالة الفني." },
    body: { en: "The asset row is the system of work. Expanding the row should reveal components, their PO/SO status, expected date, owner, dependency and AI action recommendation.", ar: "صف الأصل هو محور العمل. عند توسيعه يجب عرض المكونات وحالة أوامر الشراء والخدمة والتاريخ المتوقع والمالك والتبعية وتوصية الذكاء الاصطناعي." },
    linkedEntities: ["ONT-ASSET", "ONT-COMPONENT", "ONT-ACTION"],
    tags: ["BoM", "PO", "SO", "ETA"],
    citations: ["Work order linkage", "PO escalation clock"],
    usedBy: ["MediaGPT Maintainer"],
  },
  {
    id: "KB-POP-001",
    collectionId: "proof",
    title: { en: "Proof-of-play reconciliation procedure", ar: "إجراء مطابقة إثبات التشغيل" },
    type: "SOP",
    status: "Indexed",
    owner: "Audit and reconciliation",
    version: "v2.6",
    effectiveDate: "2026-06-01",
    sensitivity: "Internal",
    chunks: 588,
    lastIndexed: "Today 09:11",
    summary: { en: "Defines matching tolerance across schedule, edge playback ledger, screen telemetry and campaign invoice.", ar: "يحدد هامش المطابقة بين الجدول وسجل تشغيل الحافة وقياسات الشاشة وفاتورة الحملة." },
    body: { en: "A proof-of-play record must include asset id, campaign id, creative hash, played timestamp, signed edge event and reconciliation state. Missing ledgers create an audit exception.", ar: "يجب أن يحتوي سجل إثبات التشغيل على معرف الأصل والحملة وبصمة التصميم ووقت التشغيل وحدث الحافة الموقّع وحالة المطابقة. السجلات الناقصة تنشئ استثناء تدقيق." },
    linkedEntities: ["ONT-POP", "ONT-ASSET", "ONT-BID"],
    tags: ["proof-of-play", "ledger", "audit"],
    citations: ["Ledger fields", "Mismatch handling"],
    usedBy: ["MediaGPT Insights", "MediaGPT Finance"],
  },
  {
    id: "KB-INT-001",
    collectionId: "integrations",
    title: { en: "CMS submission API contract", ar: "عقد واجهة طلبات إدارة المحتوى" },
    type: "Dataset",
    status: "Indexed",
    owner: "Technical Platform Owner",
    version: "v0.8",
    effectiveDate: "2026-07-01",
    sensitivity: "Confidential",
    chunks: 334,
    lastIndexed: "Today 10:04",
    summary: { en: "Payload schema for bidder submissions, media packs, review states and communications.", ar: "مخطط الحمولة لطلبات المزايدين وحزم الوسائط وحالات المراجعة والمراسلات." },
    body: { en: "Submissions must preserve bidder identity, creative hash, package id, language declaration, rights declaration, budget, requested dates and revision communication history.", ar: "يجب أن تحفظ الطلبات هوية المزايد وبصمة التصميم ومعرف الحزمة وتصريح اللغة والحقوق والميزانية والتواريخ المطلوبة وسجل مراسلات التعديل." },
    linkedEntities: ["ONT-SUBMISSION", "ONT-CREATIVE"],
    tags: ["API", "CMS", "submission"],
    citations: ["Payload schema", "Revision communication object"],
    usedBy: ["MediaGPT Orchestrator"],
  },
  {
    id: "KB-AI-001",
    collectionId: "mediagpt",
    title: { en: "MediaGPT governed action contract", ar: "عقد الإجراءات المحكومة في MediaGPT" },
    type: "Runbook",
    status: "Indexed",
    owner: "AI product governance",
    version: "v1.0",
    effectiveDate: "2026-07-01",
    sensitivity: "Confidential",
    chunks: 702,
    lastIndexed: "Today 09:44",
    summary: { en: "Defines how an AI recommendation becomes an auditable platform action.", ar: "يحدد كيف تتحول توصية الذكاء الاصطناعي إلى إجراء قابل للتدقيق داخل المنصة." },
    body: { en: "Every AI output shown in an operational workflow must include recommendation, confidence, citations, rule hits, allowed action, human approval requirement and audit event.", ar: "كل مخرج ذكاء اصطناعي يظهر في مسار تشغيلي يجب أن يتضمن التوصية والثقة والاستشهادات والقواعد المطابقة والإجراء المسموح ومتطلب الاعتماد البشري وحدث التدقيق." },
    linkedEntities: ["ONT-ACTION", "ONT-RULE", "ONT-KNOWLEDGE"],
    tags: ["MediaGPT", "action", "audit", "citations"],
    citations: ["Action schema", "Citation requirement"],
    usedBy: ["All MediaGPT agents"],
  },
];

export const seedDoohRules: DoohRule[] = [
  {
    id: "RULE-CMS-001",
    title: { en: "Arabic parity is mandatory", ar: "تكافؤ العربية إلزامي" },
    family: "Creative policy",
    scope: "CMS submissions",
    workflowStage: "AI Screening",
    mode: "Enforce",
    status: "Strict",
    severity: "Critical",
    enabled: true,
    condition: { en: "Arabic copy is missing, materially smaller, less visible, or semantically weaker than English.", ar: "النص العربي مفقود أو أصغر أو أقل ظهورًا أو أضعف معنويًا من النص الإنجليزي." },
    action: { en: "Block approval and request bidder revision with exact copy parity notes.", ar: "منع الاعتماد وطلب تعديل من المعلن مع ملاحظات دقيقة حول تكافؤ النص." },
    recommendedAction: "Request bidder changes",
    owner: "CMS governance",
    sourceId: "KB-CRE-002",
    overridePolicy: { en: "Only CMS lead plus delegated ADMO authority may override for non-public-interest campaigns.", ar: "لا يمكن التجاوز إلا من قائد إدارة المحتوى وجهة مخولة من مكتب أبوظبي الإعلامي للحملات غير العامة." },
    effectiveDate: "2026-05-20",
    version: "v1.8",
    aiEffect: { en: "MediaGPT cannot recommend approval until parity passes.", ar: "لا يمكن لـ MediaGPT توصية الاعتماد قبل اجتياز التكافؤ." },
    linkedEntities: ["ONT-SUBMISSION", "ONT-CREATIVE"],
    testCases: [
      { input: "English headline present, Arabic headline missing", expected: "Block" },
      { input: "Arabic and English same message, same visual weight", expected: "Pass" },
    ],
  },
  {
    id: "RULE-CMS-002",
    title: { en: "Highway CTA legibility", ar: "وضوح الدعوة للإجراء على الطرق السريعة" },
    family: "Creative policy",
    scope: "Highway-facing assets",
    workflowStage: "AI Screening",
    mode: "Recommend",
    status: "Active",
    severity: "High",
    enabled: true,
    condition: { en: "CTA, price, warning or primary claim is below legibility threshold for 40m viewing.", ar: "الدعوة للإجراء أو السعر أو التحذير أو الادعاء الرئيسي دون حد الوضوح لمسافة 40 مترًا." },
    action: { en: "Recommend creative adjustment before approval; create bidder message if reviewer confirms.", ar: "اقتراح تعديل التصميم قبل الاعتماد وإنشاء رسالة للمعلن عند تأكيد المراجع." },
    recommendedAction: "Prepare bidder message",
    owner: "CMS governance",
    sourceId: "KB-CRE-001",
    overridePolicy: { en: "Reviewer may approve only for pedestrian or mall panels; highway override requires reason code.", ar: "يمكن للمراجع الاعتماد فقط للوحات المشاة أو المراكز؛ أما تجاوز الطرق السريعة فيتطلب سببًا." },
    effectiveDate: "2026-06-15",
    version: "v2.4",
    aiEffect: { en: "Creates the visible MediaGPT recommendation in CMS review.", ar: "ينشئ توصية MediaGPT الظاهرة في مراجعة إدارة المحتوى." },
    linkedEntities: ["ONT-SUBMISSION", "ONT-ASSET"],
    testCases: [
      { input: "CTA 12% below highway threshold", expected: "Recommend bidder revision" },
      { input: "CTA passes 40m threshold", expected: "No issue" },
    ],
  },
  {
    id: "RULE-CMS-003",
    title: { en: "Rights evidence required", ar: "إثبات الحقوق مطلوب" },
    family: "Creative policy",
    scope: "Media library and submissions",
    workflowStage: "Human Moderation",
    mode: "Enforce",
    status: "Active",
    severity: "High",
    enabled: true,
    condition: { en: "Music, image, video, voice, talent or trademark rights are missing or expired.", ar: "حقوق الموسيقى أو الصورة أو الفيديو أو الصوت أو المواهب أو العلامة مفقودة أو منتهية." },
    action: { en: "Hold approval, request rights evidence and assign legal reviewer.", ar: "تعليق الاعتماد وطلب إثبات الحقوق وتعيين مراجع قانوني." },
    recommendedAction: "Request bidder changes",
    owner: "Legal and CMS",
    sourceId: "KB-CRE-003",
    overridePolicy: { en: "No override for missing talent or music rights.", ar: "لا يوجد تجاوز عند غياب حقوق المواهب أو الموسيقى." },
    effectiveDate: "2026-04-10",
    version: "v1.3",
    aiEffect: { en: "Flags copyright and brand safety checks in deep scan.", ar: "يفعل فحوصات الحقوق وسلامة العلامة في الفحص العميق." },
    linkedEntities: ["ONT-CREATIVE"],
    testCases: [{ input: "Motion pack without music license", expected: "Hold approval" }],
  },
  {
    id: "RULE-COM-001",
    title: { en: "Bid floor and margin guardrail", ar: "حد المزايدة والهامش" },
    family: "Commercial eligibility",
    scope: "Marketplace bids and finance approvals",
    workflowStage: "Finance review",
    mode: "Enforce",
    status: "Active",
    severity: "High",
    enabled: true,
    condition: { en: "Bid value is below floor price or target margin unless civic allocation applies.", ar: "قيمة العرض أقل من حد السعر أو الهامش المستهدف ما لم ينطبق تخصيص مدني." },
    action: { en: "Route to finance approval with recommended counter-bid or package adjustment.", ar: "توجيهه للاعتماد المالي مع اقتراح عرض مضاد أو تعديل الحزمة." },
    recommendedAction: "Send finance review",
    owner: "Commercial finance",
    sourceId: "KB-COM-001",
    overridePolicy: { en: "Finance director may approve with reason code and budget scenario.", ar: "يمكن لمدير المالية الاعتماد مع سبب وسيناريو ميزانية." },
    effectiveDate: "2026-07-01",
    version: "v3.2",
    aiEffect: { en: "Controls bid optimization and finance alerts.", ar: "يضبط تحسين العروض والتنبيهات المالية." },
    linkedEntities: ["ONT-BID"],
    testCases: [{ input: "Premium package bid below floor", expected: "Finance review" }],
  },
  {
    id: "RULE-COM-002",
    title: { en: "Competitive separation", ar: "الفصل التنافسي" },
    family: "Commercial scheduling",
    scope: "Scheduling",
    workflowStage: "Scheduling",
    mode: "Recommend",
    status: "Active",
    severity: "Medium",
    enabled: true,
    condition: { en: "Competing brands are scheduled in the same zone takeover window.", ar: "جدولة علامات متنافسة في نافذة الاستحواذ للمنطقة نفسها." },
    action: { en: "Recommend alternate slot or protected zone split.", ar: "اقتراح خانة بديلة أو تقسيم منطقة محمي." },
    recommendedAction: "Adjust schedule",
    owner: "Commercial finance",
    sourceId: "KB-COM-002",
    overridePolicy: { en: "Commercial lead may override for shared rotation packages.", ar: "يمكن لقائد التجاري التجاوز لحزم التناوب المشترك." },
    effectiveDate: "2026-03-01",
    version: "v1.6",
    aiEffect: { en: "Feeds schedule recommendations and conflicts.", ar: "يغذي توصيات الجدولة والتعارضات." },
    linkedEntities: ["ONT-BID", "ONT-SUBMISSION"],
    testCases: [{ input: "Two perfume brands on same highway loop 18:00", expected: "Recommend alternate slot" }],
  },
  {
    id: "RULE-EMG-001",
    title: { en: "Emergency authority and dual control", ar: "صلاحية الطوارئ والتحكم المزدوج" },
    family: "Emergency override",
    scope: "Alerts and emergencies",
    workflowStage: "Verification",
    mode: "Enforce",
    status: "Strict",
    severity: "Critical",
    enabled: true,
    condition: { en: "Emergency message lacks named authority, bilingual payload, default expiry or dual-control approval.", ar: "رسالة الطوارئ تفتقد الجهة المخولة أو النص ثنائي اللغة أو انتهاء افتراضي أو اعتماد التحكم المزدوج." },
    action: { en: "Block queue and broadcast until MediaGPT checks and named approval pass.", ar: "منع الإدراج والبث حتى اجتياز فحوصات MediaGPT والاعتماد المسمى." },
    recommendedAction: "Run MediaGPT checks",
    owner: "Control room",
    sourceId: "KB-EMG-001",
    overridePolicy: { en: "No AI override. Duty officer and supervisor must approve.", ar: "لا يوجد تجاوز بالذكاء الاصطناعي. يجب اعتماد ضابط المناوبة والمشرف." },
    effectiveDate: "2026-06-01",
    version: "v2.1",
    aiEffect: { en: "Controls emergency verification chain and action buttons.", ar: "يضبط سلسلة تحقق الطوارئ وأزرار الإجراء." },
    linkedEntities: ["ONT-ALERT", "ONT-ACTION"],
    testCases: [{ input: "Alert has scope but no authority", expected: "Block broadcast" }],
  },
  {
    id: "RULE-EMG-002",
    title: { en: "CAP-UAE payload completeness", ar: "اكتمال حمولة CAP-UAE" },
    family: "Emergency override",
    scope: "Alerts and emergencies",
    workflowStage: "Payload validation",
    mode: "Enforce",
    status: "Active",
    severity: "Critical",
    enabled: true,
    condition: { en: "Payload misses scope, certainty, severity, expiry, audience or fallback route.", ar: "الحمولة تفتقد النطاق أو اليقين أو الشدة أو الانتهاء أو الجمهور أو مسار الاحتياط." },
    action: { en: "Generate missing fields as draft and require operator confirmation.", ar: "توليد الحقول الناقصة كمسودة وطلب تأكيد المشغل." },
    recommendedAction: "Complete payload",
    owner: "Emergency operations",
    sourceId: "KB-EMG-002",
    overridePolicy: { en: "Operator may edit generated fields before checks are marked complete.", ar: "يمكن للمشغل تعديل الحقول المولدة قبل اكتمال الفحوصات." },
    effectiveDate: "2026-05-01",
    version: "v1.2",
    aiEffect: { en: "MediaGPT proposes missing emergency fields before queue.", ar: "يقترح MediaGPT حقول الطوارئ الناقصة قبل الإدراج." },
    linkedEntities: ["ONT-ALERT"],
    testCases: [{ input: "Major alert with no expiry", expected: "Generate default expiry" }],
  },
  {
    id: "RULE-NET-001",
    title: { en: "Critical component service escalation", ar: "تصعيد خدمة المكون الحرج" },
    family: "Network maintenance",
    scope: "Network and Devices",
    workflowStage: "Maintenance triage",
    mode: "Recommend",
    status: "Active",
    severity: "High",
    enabled: true,
    condition: { en: "PSU, controller or connectivity module is degraded and tied to an active campaign or emergency zone.", ar: "مزود الطاقة أو وحدة التحكم أو الاتصال متدهورة ومرتبطة بحملة نشطة أو منطقة طوارئ." },
    action: { en: "Recommend urgent SO, reserve spare part and notify control room.", ar: "اقتراح أمر خدمة عاجل وحجز قطعة غيار وإخطار غرفة التحكم." },
    recommendedAction: "Create service order",
    owner: "Network operations",
    sourceId: "KB-NET-001",
    overridePolicy: { en: "Network lead may downgrade only if redundancy is confirmed.", ar: "يمكن لقائد الشبكة خفض الأولوية فقط عند تأكيد وجود احتياط." },
    effectiveDate: "2026-02-15",
    version: "v4.1",
    aiEffect: { en: "Powers maintenance AI recommendations in BoM/SO/PO table.", ar: "يغذي توصيات الصيانة في جدول المكونات وأوامر الخدمة والشراء." },
    linkedEntities: ["ONT-ASSET", "ONT-COMPONENT"],
    testCases: [{ input: "PSU degraded on live highway asset", expected: "Urgent SO recommendation" }],
  },
  {
    id: "RULE-NET-002",
    title: { en: "PO ETA breach escalation", ar: "تصعيد تأخر أمر الشراء" },
    family: "Network maintenance",
    scope: "Spare parts",
    workflowStage: "Procurement",
    mode: "Monitor",
    status: "Active",
    severity: "Medium",
    enabled: true,
    condition: { en: "Expected PO date exceeds service SLA or supplier has not acknowledged within cutoff.", ar: "تاريخ أمر الشراء يتجاوز مستوى الخدمة أو لم يؤكد المورد قبل الموعد المحدد." },
    action: { en: "Recommend supplier escalation, substitute part, or exchange from low-risk asset.", ar: "اقتراح تصعيد المورد أو قطعة بديلة أو تبديل من أصل منخفض المخاطر." },
    recommendedAction: "Escalate PO",
    owner: "O&M administration",
    sourceId: "KB-NET-002",
    overridePolicy: { en: "O&M admin may acknowledge if spare stock is physically confirmed.", ar: "يمكن لمسؤول التشغيل والصيانة التأكيد إذا ثبت توفر المخزون فعليًا." },
    effectiveDate: "2026-06-10",
    version: "v1.9",
    aiEffect: { en: "Generates row-level procurement recommendations.", ar: "ينشئ توصيات شراء على مستوى الصف." },
    linkedEntities: ["ONT-COMPONENT", "ONT-ACTION"],
    testCases: [{ input: "PO ETA after service SLA", expected: "Escalate PO" }],
  },
  {
    id: "RULE-POP-001",
    title: { en: "Proof-of-play signed ledger required", ar: "سجل إثبات التشغيل الموقع مطلوب" },
    family: "Proof and audit",
    scope: "Published campaigns",
    workflowStage: "Reconciliation",
    mode: "Enforce",
    status: "Active",
    severity: "High",
    enabled: true,
    condition: { en: "Edge playback ledger is missing, unsigned or mismatched against schedule.", ar: "سجل تشغيل الحافة مفقود أو غير موقع أو غير مطابق للجدول." },
    action: { en: "Create audit exception and hold final settlement until reconciled.", ar: "إنشاء استثناء تدقيق وتعليق التسوية النهائية حتى المطابقة." },
    recommendedAction: "Open audit exception",
    owner: "Audit and reconciliation",
    sourceId: "KB-POP-001",
    overridePolicy: { en: "No settlement override without signed proof or named audit waiver.", ar: "لا يوجد تجاوز للتسوية دون إثبات موقع أو تنازل تدقيق مسمى." },
    effectiveDate: "2026-06-01",
    version: "v2.6",
    aiEffect: { en: "Controls reconciliation state and finance settlement readiness.", ar: "يضبط حالة المطابقة وجاهزية التسوية المالية." },
    linkedEntities: ["ONT-POP"],
    testCases: [{ input: "Schedule played but edge ledger missing", expected: "Audit exception" }],
  },
  {
    id: "RULE-AI-001",
    title: { en: "AI recommendation must cite sources and allowed action", ar: "توصية الذكاء الاصطناعي يجب أن تستشهد وتحدد الإجراء" },
    family: "AI governance",
    scope: "All MediaGPT workflow outputs",
    workflowStage: "Any AI recommendation",
    mode: "Enforce",
    status: "Strict",
    severity: "Critical",
    enabled: true,
    condition: { en: "AI output is shown without citation, rule hit, confidence or allowed next action.", ar: "يظهر مخرج الذكاء الاصطناعي دون استشهاد أو قاعدة مطابقة أو ثقة أو إجراء تالٍ مسموح." },
    action: { en: "Hide operational action until output is regenerated with governance metadata.", ar: "إخفاء الإجراء التشغيلي حتى يعاد توليد المخرج مع بيانات الحوكمة." },
    recommendedAction: "Regenerate governed answer",
    owner: "AI product governance",
    sourceId: "KB-AI-001",
    overridePolicy: { en: "No override for external-facing or state-changing AI actions.", ar: "لا يوجد تجاوز للإجراءات الخارجية أو التي تغير حالة المنصة." },
    effectiveDate: "2026-07-01",
    version: "v1.0",
    aiEffect: { en: "Sets the pattern for every AI box in the platform.", ar: "يحدد نمط كل صندوق ذكاء اصطناعي في المنصة." },
    linkedEntities: ["ONT-ACTION", "ONT-RULE", "ONT-KNOWLEDGE"],
    testCases: [{ input: "Recommendation without source citation", expected: "Hide action" }],
  },
];

export const ruleSimulationContexts: RuleSimulationContext[] = [
  {
    id: "SIM-CMS-CTA",
    label: { en: "CMS: highway CTA too small", ar: "إدارة المحتوى: دعوة الإجراء صغيرة على الطريق" },
    type: "Submission",
    input: { en: "Yas summer promotion is approved for highway playback, but CTA legibility is below threshold.", ar: "حملة صيف ياس معتمدة للتشغيل على الطريق، لكن وضوح الدعوة للإجراء دون الحد المطلوب." },
    matchingRuleIds: ["RULE-CMS-002", "RULE-AI-001"],
    citedSourceIds: ["KB-CRE-001", "KB-AI-001"],
    recommendation: { en: "Request bidder change: enlarge CTA by 12% before approval.", ar: "طلب تعديل من المعلن: تكبير الدعوة للإجراء 12% قبل الاعتماد." },
    action: { en: "Prepare bidder message", ar: "إعداد رسالة للمعلن" },
    tone: "warn",
  },
  {
    id: "SIM-CMS-AR",
    label: { en: "CMS: Arabic parity missing", ar: "إدارة المحتوى: تكافؤ العربية مفقود" },
    type: "Submission",
    input: { en: "Retail campaign includes English offer and small Arabic disclaimer only.", ar: "حملة تجارية تتضمن عرضًا إنجليزيًا وإخلاء مسؤولية عربيًا صغيرًا فقط." },
    matchingRuleIds: ["RULE-CMS-001", "RULE-CMS-003", "RULE-AI-001"],
    citedSourceIds: ["KB-CRE-002", "KB-CRE-003", "KB-AI-001"],
    recommendation: { en: "Block approval and request full Arabic copy parity plus rights evidence.", ar: "منع الاعتماد وطلب تكافؤ النص العربي كاملًا مع إثبات الحقوق." },
    action: { en: "Request bidder changes", ar: "طلب تعديلات من المعلن" },
    tone: "danger",
  },
  {
    id: "SIM-EMG-AUTH",
    label: { en: "Emergency: authority missing", ar: "الطوارئ: الجهة المخولة مفقودة" },
    type: "Emergency",
    input: { en: "Weather alert has scope and copy but no named authority or dual-control approval.", ar: "تنبيه الطقس يتضمن النطاق والنص لكنه لا يتضمن جهة مخولة أو اعتماد التحكم المزدوج." },
    matchingRuleIds: ["RULE-EMG-001", "RULE-EMG-002", "RULE-AI-001"],
    citedSourceIds: ["KB-EMG-001", "KB-EMG-002", "KB-AI-001"],
    recommendation: { en: "Run MediaGPT checks, require named duty officer and supervisor before broadcast.", ar: "تشغيل فحوصات MediaGPT وطلب ضابط مناوبة ومشرف مسميين قبل البث." },
    action: { en: "Run MediaGPT checks", ar: "تشغيل فحوصات MediaGPT" },
    tone: "danger",
  },
  {
    id: "SIM-BID-FLOOR",
    label: { en: "Finance: bid below floor", ar: "المالية: عرض دون الحد" },
    type: "Bid",
    input: { en: "Premium airport-road package bid is below floor but asks for evening exclusivity.", ar: "عرض حزمة طريق المطار المميزة دون حد السعر ويطلب حصرية مسائية." },
    matchingRuleIds: ["RULE-COM-001", "RULE-COM-002", "RULE-AI-001"],
    citedSourceIds: ["KB-COM-001", "KB-COM-002", "KB-AI-001"],
    recommendation: { en: "Route to finance with counter-bid scenario and remove exclusivity unless uplift is accepted.", ar: "إرساله للمالية مع سيناريو عرض مضاد وإزالة الحصرية ما لم تُقبل الزيادة." },
    action: { en: "Send finance review", ar: "إرساله للمراجعة المالية" },
    tone: "warn",
  },
  {
    id: "SIM-NET-PSU",
    label: { en: "Network: degraded PSU on live asset", ar: "الشبكة: مزود طاقة متدهور على أصل مباشر" },
    type: "Asset",
    input: { en: "Airport Road Premium has PSU warnings while a civic campaign is scheduled.", ar: "أصل طريق المطار المميز لديه تحذيرات مزود طاقة أثناء جدولة حملة مدنية." },
    matchingRuleIds: ["RULE-NET-001", "RULE-NET-002"],
    citedSourceIds: ["KB-NET-001", "KB-NET-002"],
    recommendation: { en: "Create urgent SO, reserve PSU, and escalate PO if supplier does not acknowledge.", ar: "إنشاء أمر خدمة عاجل وحجز مزود طاقة وتصعيد أمر الشراء إذا لم يؤكد المورد." },
    action: { en: "Create service order", ar: "إنشاء أمر خدمة" },
    tone: "warn",
  },
  {
    id: "SIM-POP-MISSING",
    label: { en: "Proof: missing edge ledger", ar: "الإثبات: سجل الحافة مفقود" },
    type: "Proof",
    input: { en: "Campaign invoice is ready but one asset has no signed playback event.", ar: "فاتورة الحملة جاهزة لكن أحد الأصول لا يحتوي على حدث تشغيل موقع." },
    matchingRuleIds: ["RULE-POP-001", "RULE-AI-001"],
    citedSourceIds: ["KB-POP-001", "KB-AI-001"],
    recommendation: { en: "Open audit exception and hold settlement for the affected asset.", ar: "فتح استثناء تدقيق وتعليق التسوية للأصل المتأثر." },
    action: { en: "Open audit exception", ar: "فتح استثناء تدقيق" },
    tone: "danger",
  },
];

export const demoScenarios: DemoScenario[] = [
  {
    id: "SCN-001",
    title: { en: "Bidder creative rejected for Arabic parity", ar: "رفض تصميم المعلن بسبب تكافؤ العربية" },
    persona: "CMS reviewer",
    workflow: "CMS submissions",
    trigger: { en: "New bidder submission with English offer and incomplete Arabic copy.", ar: "طلب جديد من معلن يتضمن عرضًا إنجليزيًا ونصًا عربيًا ناقصًا." },
    rules: ["RULE-CMS-001", "RULE-AI-001"],
    sources: ["KB-CRE-002", "KB-AI-001"],
    outcome: { en: "MediaGPT recommends Request bidder changes and drafts a communication.", ar: "يوصي MediaGPT بطلب تعديلات من المعلن ويعد رسالة." },
    nextAction: { en: "Send bidder message", ar: "إرسال رسالة للمعلن" },
    status: "Ready",
  },
  {
    id: "SCN-002",
    title: { en: "Highway CTA adjustment before approval", ar: "تعديل دعوة الإجراء قبل الاعتماد" },
    persona: "CMS reviewer",
    workflow: "CMS submissions",
    trigger: { en: "CTA below highway legibility threshold.", ar: "دعوة الإجراء دون حد الوضوح للطريق السريع." },
    rules: ["RULE-CMS-002"],
    sources: ["KB-CRE-001"],
    outcome: { en: "Reviewer sees visible AI issue and can prepare bidder message.", ar: "يرى المراجع ملاحظة الذكاء الاصطناعي ويمكنه إعداد رسالة للمعلن." },
    nextAction: { en: "Prepare bidder message", ar: "إعداد رسالة للمعلن" },
    status: "Ready",
  },
  {
    id: "SCN-003",
    title: { en: "Emergency alert blocked before authority validation", ar: "إيقاف تنبيه طارئ قبل تحقق الجهة" },
    persona: "Control room",
    workflow: "Alerts and emergencies",
    trigger: { en: "Alert created without authority and dual approval.", ar: "إنشاء تنبيه دون جهة مخولة واعتماد مزدوج." },
    rules: ["RULE-EMG-001", "RULE-EMG-002"],
    sources: ["KB-EMG-001", "KB-EMG-002"],
    outcome: { en: "Queue and broadcast remain disabled until checks pass.", ar: "تبقى القائمة والبث معطلين حتى اجتياز الفحوصات." },
    nextAction: { en: "Run MediaGPT checks", ar: "تشغيل فحوصات MediaGPT" },
    status: "Ready",
  },
  {
    id: "SCN-004",
    title: { en: "Marketplace bid routed to finance", ar: "توجيه عرض السوق إلى المالية" },
    persona: "Finance",
    workflow: "Financials",
    trigger: { en: "Bid below rate-card floor with exclusivity request.", ar: "عرض دون حد السعر مع طلب حصرية." },
    rules: ["RULE-COM-001", "RULE-COM-002"],
    sources: ["KB-COM-001", "KB-COM-002"],
    outcome: { en: "Finance receives counter-bid and package adjustment recommendation.", ar: "تتلقى المالية توصية بعرض مضاد وتعديل الحزمة." },
    nextAction: { en: "Approve, hold or reject", ar: "اعتماد أو تعليق أو رفض" },
    status: "Ready",
  },
  {
    id: "SCN-005",
    title: { en: "Competitive separation scheduling conflict", ar: "تعارض جدولة بسبب الفصل التنافسي" },
    persona: "CMS scheduler",
    workflow: "Scheduling",
    trigger: { en: "Two competing brands request same zone takeover window.", ar: "طلبت علامتان متنافستان نافذة الاستحواذ للمنطقة نفسها." },
    rules: ["RULE-COM-002"],
    sources: ["KB-COM-002"],
    outcome: { en: "MediaGPT recommends alternate slot and records the reason.", ar: "يوصي MediaGPT بخانة بديلة ويسجل السبب." },
    nextAction: { en: "Adjust schedule", ar: "تعديل الجدول" },
    status: "Draft",
  },
  {
    id: "SCN-006",
    title: { en: "Degraded PSU creates SO and PO recommendation", ar: "مزود طاقة متدهور ينشئ توصية أمر خدمة وشراء" },
    persona: "Network operations",
    workflow: "Network and Devices",
    trigger: { en: "Live roadside asset reports degraded PSU and PO acknowledgement delay.", ar: "أصل طريق مباشر يبلغ عن تدهور مزود الطاقة وتأخر تأكيد أمر الشراء." },
    rules: ["RULE-NET-001", "RULE-NET-002"],
    sources: ["KB-NET-001", "KB-NET-002"],
    outcome: { en: "AI recommends urgent SO, PO escalation and spare reservation.", ar: "يوصي الذكاء الاصطناعي بأمر خدمة عاجل وتصعيد أمر الشراء وحجز قطعة غيار." },
    nextAction: { en: "Create service order", ar: "إنشاء أمر خدمة" },
    status: "Ready",
  },
  {
    id: "SCN-007",
    title: { en: "Proof-of-play missing ledger holds settlement", ar: "سجل إثبات تشغيل مفقود يعلق التسوية" },
    persona: "Finance and audit",
    workflow: "Proof-of-play reconciliation",
    trigger: { en: "One asset has no signed playback evidence.", ar: "أحد الأصول لا يحتوي على دليل تشغيل موقع." },
    rules: ["RULE-POP-001"],
    sources: ["KB-POP-001"],
    outcome: { en: "Audit exception is opened and invoice settlement is held.", ar: "يتم فتح استثناء تدقيق وتعليق تسوية الفاتورة." },
    nextAction: { en: "Open audit exception", ar: "فتح استثناء تدقيق" },
    status: "Draft",
  },
  {
    id: "SCN-008",
    title: { en: "AI recommendation hidden without citation", ar: "إخفاء توصية الذكاء الاصطناعي دون استشهاد" },
    persona: "Platform admin",
    workflow: "MediaGPT governance",
    trigger: { en: "Agent output proposes an action without source, rule and confidence.", ar: "مخرج الوكيل يقترح إجراءً دون مصدر وقاعدة وثقة." },
    rules: ["RULE-AI-001"],
    sources: ["KB-AI-001"],
    outcome: { en: "Operational action is hidden until answer is regenerated with governance metadata.", ar: "يُخفى الإجراء التشغيلي حتى يعاد توليد الإجابة مع بيانات الحوكمة." },
    nextAction: { en: "Regenerate governed answer", ar: "إعادة توليد إجابة محكومة" },
    status: "Ready",
  },
];
