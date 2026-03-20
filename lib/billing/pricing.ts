export type IncidentPricingModel = "fixed" | "quoted";

export type IncidentType = {
  code: string;
  label: string;
  amount: number | null; // smallest unit (USD cents) for fixed-price incidents
  pricingModel: IncidentPricingModel;
  publicPriceLabel: string;
  helper: string;
  category: string;
};

const INCIDENT_CATALOG: IncidentType[] = [
  {
    code: "password_reset",
    label: "Password reset",
    amount: 900,
    pricingModel: "fixed",
    publicPriceLabel: "$9",
    helper:
      "Reset account access, unlock credentials, and restore sign-in flow.",
    category: "account",
  },
  {
    code: "printer_troubleshooting",
    label: "Printer troubleshooting",
    amount: 1900,
    pricingModel: "fixed",
    publicPriceLabel: "$19",
    helper: "Resolve printer setup, queue, driver, and connectivity problems.",
    category: "technical",
  },
  {
    code: "software_repair_reinstall",
    label: "Software repair / reinstall",
    amount: 2900,
    pricingModel: "fixed",
    publicPriceLabel: "$29",
    helper:
      "Repair broken software installs, missing dependencies, or reinstall the affected application.",
    category: "technical",
  },
  {
    code: "device_configuration",
    label: "Device configuration",
    amount: 2900,
    pricingModel: "fixed",
    publicPriceLabel: "$29",
    helper:
      "Configure a workstation, peripheral, application, or endpoint to the required operating setup.",
    category: "technical",
  },
  {
    code: "pc_tune_up_optimization",
    label: "PC tune-up / optimization",
    amount: 4900,
    pricingModel: "fixed",
    publicPriceLabel: "$49",
    helper:
      "Improve speed, startup behavior, and overall workstation performance.",
    category: "technical",
  },
  {
    code: "after_hours_emergency_support",
    label: "After-hours emergency support",
    amount: 5900,
    pricingModel: "fixed",
    publicPriceLabel: "$59",
    helper: "Urgent support requested outside standard support hours.",
    category: "general",
  },
  {
    code: "network_troubleshooting",
    label: "Network troubleshooting",
    amount: 6900,
    pricingModel: "fixed",
    publicPriceLabel: "$69",
    helper:
      "Diagnose network access, DNS, Wi-Fi, routing, VPN, or connectivity issues.",
    category: "technical",
  },
  {
    code: "malware_cleanup",
    label: "Malware cleanup",
    amount: 9900,
    pricingModel: "fixed",
    publicPriceLabel: "$99",
    helper:
      "Investigate suspicious activity and clean malware or harmful software from the affected device.",
    category: "technical",
  },
  {
    code: "server_repair",
    label: "Server repair",
    amount: null,
    pricingModel: "quoted",
    publicPriceLabel: "Quoted",
    helper:
      "Server repair requires technician review before pricing is confirmed.",
    category: "technical",
  },
];

export type CompanyPlan = {
  code: string;
  name: string;
  employees: string;
  seatLimit: number;
  fairUsageTicketLimit: number;
  priceLabel: string;
  priceMonthlyUsd: number;
};

const COMPANY_FAIR_USAGE_MULTIPLIER = 10;

const RAW_COMPANY_PLANS = [
  {
    code: "small_business_redundancy",
    name: "Small Business Redundancy",
    employees: "1–30 employees",
    seatLimit: 30,
    priceLabel: "$1,495/mo",
    priceMonthlyUsd: 149500,
  },
  {
    code: "growth_redundancy",
    name: "Growth Redundancy",
    employees: "31–75 employees",
    seatLimit: 75,
    priceLabel: "$2,495/mo",
    priceMonthlyUsd: 249500,
  },
  {
    code: "operational_redundancy",
    name: "Operational Redundancy",
    employees: "76–125 employees",
    seatLimit: 125,
    priceLabel: "$3,495/mo",
    priceMonthlyUsd: 349500,
  },
  {
    code: "enterprise_lite",
    name: "Enterprise Lite",
    employees: "126–200 employees",
    seatLimit: 200,
    priceLabel: "$4,495/mo",
    priceMonthlyUsd: 449500,
  },
] as const;

function withFairUsage(plan: (typeof RAW_COMPANY_PLANS)[number]): CompanyPlan {
  return {
    ...plan,
    fairUsageTicketLimit: plan.seatLimit * COMPANY_FAIR_USAGE_MULTIPLIER,
  };
}

export function getDisplayCurrency() {
  return "USD" as const;
}

export function getProcessorCurrency() {
  return "INR" as const; // temporary Razorpay testing only
}

export function getProcessorAmountFromDisplayAmount(amount: number) {
  return amount;
}

export function getBillingCurrency() {
  return getDisplayCurrency();
}

export function getIncidentCatalog(): IncidentType[] {
  return INCIDENT_CATALOG.map((item) => ({ ...item }));
}

export function getFixedPriceIncidentCatalog(): IncidentType[] {
  return INCIDENT_CATALOG.filter((item) => item.pricingModel === "fixed").map(
    (item) => ({ ...item }),
  );
}

export function getIncidentByCode(code: string | null | undefined) {
  const c = String(code || "").trim();
  if (!c) return null;
  return INCIDENT_CATALOG.find((x) => x.code === c) ?? null;
}

export function isQuotedIncidentCode(code: string | null | undefined) {
  const item = getIncidentByCode(code);
  return item?.pricingModel === "quoted";
}

export function formatIncidentPrice(item: IncidentType) {
  if (item.pricingModel === "quoted" || item.amount == null) {
    return item.publicPriceLabel;
  }
  return `$${(item.amount / 100).toFixed(2)}`;
}

export function getCompanyPlanCatalog(): CompanyPlan[] {
  return RAW_COMPANY_PLANS.map((item) => withFairUsage(item));
}

export function getCompanyPlanByCode(
  code: string | null | undefined,
): CompanyPlan | null {
  const c = String(code || "").trim();
  if (!c) return null;
  const plan = RAW_COMPANY_PLANS.find((x) => x.code === c);
  return plan ? withFairUsage(plan) : null;
}

export function getCompanyPlanFairUsageTicketLimit(
  planOrCode: CompanyPlan | string | null | undefined,
) {
  if (!planOrCode) return null;
  if (typeof planOrCode === "string") {
    return getCompanyPlanByCode(planOrCode)?.fairUsageTicketLimit ?? null;
  }
  return Number(planOrCode.fairUsageTicketLimit ?? 0) || null;
}

export function getCompanyFairUsageMultiplier() {
  return COMPANY_FAIR_USAGE_MULTIPLIER;
}

export function formatCompanyPlanPrice(plan: CompanyPlan) {
  return `$${(plan.priceMonthlyUsd / 100).toFixed(2)}/mo`;
}
