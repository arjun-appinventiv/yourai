// ─── Sample vault doc content ──────────────────────────────────────
//
// Real text for the seeded vault documents so the bot can actually
// analyse them when an attorney clicks "Use" on one of them. Without
// this, vault docs are metadata-only and the bot can only reference
// them by name. With this, follow-up questions like "what's the
// indemnification cap in the Acme MSA?" return a real answer.
//
// Each entry's `id` matches the corresponding entry id in
// DEFAULT_DOCUMENT_VAULT. Strings are illustrative — patterned after
// common contract / handbook / term-sheet shapes so the bot has
// concrete clauses to cite. Not for legal use; for product demos only.

export const SAMPLE_VAULT_CONTENT: Record<string, string> = {

  // ─── id: 1 — MSA — Acme Corp ──────────────────────────────────────
  '1': `MASTER SERVICES AGREEMENT

This Master Services Agreement ("Agreement") is entered into as of March 14, 2026 ("Effective Date") by and between:

Acme Corporation, a Delaware corporation with its principal place of business at 110 Bridge Plaza, San Francisco, CA 94105 ("Customer"), and

Marsh, Bell & Co. LLP, a New York limited liability partnership with its principal place of business at 200 Park Avenue, New York, NY 10166 ("Provider").

1. SERVICES

1.1  Provider will perform the legal services described in one or more Statements of Work ("SOWs") executed by both parties and incorporated by reference. Each SOW shall identify the scope, deliverables, fees, and timeline.

1.2  Provider shall perform the Services in a professional and workmanlike manner consistent with industry standards applicable to firms of similar size and practice profile.

2. FEES AND PAYMENT

2.1  Fees. Customer shall pay Provider the fees set forth in the applicable SOW. Standard hourly rates are: Partner $1,150; Senior Counsel $850; Associate $625; Paralegal $375.

2.2  Invoicing. Provider will invoice Customer monthly. Invoices are due Net 30. Amounts not paid within 30 days bear interest at 1.0% per month or the maximum rate permitted by law, whichever is lower.

2.3  Expenses. Customer will reimburse Provider for reasonable, documented out-of-pocket expenses (filing fees, transcripts, expert witness fees, travel >$200) approved in writing in advance. Travel under $200 does not require pre-approval.

3. TERM AND TERMINATION

3.1  Term. This Agreement commences on the Effective Date and continues for an initial term of two (2) years, automatically renewing for successive one-year terms unless either party gives 60 days written notice of non-renewal.

3.2  Termination for Convenience. Either party may terminate this Agreement or any SOW for any reason on 30 days' written notice. Upon termination, Customer shall pay for all Services performed through the termination date.

3.3  Termination for Cause. Either party may terminate immediately on written notice if the other party (a) materially breaches this Agreement and fails to cure within 15 days of notice, or (b) becomes insolvent, files for bankruptcy, or makes an assignment for the benefit of creditors.

4. CONFIDENTIALITY

4.1  "Confidential Information" means any non-public information disclosed by one party to the other in connection with the Services, including business plans, financial information, customer lists, and the existence and terms of this Agreement.

4.2  The receiving party shall (a) use Confidential Information solely to perform under this Agreement, (b) protect it with the same degree of care it uses for its own confidential information of like importance (and no less than reasonable care), and (c) limit disclosure to employees, agents, and subcontractors with a need to know who are bound by confidentiality obligations no less protective than these.

4.3  Confidentiality obligations survive termination for a period of five (5) years, except that obligations relating to trade secrets continue for as long as such information remains a trade secret under applicable law.

5. INTELLECTUAL PROPERTY

5.1  Pre-existing IP. Each party retains ownership of its pre-existing intellectual property.

5.2  Work Product. All deliverables created by Provider for Customer under an SOW ("Work Product") shall be owned by Customer upon full payment of fees. Provider hereby assigns all right, title, and interest in the Work Product to Customer.

5.3  Provider Tools. Notwithstanding Section 5.2, Provider retains ownership of pre-existing templates, methodologies, knowledge management systems, and engagement know-how. Provider grants Customer a non-exclusive, perpetual, royalty-free license to use such Provider Tools to the extent embedded in Work Product.

6. INDEMNIFICATION

6.1  Provider Indemnity. Provider shall defend, indemnify, and hold harmless Customer from any third-party claim that Work Product infringes a U.S. patent, copyright, or trademark, provided Customer (a) gives prompt written notice, (b) allows Provider to control the defense, and (c) reasonably cooperates.

6.2  Customer Indemnity. Customer shall defend, indemnify, and hold harmless Provider from any third-party claim arising out of Customer's materials or instructions to Provider, except to the extent caused by Provider's gross negligence or willful misconduct.

6.3  IP Indemnity Exclusions. Provider has no obligation under Section 6.1 for claims arising from (a) modifications not made by Provider, (b) combination with materials not provided by Provider, or (c) Customer's failure to use updated versions made available by Provider.

7. LIMITATION OF LIABILITY

7.1  EXCEPT FOR BREACH OF CONFIDENTIALITY (SECTION 4), INDEMNIFICATION (SECTION 6), OR GROSS NEGLIGENCE OR WILLFUL MISCONDUCT, EACH PARTY'S TOTAL CUMULATIVE LIABILITY UNDER THIS AGREEMENT SHALL NOT EXCEED THE FEES PAID BY CUSTOMER TO PROVIDER IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.

7.2  IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS OR REVENUES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

7.3  NOTE: Section 6.1 (third-party IP indemnity) is UNCAPPED. This is a deviation from Provider's standard form, accepted in negotiation on January 22, 2026 and flagged for partner review.

8. WARRANTIES

8.1  Mutual. Each party represents and warrants that (a) it has the corporate power and authority to enter into this Agreement, (b) execution does not conflict with any other agreement, and (c) the person signing has authority to bind the party.

8.2  Provider Warranty. Provider warrants that Services will be performed in a professional and workmanlike manner. Customer's exclusive remedy for breach of this warranty is re-performance of the deficient Services at no additional charge.

8.3  Disclaimer. EXCEPT AS EXPRESSLY SET FORTH HEREIN, PROVIDER DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.

9. GENERAL

9.1  Governing Law. This Agreement is governed by the laws of the State of New York, without regard to conflict-of-law principles.

9.2  Disputes. Any dispute arising under this Agreement shall be resolved by binding arbitration administered by JAMS in New York, NY, before a single arbitrator. Each party shall bear its own costs and attorneys' fees.

9.3  Notices. Notices shall be in writing and delivered by certified mail or overnight courier to the addresses above, or to such other address as a party may designate in writing.

9.4  Force Majeure. Neither party is liable for failure to perform due to causes beyond its reasonable control, including acts of God, war, terrorism, pandemic, government action, or supply chain disruption affecting the legal services industry generally.

9.5  Assignment. Neither party may assign this Agreement without the other's prior written consent, except that either party may assign to a successor in connection with a merger, acquisition, or sale of substantially all assets, on notice to the other party.

9.6  Entire Agreement. This Agreement, together with all SOWs, constitutes the entire agreement between the parties on the subject matter and supersedes all prior agreements and understandings.

9.7  Amendments. Amendments must be in writing and signed by both parties.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.

ACME CORPORATION                              MARSH, BELL & CO. LLP
By: /s/ Jane Resnick                          By: /s/ Ryan Melade
Name: Jane Resnick                            Name: Ryan Melade
Title: General Counsel                        Title: Managing Partner

`,

  // ─── id: 2 — Employee Handbook 2026 ──────────────────────────────
  '2': `EMPLOYEE HANDBOOK — 2026 EDITION

Effective: January 30, 2026
Version: 12.4
Issued by: Marsh, Bell & Co. LLP — People Operations

WELCOME

This Handbook describes the employment policies, benefits, and conduct expectations applicable to all employees of Marsh, Bell & Co. LLP ("the Firm"). It supersedes all prior versions. Receipt and acknowledgment is required as a condition of continued employment.

1. EMPLOYMENT BASICS

1.1  At-Will Employment. Employment with the Firm is at-will. Either you or the Firm may terminate the employment relationship at any time, with or without cause or notice, subject to the terms of any individual employment agreement.

1.2  Equal Employment Opportunity. The Firm prohibits discrimination on the basis of race, color, religion, national origin, ancestry, age, sex, gender identity, sexual orientation, marital status, pregnancy, disability, veteran status, or any other characteristic protected by applicable law.

1.3  Background Checks. All offers of employment are contingent on satisfactory completion of a background check, including verification of academic credentials, bar status (where applicable), and criminal history (where permitted by law).

2. WORK SCHEDULE AND COMPENSATION

2.1  Work Schedule. Standard business hours are 9:00 AM to 6:00 PM, Monday through Friday, in the office to which you are assigned. The Firm operates flexibly: in-office presence is required Tuesday through Thursday; Monday and Friday may be worked remotely with manager approval.

2.2  Billable Hours Expectation. Attorneys are expected to record at least 1,950 billable hours per fiscal year. Failure to meet the target without documented justification may affect bonus eligibility but is not, by itself, grounds for termination.

2.3  Overtime. Non-exempt employees will be paid overtime in accordance with applicable law for hours worked in excess of 40 per week. Overtime must be approved in advance.

3. PAID TIME OFF

3.1  Vacation. Full-time employees accrue vacation as follows:
   • Years 1–3: 20 days per year (1.67 days per month)
   • Years 4–7: 25 days per year (2.08 days per month)
   • Years 8+:  30 days per year (2.50 days per month)

3.2  Sick Leave. Employees accrue 10 days of sick leave per year. Unused sick leave does not roll over but may be donated to colleagues facing extended illness.

3.3  Parental Leave. Birth, adoptive, and foster parents are eligible for 16 weeks of paid parental leave following an event, in addition to any short-term disability for birth parents. Leave may be taken in two blocks within the first year.

3.4  Bereavement. Up to 5 paid days for the loss of an immediate family member; 1 paid day for the loss of an extended family member or close colleague.

3.5  Jury Duty. Paid in full, with no reduction in PTO accrual, for the duration of jury service.

3.6  Carryover. Up to 10 days of unused vacation may be carried into the next calendar year. Excess unused vacation is forfeited unless expressly approved in writing by the COO.

4. REMOTE AND HYBRID WORK

4.1  Eligibility. Hybrid work (Mon/Fri remote) is available to all employees in good standing after 90 days. Fully remote arrangements require partner approval and are reviewed annually.

4.2  Equipment. The Firm provides a laptop, monitor, and ergonomic accessories on request. Home office stipend: $500 one-time, $200/year ongoing.

4.3  Confidentiality at Home. Remote workspaces must be enclosed and not visible to unauthorized persons (including household members). Use of public Wi-Fi for client work requires Firm VPN.

4.4  Time Zones. Employees working from a time zone more than 3 hours from their assigned office must coordinate availability windows with their team weekly.

5. CONDUCT AND ETHICS

5.1  Professional Conduct. Employees are expected to maintain the highest standards of professional ethics, including those imposed by the bar of the relevant jurisdiction (for attorneys) and the New York Rules of Professional Conduct.

5.2  Conflicts of Interest. Employees must disclose any actual or potential conflict of interest to the General Counsel as soon as it arises. The Firm maintains a conflicts database and runs new-matter checks at intake.

5.3  Outside Activities. Employees may engage in outside legal work, teaching, writing, or board service only with prior written approval from a partner. Pro bono work coordinated through the Firm's pro bono program does not require separate approval.

5.4  Anti-Harassment. Sexual harassment, bullying, and any form of discriminatory conduct are strictly prohibited. The Firm provides multiple reporting channels: direct manager, People Operations, an anonymous hotline (1-800-555-MBCO), or the Managing Partner directly.

6. INTELLECTUAL PROPERTY AND CONFIDENTIALITY

6.1  Client Confidentiality. All client information is protected by attorney-client privilege and the Firm's confidentiality obligations. Disclosure outside the Firm — including to family members, on social media, or in casual conversation — is prohibited except as authorized.

6.2  Work Product. All work product created in the course of employment is the property of the Firm. This includes legal memoranda, briefs, opinions, deal documents, and internal templates.

6.3  Bring-Your-Own-Device. Personal devices used for Firm work must be enrolled in the Firm's mobile device management (MDM) system. The Firm reserves the right to remotely wipe Firm data from personal devices upon separation.

7. TECHNOLOGY POLICIES

7.1  Acceptable Use. Firm systems are for Firm work. Incidental personal use is permitted if it does not interfere with productivity, consume excessive resources, or violate other policies.

7.2  AI Tools. The Firm has approved YourAI for general legal research, document review, and drafting assistance. Use of unapproved AI tools (including consumer ChatGPT, Claude.ai web app, or Gemini) for client work is prohibited. All client matters fed into AI must use the Firm-licensed platform with audit logging enabled.

7.3  Email and Communication Records. All Firm email and instant messaging is subject to retention, monitoring, and discovery. Employees should have no expectation of privacy in Firm-system communications.

8. SEPARATION

8.1  Notice. The Firm requests 30 days' notice of voluntary departure (60 days for partners). Notice may be waived by the Firm in its discretion.

8.2  Return of Property. On separation, all Firm property — laptops, badges, key cards, mobile devices, files (paper and electronic) — must be returned.

8.3  Post-Employment Restrictions. Employees are subject to a 12-month non-solicitation of clients and employees, a 6-month non-compete in their primary practice geography, and perpetual confidentiality obligations as set forth in their individual employment agreement.

ACKNOWLEDGMENT

By signing below, I acknowledge that I have received a copy of the 2026 Employee Handbook, understand that it does not constitute an employment contract, and agree to abide by its policies as a condition of my continued employment.

Signature: _______________________   Date: _______________
Print Name: _____________________

`,

  // ─── id: 3 — Series B Term Sheet ─────────────────────────────────
  '3': `TERM SHEET FOR SERIES B PREFERRED STOCK FINANCING

This non-binding Term Sheet outlines the principal terms of the proposed Series B Preferred Stock financing of Northstar Robotics, Inc. ("Company"). Except for the Confidentiality, Exclusivity, and Expenses sections (which are binding), this Term Sheet is for discussion purposes only and does not constitute an offer or commitment.

Date: February 22, 2026
Company: Northstar Robotics, Inc., a Delaware corporation
Lead Investor: Ridgeline Ventures, LP
Round: Series B Preferred Stock

OFFERING TERMS

Pre-money Valuation: $180,000,000 fully diluted, including an unallocated post-money option pool equal to 12.0% of post-money fully diluted capitalization.

Post-money Valuation: $230,000,000

Amount Raised: $50,000,000

   Lead Investor (Ridgeline Ventures): $30,000,000
   Other New Investors: $15,000,000
   Existing Investors (pro rata): $5,000,000

Price per Share: $4.62 (subject to adjustment based on final option pool sizing)

Capitalization: After the financing, the Company's fully diluted capitalization will be approximately:
   Founders & Team: 38.5%
   Series Seed Preferred: 7.0%
   Series A Preferred: 19.5%
   Series B Preferred: 21.7%
   Option Pool (post-financing): 12.0%
   Convertible Notes (converted): 1.3%

DIVIDENDS

The Series B Preferred shall accrue cumulative dividends at 6% per annum, payable when, as, and if declared by the Board, and prior to any dividend on Common Stock. Dividends are payable in cash or shares at the Company's option upon a Liquidation Event.

LIQUIDATION PREFERENCE

1× non-participating liquidation preference. Series B Preferred holders shall receive the greater of (i) their original investment plus accrued and unpaid dividends, or (ii) the amount they would receive on an as-converted-to-Common basis. Series A and Series Seed Preferred shall remain on their existing 1× non-participating preference. All Preferred ranks pari passu in liquidation, with no senior or junior tranches.

CONVERSION

The Series B Preferred shall be convertible at any time at the option of the holder into Common Stock at the Conversion Price (initially equal to the Original Issue Price), subject to broad-based weighted-average anti-dilution adjustments for issuances below the Conversion Price.

Mandatory conversion on a Qualified IPO ($75M minimum primary proceeds, $1.5B minimum post-money valuation) or with the consent of holders of a majority of the outstanding Preferred Stock.

VOTING RIGHTS

Series B Preferred votes on an as-converted basis with Common Stock, except as required by law or as set forth in the Protective Provisions.

PROTECTIVE PROVISIONS

So long as at least 50% of the Series B Preferred remains outstanding, the Company shall not, without the consent of the holders of a majority of the outstanding Series B Preferred:

(a) Amend the Company's certificate of incorporation in a way that adversely affects the Series B Preferred;
(b) Authorize or issue equity senior to or pari passu with the Series B Preferred;
(c) Declare or pay dividends other than as provided in this Term Sheet;
(d) Effect a Deemed Liquidation Event (sale of substantially all assets, merger where Company is not the surviving entity, or change of control);
(e) Increase the size of the Board beyond seven (7) members;
(f) Incur indebtedness in excess of $5,000,000 outside the ordinary course of business.

BOARD OF DIRECTORS

The Board shall consist of seven (7) members:
   2 — Common (CEO and one designee)
   1 — Series Seed (existing)
   1 — Series A (existing)
   1 — Series B (Ridgeline designee)
   2 — Independent (mutually agreed by the Common and Preferred majorities)

Observer seat for the second-largest Series B investor.

INFORMATION RIGHTS

Major Investors (defined as holders of at least 1,000,000 shares of Preferred) receive standard information rights: audited annual financials, unaudited quarterly financials, monthly management reports, annual budget, and inspection rights.

REGISTRATION RIGHTS

Standard demand and Form S-3 registration rights, plus piggyback rights, all subject to standard underwriter cutbacks and a 180-day post-IPO lockup.

RIGHT OF FIRST REFUSAL / PRO RATA RIGHTS

Major Investors shall have a contractual pro rata right to participate in future financings on a pro-rata basis, plus a right of first refusal on transfers of Common Stock by founders.

DRAG-ALONG

Founders, holders of a majority of the Preferred (voting together as a class), and the Board may require all stockholders to vote in favor of a Sale of the Company that meets specified threshold conditions (including a minimum return of 1× to the Series B Preferred).

VESTING

Founder shares re-vest in connection with this financing on the following schedule: 25% upon closing, with the remaining 75% vesting monthly over 36 months. Double-trigger acceleration on a Sale of the Company (12-month window).

Employee options vest over 4 years with a 1-year cliff (standard).

EXPENSES

The Company shall reimburse the Lead Investor for reasonable legal expenses up to $75,000.

EXCLUSIVITY (BINDING)

The Company agrees, for a period of 30 days from countersignature of this Term Sheet, not to solicit, encourage, or accept any other offer for an equity financing of more than $5 million.

CONFIDENTIALITY (BINDING)

The existence and terms of this Term Sheet are confidential and shall not be disclosed to any third party (other than to officers, directors, employees, attorneys, and accountants on a need-to-know basis) without the consent of the Lead Investor and the Company.

CLOSING CONDITIONS

(a) Satisfactory completion of legal, financial, technical, and commercial due diligence;
(b) Negotiation and execution of definitive documents based on the most recent NVCA model documents (with modifications consistent with this Term Sheet);
(c) Approval of the financing by the Board and stockholders of the Company.

Anticipated closing: April 15, 2026.

ACCEPTED AND AGREED:

NORTHSTAR ROBOTICS, INC.                      RIDGELINE VENTURES, LP
By: ____________________                      By: ____________________
Name: Maria Soto                              Name: David Park
Title: CEO                                    Title: General Partner

Date: _______________                          Date: _______________

`,

};

