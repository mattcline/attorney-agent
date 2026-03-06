const checklists: Record<string, string> = {
  "real estate purchase": `### Real Estate Purchase Agreement Checklist
- Purchase price and payment terms (earnest money, financing contingencies)
- Property description and legal description accuracy
- Title examination and title insurance provisions
- Inspection contingencies (home inspection, environmental, pest)
- Closing date and extension provisions
- Representations and warranties about property condition
- Risk of loss provisions (who bears risk before closing)
- Default and remedies (specific performance, liquidated damages)
- Prorations (taxes, HOA dues, utilities)
- Seller disclosures compliance with state law
- Financing contingency timeline and requirements
- Appraisal contingency
- Survey requirements
- Assignment and transfer restrictions
- Dispute resolution mechanism`,

  employment: `### Employment Agreement Checklist
- Position, duties, and reporting structure clearly defined
- Compensation: base salary, bonuses, equity, benefits
- Term: at-will vs. fixed term, renewal provisions
- Termination provisions: for cause, without cause, resignation
- Severance terms and conditions
- Non-compete: scope, duration, geographic limits (enforceability varies by state)
- Non-solicitation of employees and clients
- Confidentiality and trade secret protections
- Intellectual property assignment (work-for-hire, invention assignment)
- Change of control / acquisition provisions
- Dispute resolution: arbitration vs. litigation, venue
- Governing law
- Restrictive covenant reasonableness
- Clawback provisions
- Garden leave provisions`,

  nda: `### Non-Disclosure Agreement Checklist
- Definition of "Confidential Information" — is it overly broad or narrow?
- Exclusions from confidential information (public knowledge, independent development, prior knowledge)
- Permitted disclosures (legal compulsion, advisors)
- Mutual vs. unilateral obligations
- Term of confidentiality obligations (often survives termination)
- Return or destruction of confidential materials
- Remedies for breach (injunctive relief, damages)
- Non-solicitation provisions (if included, appropriate scope)
- Residual knowledge clause
- No obligation to proceed with transaction
- No license granted under the NDA
- Governing law and jurisdiction`,

  saas: `### SaaS Agreement Checklist
- Service description and SLA (uptime guarantees, response times)
- Subscription term: auto-renewal, cancellation notice period
- Pricing: rate changes, usage-based billing clarity
- Data ownership and portability (who owns customer data)
- Data security obligations and breach notification
- Privacy compliance (GDPR, CCPA, etc.)
- Limitation of liability caps and exclusions
- Indemnification provisions (IP infringement, data breach)
- Warranty disclaimers
- Force majeure
- Termination: for cause, for convenience, data return/deletion on termination
- API terms and usage limits
- Support obligations and escalation procedures
- Acceptable use policy
- Subprocessor management`,

  lease: `### Lease Agreement Checklist
- Premises description and permitted use
- Lease term: commencement, expiration, renewal options
- Rent: base rent, escalation clauses, CPI adjustments
- Security deposit: amount, conditions for return, interest
- CAM charges and operating expense pass-throughs
- Maintenance and repair responsibilities (landlord vs. tenant)
- Insurance requirements (liability, property, business interruption)
- Assignment and subletting restrictions
- Tenant improvements and alterations
- Default provisions and cure periods
- Holdover provisions
- Casualty and condemnation
- Quiet enjoyment covenant
- Estoppel certificate requirements
- Environmental provisions and hazardous materials`,

  consulting: `### Consulting Agreement Checklist
- Scope of services (clearly defined deliverables)
- Compensation: fixed fee, hourly rate, milestone-based, expenses
- Payment terms and invoicing procedures
- Independent contractor status (not employee) — tax implications
- Term and termination provisions
- Intellectual property ownership of work product
- Confidentiality obligations
- Non-compete and non-solicitation (scope and enforceability)
- Representations and warranties
- Indemnification
- Limitation of liability
- Insurance requirements (E&O, general liability)
- Dispute resolution
- Governing law
- Assignment restrictions`,
};

const AGREEMENT_TYPE_ALIASES: Record<string, string> = {
  "real estate purchase agreement": "real estate purchase",
  "real estate": "real estate purchase",
  "home purchase": "real estate purchase",
  "property purchase": "real estate purchase",
  "employment agreement": "employment",
  "employment contract": "employment",
  "offer letter": "employment",
  "non-disclosure agreement": "nda",
  "non-disclosure": "nda",
  "confidentiality agreement": "nda",
  "confidentiality": "nda",
  "saas agreement": "saas",
  "software as a service": "saas",
  "subscription agreement": "saas",
  "lease agreement": "lease",
  "rental agreement": "lease",
  "commercial lease": "lease",
  "residential lease": "lease",
  "consulting agreement": "consulting",
  "consulting contract": "consulting",
  "independent contractor agreement": "consulting",
  "contractor agreement": "consulting",
};

const GENERAL_CHECKLIST = `### General Agreement Checklist
- Parties: correctly identified with legal names
- Recitals / background: accurately describe the purpose
- Definitions: key terms defined and used consistently
- Term and termination provisions
- Payment terms and conditions
- Representations and warranties
- Indemnification provisions
- Limitation of liability
- Confidentiality obligations
- Intellectual property rights
- Force majeure
- Dispute resolution (arbitration vs. litigation)
- Governing law and jurisdiction
- Assignment and transfer restrictions
- Notice provisions
- Entire agreement / merger clause
- Amendment and waiver provisions
- Severability clause
- Counterparts and electronic signatures`;

export function getChecklist(agreementType: string): string {
  const normalized = agreementType.toLowerCase().trim();

  if (checklists[normalized]) {
    return checklists[normalized];
  }

  const aliasKey = AGREEMENT_TYPE_ALIASES[normalized];
  if (aliasKey && checklists[aliasKey]) {
    return checklists[aliasKey];
  }

  return GENERAL_CHECKLIST;
}

export function getSupportedTypes(): string[] {
  return Object.keys(checklists);
}
