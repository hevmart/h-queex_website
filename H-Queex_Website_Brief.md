# H-Queex Website Brief (for build reference)

## 1) Brand Core

**One-sentence definition of H-Queex:**
H-Queex is a remote-first process improvement and operational engineering consultancy for Irish SMEs, delivering documented, digitised, and sustained operational systems through a six-stage proprietary methodology informed by Six Sigma principles.

**Promise/value proposition:**
Tools generate options. H-Queex delivers outcomes: named professional accountability, mathematically grounded process design, and finished implementation applied to a specific business, not generic suggestions handed back for someone else to execute.

**What clients should feel after visiting the site:**
That the business is precise, credible, and operating at a professional standard, led by a single accountable expert rather than a junior team, and that engaging H-Queex is a low-friction, structured, and safe decision even though delivery is entirely remote.

---

## 2) Ideal Client

**Primary client type:**
Irish small and medium enterprises, across sectors rather than limited to one industry, that are still largely founder-led or reliant on informal, undocumented ways of working.

**Their top 3 pain points:**
1. Operational knowledge lives in people's heads rather than in structured, repeatable documentation, creating key-person dependency.
2. Manual or ad hoc workflows create inefficiency and inconsistency as the business grows.
3. Digital tools have been adopted piecemeal, if at all, without a coherent system connecting process to technology.

**Why they choose H-Queex over alternatives:**
Over generalist business consultants, because H-Queex applies an engineering-led methodology and delivers finished implementation rather than advice alone. Over generic AI tools, because H-Queex applies named professional judgement, validation, and accountability to a specific business, rather than producing generic outputs the client must interpret and implement themselves.

---

## 3) Service Model

**Main services/packages:**
- **Clarity Base** — entry-point assessment covering process documentation and knowledge mapping.
- **Clarity Plus** — project-based workflow architecture, process design, and digital systems integration.
- **Clarity Partner** — ongoing advisory retainer for continued performance monitoring.

**What is included in each:**
- *Clarity Base:* current-state process mapping, identification of bottlenecks and waste, and a structured knowledge base or SOP set as the primary deliverable.
- *Clarity Plus:* future-state workflow design, translation of that design into a documented source of truth, and implementation of supporting digital tools so the new process runs with less manual effort.
- *Clarity Partner:* ongoing monitoring against the implemented system, periodic reporting, and adjustments to prevent drift over time.

**Delivery timeline (typical start to finish):**
Not yet finalised; confirm before publishing. Suggested placeholder: Clarity Base as a defined short engagement (e.g. 2 to 4 weeks), Clarity Plus scoped per project, Clarity Partner as an open-ended monthly retainer.

---

## 4) Remote-First Workflow (very important)

- **Step 1 (lead submits form):** prospective client completes a structured intake form on the website describing their business and current operational challenges.
- **Step 2 (qualification/auto-response):** submission triggers an automatic acknowledgement, and the enquiry is reviewed to confirm fit before a proposal is issued.
- **Step 3 (client portal creation):** on engagement, a private client portal is created for structured document exchange and project tracking.
- **Step 4 (client uploads forms/videos/docs):** client uploads relevant process documentation, screen recordings, or supporting files through the portal for review.
- **Step 5 (analysis/report delivery):** H-Queex analyses the submitted material and delivers findings, process maps, or documentation through the portal.
- **Step 6 (follow-up/retainer/next cycle):** engagement concludes with either project sign-off or transition into a Clarity Partner retainer for ongoing monitoring.

*Note: portal platform and exact mechanics are not yet finalised; confirm before this is built literally, since the workflow above is a reasonable default based on the remote-first model rather than a confirmed technical spec.*

---

## 5) Portal Details

**What clients can do in portal:** upload documents and files, view delivered reports or process maps, and message H-Queex asynchronously. *(To be confirmed.)*

**What H-Queex can do in portal:** review submitted materials, upload deliverables, and track engagement status. *(To be confirmed.)*

**Required data fields:** company name, contact name, sector, company size, brief description of the operational challenge. *(To be confirmed.)*

**File types clients upload:** documents (PDF, Word, Excel) and video (screen recordings of current processes) are the most likely formats, given the remote-first, asynchronous model. *(To be confirmed.)*

**Security/privacy expectations:** enterprise-grade handling of client business intelligence, and compliance with GDPR and applicable Irish data protection requirements for any personal data collected.

---

## 6) No-Call Policy

**Zero calls by default:** to be confirmed. The business model is asynchronous and digital-first, which is consistent with a no-call default, but this has not been explicitly confirmed.

**If yes, async channels used:** forms, portal messaging, and structured written reports; asynchronous video updates are a plausible addition given the process-mapping nature of the work.

**Exceptions where calls are allowed:** to be confirmed (for example, an initial scoping call, or calls only at Clarity Partner tier).

---

## 7) Website Goals

**Primary conversion goal:** submission of the structured intake form to begin a Clarity Base engagement.

**Secondary goal:** newsletter or update signup, or a downloadable overview of the Clarity methodology, to capture visitors not yet ready to engage.

**Must-have pages/sections:** Home, About/Founder, Services (Clarity Base / Plus / Partner), Methodology (the six-stage system), Contact/Intake form, Privacy policy.

**Must-avoid elements:** live chat widgets or booking calendars that imply calls are the default entry point; any language implying "junior" delivery staff; any direct naming of specific client sectors, named clients, or specific software vendors (e.g. no naming of particular platforms — use "digital tools" generically); the words "boutique," "premium" as a descriptor, or "scale" used as a verb; dashes used as punctuation; second-person "you/your" framing describing how H-Queex itself works (the intake form can naturally address the visitor, but descriptions of H-Queex should stay third person).

---

## 8) Trust & Proof

**Case studies/results that can be published:** none yet at launch. Site should be designed so a case studies section can be added post-launch without restructuring.

**Certifications/methodologies:** Lean Six Sigma Green Belt certification and Executive MBA are confirmed and can be published. The six-stage Clarity methodology should be described in plain language on the Methodology page rather than through consulting jargon (avoid terms like "Gemba").

**Testimonials available:** no, not yet at launch.

---

## 9) Operational Constraints

**Tools currently in use:** to be confirmed before specifying to Copilot; do not assume a specific stack (e.g. Airtable, Notion, Power Automate) without confirmation, and do not name specific vendor platforms in any client-facing copy.

**Budget sensitivity positioning:** to be confirmed. Note that "premium" should not be used as a descriptor per H-Queex's writing rules; if a market position needs to be conveyed, use language grounded in accountability, precision, and finished implementation rather than a price-tier label.

**Legal text needed:** privacy policy (GDPR-compliant) and terms of service/engagement terms are required at minimum. Data processing terms for the client portal should be included once portal mechanics are confirmed.

---

### Open items to confirm before finalising this brief for Copilot
1. Exact delivery timelines per tier.
2. Portal platform/mechanics and confirmed data fields and file types.
3. No-call policy default and any exceptions.
4. Current toolset in use internally (for build reference only, not for client-facing copy).
5. Budget/positioning language.

---

## 10) Website Editing Workflow (operational note)

Use this sequence for predictable content updates:

1. Edit source text using the stable editor entry points: content-editor.html or content-editor-replica.html.
2. Save in the editor, then refresh the target page normally.
3. If preview behaves unexpectedly, restart localhost server with scripts/start-localhost-server.ps1.
4. Keep production-facing copy changes in content-model.json aligned with visible section intent.
5. Preserve visual consistency by avoiding one-off "featured" styles unless intentionally approved.
6. Use content-editor.html for portal text and portal runtime copy; use content-editor-replica.html for the homepage visual replica only.
