// ─── Sample Knowledge Pack content ─────────────────────────────────
//
// Real text for the seeded Knowledge Pack documents so the bot can
// actually ground answers in pack content when an attorney activates
// a pack in chat. Without this, packs are pure metadata and "Use NDA
// Playbook" has no functional grounding effect.
//
// Keys are `pack-<packId>-doc-<docId>` matching the entries in
// DEFAULT_KNOWLEDGE_PACKS in ChatView.jsx. Strings are illustrative —
// patterned after common playbook / checklist / redline shapes so the
// bot has concrete language to cite. NOT for legal use; for product
// demos only.

export const SAMPLE_PACK_CONTENT: Record<string, string> = {

  // ═══ Pack 1 — NDA Playbook ═══════════════════════════════════════
  'pack-1-doc-1': `STANDARD MUTUAL NON-DISCLOSURE AGREEMENT — FIRM TEMPLATE v3.2

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of [Effective Date] by and between [Party A], a [state] [entity], and [Party B], a [state] [entity] (each a "Party" and together the "Parties").

1. DEFINITION OF CONFIDENTIAL INFORMATION

"Confidential Information" means any non-public information disclosed by one Party (the "Disclosing Party") to the other (the "Receiving Party"), whether oral, written, or in any other form, that is designated as confidential at the time of disclosure or that a reasonable person would understand to be confidential given the nature of the information and the circumstances of disclosure. Confidential Information includes business plans, financial information, customer lists, technical specifications, trade secrets, and the existence and terms of this Agreement.

2. EXCEPTIONS

Confidential Information does NOT include information that: (a) was rightfully known to the Receiving Party without restriction prior to disclosure; (b) is or becomes generally available to the public through no fault of the Receiving Party; (c) is rightfully obtained by the Receiving Party from a third party without restriction; or (d) is independently developed by the Receiving Party without use of or reference to the Confidential Information.

3. OBLIGATIONS

The Receiving Party shall: (a) use the Confidential Information solely for the Permitted Purpose stated in Section 4; (b) protect it with the same degree of care it uses for its own confidential information of like importance, and in any event no less than reasonable care; (c) limit disclosure to its employees, contractors, and professional advisors with a need to know who are bound by confidentiality obligations no less protective than those in this Agreement; and (d) not reverse engineer, decompile, or disassemble any tangible Confidential Information.

4. PERMITTED PURPOSE

The Confidential Information may be used solely for the purpose of evaluating a potential business relationship between the Parties (the "Permitted Purpose") and for no other purpose without the Disclosing Party's prior written consent.

5. TERM

This Agreement shall remain in effect for three (3) years from the Effective Date. Confidentiality obligations under Section 3 shall survive termination for an additional five (5) years, except that obligations relating to trade secrets shall continue for as long as the information remains a trade secret under applicable law.

6. RETURN OR DESTRUCTION

Upon written request, the Receiving Party shall promptly return or destroy all Confidential Information in its possession and certify such return or destruction in writing.

7. NO LICENSE

Nothing in this Agreement grants the Receiving Party any license, ownership, or other right in the Confidential Information except the limited right to use it for the Permitted Purpose.

8. REMEDIES

The Parties acknowledge that breach of this Agreement may cause irreparable harm for which monetary damages would be inadequate, and the non-breaching Party shall be entitled to seek injunctive relief in addition to any other remedies available.

9. GOVERNING LAW

This Agreement shall be governed by the laws of the State of [State], without regard to conflict-of-laws principles.`,

  'pack-1-doc-2': `NDA RISK REVIEW CHECKLIST — FIRM-APPROVED RED FLAGS

This checklist guides associates reviewing an inbound NDA from a counterparty. Flag any of the following for partner review before recommending execution.

A. SCOPE & DEFINITIONS

1. "Confidential Information" defined too broadly (e.g., includes ALL information, regardless of designation). RECOMMEND: scope to information designated as confidential or that is reasonably understood to be confidential.

2. No exclusions for publicly known, independently developed, or third-party-sourced information. CRITICAL — these are standard exceptions; their absence is unusual.

3. Asymmetric definition (binds only one side) when relationship is mutual. Counter with mutual language.

B. TERM & SURVIVAL

4. Indefinite confidentiality term ("perpetual" / "in perpetuity"). RECOMMEND: 3–5 year term post-disclosure, except trade secrets which may continue.

5. Survival clause longer than 5 years. Negotiate down to 3–5 years.

6. No survival clause at all (rare but seen). Add one — termination of the agreement should not extinguish confidentiality obligations.

C. PERMITTED USE

7. Permitted Purpose defined too narrowly to allow evaluation of the deal. Common in M&A — broaden to "evaluation of and negotiation of a potential transaction".

8. Restrictions on contacting the counterparty's employees/customers (non-solicit) buried in NDA without independent consideration. Push back — these belong in a separate non-solicit agreement.

D. REMEDIES & ENFORCEMENT

9. Liquidated damages clause with specific dollar amount. CRITICAL — courts treat these skeptically; recommend striking and relying on actual damages plus injunctive relief.

10. Attorneys' fees provision favoring only the disclosing party. Make mutual ("prevailing party") or strike.

11. Mandatory arbitration in inconvenient venue. Push for neutral venue or carve out injunctive relief from arbitration.

E. UNUSUAL PROVISIONS

12. Non-compete language. Strike — does not belong in an NDA.

13. Assignment restrictions on the disclosing party but not the receiving party. Make mutual.

14. Requirement to disclose any information you generate using the confidential information (a "feedback" or "improvement" clause). Strike — receiver should not be required to give back IP.

15. Choice of law in a jurisdiction with no connection to either party. Negotiate to home jurisdiction of one party.

PROCESS NOTES

- Always run inbound NDAs through this checklist before approving for signature.
- Items A.2, B.4, D.9, and E.12 are AUTO-ESCALATE to partner review regardless of deal size.
- Document any deviation from this checklist in the matter file with a one-line rationale.`,

  'pack-1-doc-3': `MUTUAL NDA REDLINE EXAMPLE — STANDARD COUNTERPARTY ASKS

The following are common opposing-counsel asks on our standard NDA template, with the firm's recommended redlines and rationale.

ASK 1: "Strike Section 2 exclusions for independently developed information."

OUR POSITION: Reject. Section 2(d) (independently developed) is industry-standard and protects the Receiving Party from being unable to use information it generates without reference to the Confidential Information. Without it, the Receiving Party effectively becomes a hostage to the disclosure.

REDLINE: Keep Section 2(d) as drafted.

ASK 2: "Extend term to 7 years."

OUR POSITION: Negotiate. Three years is the firm's standard but five years is acceptable in deals involving sensitive technical information. Seven years is excessive for ordinary commercial NDAs.

REDLINE: 3 years → 5 years. Counter-offer 5 years; accept 5; reject 7.

ASK 3: "Add liquidated damages of $250,000 per breach."

OUR POSITION: Reject. Liquidated damages clauses in NDAs are routinely struck down as unenforceable penalties because actual damages from breach are speculative. Standard practice is to rely on actual damages plus injunctive relief (Section 8).

REDLINE: Strike entire liquidated damages clause.

ASK 4: "Carve out our existing customer relationships from the non-solicit."

OUR POSITION: There is no non-solicit in our standard template; if counterparty has added one, strike it entirely. Non-solicit obligations belong in a separate agreement with independent consideration.

REDLINE: Strike non-solicit clause if introduced; do not negotiate carve-outs.

ASK 5: "Change governing law from New York to Delaware."

OUR POSITION: Acceptable for transactions where Delaware has a real connection (e.g., one party is Delaware-incorporated). Otherwise prefer New York. Both jurisdictions have well-developed confidentiality case law.

REDLINE: Accept Delaware if there is a Delaware nexus; otherwise counter to New York.`,

  // ═══ Pack 2 — M&A Due Diligence ═════════════════════════════════
  'pack-2-doc-1': `M&A DUE DILIGENCE CHECKLIST v3 — TARGET COMPANY REVIEW

Use this checklist for M&A diligence on a target company. Customize per deal size and industry. Items marked [CRITICAL] are auto-flag for partner review regardless of deal size.

A. CORPORATE / ORGANIZATIONAL

1. Certificate of incorporation, by-laws, all amendments.
2. Stock ledger and capitalization table; verify against board minutes.
3. List of all subsidiaries, joint ventures, and equity investments.
4. Board and shareholder meeting minutes for past 5 years. [CRITICAL]
5. Stock option plan, all issued options, vesting schedules, acceleration triggers on change of control.
6. All shareholder agreements, voting agreements, ROFR/ROFO provisions.

B. FINANCIAL

7. Audited financial statements for past 3 fiscal years.
8. Management-prepared unaudited financials for current fiscal year.
9. All bank accounts, lines of credit, and outstanding debt.
10. Tax returns for past 3 years (federal, state, international). [CRITICAL]
11. Open tax audits or disputes. [CRITICAL]
12. Transfer pricing documentation if cross-border.

C. CONTRACTS

13. Top 20 customer contracts by revenue.
14. Top 20 vendor / supplier contracts by spend.
15. All contracts containing change-of-control, assignment, or termination-on-acquisition triggers. [CRITICAL]
16. All contracts with most-favored-nation, exclusivity, or non-compete provisions.
17. All real property leases.

D. INTELLECTUAL PROPERTY

18. List of all registered patents, trademarks, copyrights, and domain names.
19. All pending IP applications and oppositions.
20. All IP license agreements (in-bound and out-bound).
21. Open-source software inventory and compliance review.
22. Employee IP assignment agreements — verify completeness for all current and former employees who developed IP. [CRITICAL]

E. EMPLOYMENT & BENEFITS

23. Organization chart with titles and compensation for top 25 employees.
24. All employment agreements containing change-of-control, severance, or non-compete provisions.
25. ERISA plans, 401(k), pension, and health/welfare benefits documents.
26. Employment classification audit (W-2 vs 1099) — federal and state.
27. Pending or threatened employment litigation, EEOC charges, wage-and-hour matters. [CRITICAL]

F. LITIGATION & REGULATORY

28. All pending and threatened litigation; settled litigation past 5 years over $100K.
29. All government investigations, subpoenas, civil investigative demands.
30. Regulatory licenses and permits; lapses or violations past 5 years.
31. Environmental assessments, Phase I/II reports for owned properties.

G. INSURANCE

32. Schedule of all insurance policies (general liability, D&O, E&O, cyber, employment practices, property).
33. Open or recent claims; loss runs.

H. DATA & PRIVACY

34. Data privacy policy and any past breaches or notifications. [CRITICAL]
35. GDPR / CCPA / state privacy law compliance documentation.
36. Cybersecurity audit reports past 3 years.

I. CHANGE-OF-CONTROL TRIGGERS

37. Compile a master list of every COC trigger discovered across A–H above for use in negotiating consents and notice obligations.`,

  'pack-2-doc-2': `MERIDIAN PRECEDENT NOTE — In re Meridian Holdings Acquisition (Del. Ch. 2024)

CITATION: In re Meridian Holdings Acquisition Litigation, C.A. No. 2024-0312 (Del. Ch. Aug. 14, 2024).

FACTS: Acquirer agreed to purchase Meridian Holdings, a Delaware corporation, for $2.1B in a stock-for-stock merger. The merger agreement contained a "no-shop" provision restricting Meridian from soliciting alternative bids and a $63M termination fee (3% of deal value). After signing but before closing, a third-party bidder ("Crescent") emerged with an unsolicited offer at a 12% premium. Meridian's board determined this constituted a "Superior Proposal" under the merger agreement. Acquirer claimed the termination fee was due. Crescent argued the fee was an unenforceable penalty.

HOLDING: The Delaware Court of Chancery upheld the 3% termination fee as a reasonable measure of Acquirer's reliance and opportunity costs, applying the standard articulated in In re Toys "R" Us Shareholder Litigation, 877 A.2d 975 (Del. Ch. 2005). The court rejected Crescent's penalty argument, noting that termination fees in the 2.5%–4% range are presumptively reasonable in negotiated transactions.

KEY REASONING:

1. FIDUCIARY OUT: The merger agreement included a fiduciary out allowing Meridian's board to terminate in favor of a Superior Proposal. This is the principal protection against unreasonable lock-up.

2. REASONABLENESS OF FEE: At 3%, the fee was within the range courts have repeatedly approved. The court declined to set a bright-line rule but reaffirmed that fees above 4% receive heightened scrutiny.

3. NO-SHOP WAS QUALIFIED: The no-shop allowed Meridian to respond to unsolicited bona fide offers that the board reasonably concluded could lead to a Superior Proposal — the standard "window-shop" exception.

4. INFORMATION RIGHTS: Meridian was required to inform Acquirer within 24 hours of receiving Crescent's offer and provide Acquirer a 4-business-day matching right. The court found these information rights non-coercive.

PRACTICE TAKEAWAYS:

(i) Termination fees of 2.5%–3.5% with a fiduciary out and standard window-shop language are unlikely to draw scrutiny.
(ii) Above 4%, expect intense scrutiny; consider step-down structures.
(iii) Information rights and matching rights, when limited in duration (≤5 business days), are generally upheld.
(iv) "Don't ask, don't waive" standstill provisions remain disfavored after In re Ancestry.com (2012); avoid in negotiated deals.`,

  'pack-2-doc-3': `M&A INDEMNIFICATION CLAUSES — STANDARD POSITIONS

The following are firm-standard indemnification positions for negotiated M&A transactions. Adjust per deal size and risk profile.

GENERAL INDEMNITY (Section 9.2)

Seller shall indemnify Buyer for losses arising from: (a) breach of any representation or warranty; (b) breach of any covenant; (c) any pre-closing tax liability not provided for in the closing balance sheet; and (d) any matter set forth on Schedule 9.2 (Specific Indemnities).

SURVIVAL PERIODS

- General reps: 18 months post-closing.
- Fundamental reps (capitalization, authority, no-conflict): 6 years.
- Tax reps: statute of limitations + 60 days.
- Fraud or intentional misrepresentation: indefinite.

DEDUCTIBLE & CAP

- Deductible (basket): 0.5%–1.0% of purchase price (tipping basket — once breach hits the deductible, all losses indemnified, not just amount above).
- Cap on general reps: 10%–15% of purchase price.
- Cap on fundamental reps: 100% of purchase price.
- Cap on fraud: NO CAP. [CRITICAL]

EXCLUSIONS FROM CAP

The cap shall not apply to indemnification obligations arising from: (a) fraud; (b) intentional misrepresentation; (c) breach of fundamental representations; (d) tax matters; (e) specific identified matters in Schedule 9.2.

ESCROW / HOLDBACK

10%–15% of purchase price held in escrow for 18–24 months as the exclusive remedy for general rep breaches (subject to fraud carve-out). After 18 months, half releases; after 24 months, the remainder releases minus any pending claims.

CLAIM PROCEDURE

Buyer must give written notice within 60 days of becoming aware of a claim. For third-party claims, Seller has 30 days to elect to control the defense, subject to (a) Buyer's reasonable approval of counsel, (b) Seller paying defense costs as incurred, and (c) Seller bearing the risk of judgment.

MATERIALITY SCRAPE

For purposes of calculating indemnifiable losses (but not for purposes of determining whether a breach has occurred), all materiality and material adverse effect qualifiers in the representations are disregarded. This is a key Buyer protection — push for it in every deal.

R&W INSURANCE INTERPLAY

Where R&W insurance is in place: (a) deductible is typically 0.5% of purchase price retention layer; (b) seller's cap reduces to 0.5%–1.0% of purchase price (the "Seller Retention"); (c) all losses above retention flow through R&W policy; (d) fundamental reps may carry seller's full-recourse cap above the policy. Get tax indemnity coverage from a separate tax indemnity insurance policy where available.`,

  // ═══ Pack 3 — Employment Law California ══════════════════════════
  'pack-3-doc-1': `CALIFORNIA LABOR CODE — FREQUENTLY APPLIED PROVISIONS

This summary covers California Labor Code sections most often applied in employment-side advice. Citations should be verified against current code; California amends frequently.

§ 200 — DEFINITIONS OF WAGES

"Wages" includes all amounts for labor performed, whether the amount is fixed or ascertained by the standard of time, task, piece, commission, or other method of calculation. This broad definition catches commissions, bonuses, vacation pay accrued, and certain expense reimbursements.

§ 201 — DISCHARGE: WAGES DUE IMMEDIATELY

If an employer discharges an employee, all wages earned and unpaid are due and payable immediately. Failure to pay triggers waiting-time penalties under §203.

§ 202 — VOLUNTARY QUIT: 72-HOUR RULE

An employee who quits without 72 hours' notice is entitled to wages within 72 hours. An employee who quits with 72+ hours' notice is entitled to wages on the last day worked.

§ 203 — WAITING TIME PENALTIES

If an employer willfully fails to pay wages due under §§ 201–202, wages continue to accrue (at the employee's daily rate) for up to 30 days. CRITICAL — even a small unpaid wage triggers the full 30-day penalty for willful nonpayment.

§ 226 — WAGE STATEMENT REQUIREMENTS

Wage statements must include nine specific items: (1) gross wages, (2) total hours worked (non-exempt), (3) piece-rate units and rate, (4) deductions, (5) net wages, (6) pay period dates, (7) employee name and last four of SSN/ID, (8) employer name and address, (9) hourly rates and hours at each rate (non-exempt). Violations carry statutory damages of $50 first violation, $100 subsequent, capped at $4,000 per employee.

§ 510 — OVERTIME

8 hours = workday. 40 hours = workweek. Time-and-a-half for hours 8–12 in a day, hours 40+ in a week. Double time for hours 12+ in a day, hours 8+ on the seventh consecutive day. Workweek-only overtime (federal-style) does not satisfy California rules.

§ 512 — MEAL PERIODS

A 30-minute unpaid meal period is required for shifts over 5 hours. A second 30-minute meal period for shifts over 10 hours. Failure to provide a meal period triggers a one-hour-pay penalty per day.

§ 1194 — UNPAID OVERTIME

Employees may recover unpaid overtime plus interest, reasonable attorneys' fees, and costs. Strict liability — no good-faith defense.

§ 2802 — EXPENSE REIMBURSEMENT

Employers must indemnify employees for "necessary expenditures or losses incurred by the employee in direct consequence of the discharge of his or her duties." Includes business mileage, cell phone use for work, home internet for remote work. Failure to reimburse is a Labor Code violation.

§ 2870 — EMPLOYEE INVENTION ASSIGNMENT LIMITS

An employer may not require an employee to assign inventions developed entirely on the employee's own time without using the employer's equipment, supplies, facilities, or trade secret information, unless: (a) the invention relates to the employer's business or anticipated R&D, or (b) the invention results from work performed for the employer. Employee-invention agreements broader than § 2870 are unenforceable to the extent they exceed it.`,

  'pack-3-doc-2': `NON-COMPETE ENFORCEMENT IN CALIFORNIA — § 16600 AND THE EDWARDS RULE

CORE STATUTE

California Business and Professions Code § 16600: "Except as provided in this chapter, every contract by which anyone is restrained from engaging in a lawful profession, trade, or business of any kind is to that extent void."

LEADING CASE

Edwards v. Arthur Andersen LLP, 44 Cal. 4th 937 (2008): The California Supreme Court rejected the federal "rule of reasonableness" applied to non-competes and held that § 16600 means what it says — non-competes restraining a former employee from engaging in their profession are VOID, not subject to a reasonableness analysis. There is no "narrow restraint" exception.

WHAT IS COVERED

§ 16600 voids: (a) post-employment non-competes; (b) customer non-solicits where they functionally restrain competition (per AMN Healthcare v. Aya Healthcare, 28 Cal. App. 5th 923 (2018)); (c) "employee no-poach" agreements between competitors. Pure trade-secret protection (e.g., NDA covering actual trade secrets) is permitted, but it must be tightly tailored — broad confidentiality clauses that effectively function as a non-compete will be struck.

WHAT IS NOT COVERED

§ 16600 has narrow statutory exceptions: (a) non-compete given in connection with sale of a business (§ 16601); (b) non-compete given in connection with dissolution of a partnership (§ 16602); (c) non-compete given in connection with sale of LLC membership interest (§ 16602.5).

CHOICE-OF-LAW LIMITS

§ 925 (effective 2017) prohibits requiring a California employee to litigate or arbitrate California employment disputes outside California, or to apply non-California law to California-employee disputes — UNLESS the employee was individually represented by counsel in negotiating the choice-of-law provision. Practical effect: out-of-state employers cannot use Texas / NY law to enforce non-competes against California employees.

DAMAGES & FEES

An employee who succeeds in voiding a non-compete may recover attorneys' fees under California's private attorney general statute. Employers face exposure for (a) the employee's lost wages during non-compete enforcement attempts, (b) tortious interference if the employer attempts to enforce against a new employer.

SECTION 17200 (UCL)

Attempting to enforce an unlawful non-compete may itself constitute an "unlawful business practice" under California's Unfair Competition Law (Bus. & Prof. Code § 17200), giving the former employee an additional cause of action with broad equitable remedies.

PRACTICE NOTE

Drafting non-competes for California employees is malpractice. For California-employee covenants, use: (a) a tightly-drafted NDA covering actual trade secrets, (b) an employee invention assignment compliant with § 2870 (above), (c) a customer non-solicit ONLY as to confidential customer information (not blanket restriction), and (d) confirm the choice-of-law and venue clauses comply with § 925.`,

  // ═══ Pack 4 — Privacy & Data Protection ══════════════════════════
  'pack-4-doc-1': `GDPR — KEY PRINCIPLES, LAWFUL BASES, AND DATA SUBJECT RIGHTS

The General Data Protection Regulation (Regulation (EU) 2016/679) applies to the processing of personal data of individuals in the European Union, regardless of where the processor or controller is located.

KEY DEFINITIONS

- "Personal data" — any information relating to an identified or identifiable natural person.
- "Processing" — any operation performed on personal data (collection, storage, use, transfer, deletion, etc.).
- "Controller" — the entity that determines the purposes and means of processing.
- "Processor" — the entity that processes personal data on behalf of the controller.

KEY PRINCIPLES (Article 5)

1. Lawfulness, fairness, transparency.
2. Purpose limitation — processed only for specified, explicit, legitimate purposes.
3. Data minimization — adequate, relevant, and limited to what is necessary.
4. Accuracy — kept up to date.
5. Storage limitation — kept no longer than necessary.
6. Integrity and confidentiality — appropriate security.
7. Accountability — controller must demonstrate compliance.

LAWFUL BASES (Article 6)

Personal data may only be processed if at least one of the six bases applies:
(a) Consent — freely given, specific, informed, and unambiguous; must be as easy to withdraw as to give.
(b) Contract — necessary for performance of a contract with the data subject.
(c) Legal obligation — required by law.
(d) Vital interests — necessary to protect life of data subject or another person.
(e) Public interest — necessary for a task carried out in the public interest.
(f) Legitimate interests — pursued by the controller, except where overridden by data-subject rights.

DATA SUBJECT RIGHTS (Articles 12–22)

- Right to information (privacy notice).
- Right of access (Article 15).
- Right to rectification (Article 16).
- Right to erasure / "right to be forgotten" (Article 17).
- Right to restriction of processing (Article 18).
- Right to data portability (Article 20).
- Right to object (Article 21).
- Rights related to automated decision-making, including profiling (Article 22).

INTERNATIONAL TRANSFERS

Transfers of personal data outside the EEA are restricted. Permitted mechanisms: (a) Adequacy decision by the European Commission (e.g., UK, Switzerland, EU-US Data Privacy Framework for certified entities); (b) Standard Contractual Clauses (SCCs); (c) Binding Corporate Rules; (d) Specific derogations under Article 49 (limited use).

PENALTIES

Up to €20 million or 4% of annual worldwide turnover, whichever is higher, for the most serious violations (e.g., processing without lawful basis, breach of data subject rights). Lower-tier violations capped at €10 million / 2% of turnover.

DATA PROTECTION OFFICER

A DPO must be appointed where: (a) the controller is a public authority; (b) core activities require regular and systematic monitoring on a large scale; or (c) core activities involve large-scale processing of special-category data.`,

  'pack-4-doc-2': `CCPA — CALIFORNIA CONSUMER PRIVACY ACT REDLINE NOTES

The California Consumer Privacy Act (Cal. Civ. Code §§ 1798.100 et seq.), as amended by the California Privacy Rights Act ("CPRA") effective January 1, 2023, applies to for-profit businesses that collect personal information of California residents and meet at least one of: (a) annual gross revenues over $25M; (b) buy, sell, or share personal information of 100,000+ California consumers/households annually; or (c) derive 50%+ of annual revenues from selling or sharing personal information.

KEY DEFINITIONS

- "Personal information" — information that identifies, relates to, or could reasonably be linked with a particular consumer or household.
- "Sensitive personal information" — added by CPRA; includes SSN, driver's license, financial account, precise geolocation, racial/ethnic origin, religious beliefs, union membership, contents of mail/email/text, genetic data, biometric identifiers, health, sex life or sexual orientation.
- "Sale" — disclosure for monetary or other valuable consideration.
- "Share" — added by CPRA; disclosure for cross-context behavioral advertising even if no monetary consideration.

CONSUMER RIGHTS

1. Right to know — what personal information is collected, sold/shared, with whom.
2. Right to delete — request deletion of personal information collected from the consumer (subject to exceptions).
3. Right to correct — added by CPRA; request correction of inaccurate personal information.
4. Right to opt out of sale/sharing — must be honored via "Do Not Sell or Share My Personal Information" link.
5. Right to limit use of sensitive personal information — added by CPRA; "Limit the Use of My Sensitive Personal Information" link.
6. Right to non-discrimination — cannot deny goods/services or charge different price for exercising rights.
7. Right to portability — receive data in portable, readily usable format.

NOTICE OBLIGATIONS

At or before collection: notice of categories of personal information collected, purposes of use, categories of sources, and — if sold/shared — categories of third parties. Privacy policy must be updated at least every 12 months.

CONTRACTS WITH SERVICE PROVIDERS

Contracts must include specific provisions: (a) limit use of personal information to the business purpose specified; (b) prohibit sale or sharing; (c) require notice if the service provider can no longer comply; (d) include audit rights. CPRA introduced a third-party / contractor distinction — review existing data-sharing contracts for compliance.

PENALTIES

Civil penalties up to $2,500 per violation, $7,500 per intentional violation. Consumer-led private right of action available for data breaches involving certain types of personal information ($100–$750 per consumer per incident, statutory damages, no proof of actual damages required).

INTERPLAY WITH OTHER STATE LAWS

CCPA-like statutes have been enacted in Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Utah (UCPA), and others. Differences exist in thresholds, sensitive-data definitions, and opt-out vs. opt-in. Multi-state compliance typically defaults to the strictest applicable standard.`,
};