// ─── Optional sample docs added to the Acme Corp / MSA & Schedules
// nested folder so the demo's nested structure has real content too. ─
export const SAMPLE_VAULT_NESTED_DOCS = [
  {
    id: 'doc-acme-msa-schedule-a',
    name: 'MSA Schedule A — Service Levels',
    description: 'SLA definitions, response-time tiers, and credit calculations referenced in §3.4 of the Acme MSA.',
    fileName: 'MSA_Acme_ScheduleA_SLAs.pdf',
    fileSize: '0.4 MB',
    createdAt: 'Mar 14, 2026',
    ownerId: 'user-ryan',
    ownerName: 'Ryan Melade',
    isGlobal: true,
    folderId: 'fld-acme-msa',
    content: `SCHEDULE A — SERVICE LEVELS

This Schedule A is incorporated into the Master Services Agreement dated March 14, 2026 between Acme Corporation and Marsh, Bell & Co. LLP.

1. RESPONSE TIME TIERS

Tier 1 (Urgent): TRO motions, deadline-driven filings within 48 hours, regulatory inquiries with statutory response windows.
   Initial response: within 1 business hour during business days, 4 business hours otherwise.
   Substantive response: within 4 business hours.

Tier 2 (High Priority): Material contract negotiations, discovery deadlines beyond 48 hours, settlement responses.
   Initial response: within 4 business hours.
   Substantive response: within 1 business day.

Tier 3 (Standard): Routine matters, advisory questions, contract review without imminent deadline.
   Initial response: within 1 business day.
   Substantive response: within 3 business days.

2. SERVICE CREDITS

If Provider fails to meet the applicable response time on more than 5% of matters in a calendar quarter (measured by ticket count, not hours), Customer shall be entitled to the following credits:

   5–10% miss rate: 5% of fees for the affected matter type, applied to the next invoice.
   10–20% miss rate: 10% of fees plus a written corrective action plan due within 15 days.
   >20% miss rate: 15% credit and Customer's right to terminate the affected matter type for cause without further cure period.

Credits are Customer's exclusive remedy for SLA misses; they do not constitute liquidated damages and shall not bar termination for cause under §3.3 of the MSA.

3. EXCLUSIONS

The following are excluded from SLA calculations:
   (a) Matters where Customer has not provided required information or approvals;
   (b) Force Majeure events as defined in §9.4 of the MSA;
   (c) Matters paused at Customer's request;
   (d) The first 30 days of any new SOW (ramp-up exclusion).

4. REPORTING

Provider will deliver a quarterly SLA report within 15 days of quarter-end, including ticket counts by tier, response time medians and 95th percentiles, and any service credits earned.

5. AMENDMENT

Either party may propose amendments to this Schedule with 30 days' notice. Amendments require mutual written agreement.
`,
  },
];
