export const LABOR_CALCULATOR_CONFIG = {
  currency: "BHD",
  currencyDecimals: 2,
  percentMultiplier: 100,
  insuredSalaryCap: 4000,
  monthsPerYear: 12,
  workingDaysPerMonth: 26,
  standardHoursPerDay: 8,
  nationalityOptions: {
    expat: {
      label: "Expat",
      socialInsuranceEmployerRate: 0.03,
      eosbEligible: true
    },
    bahraini: {
      label: "Bahraini",
      socialInsuranceEmployerRate: 0.16,
      eosbEligible: false
    }
  },
  unemploymentInsuranceEmployerRate: 0.01,
  eosb: {
    firstTierYears: 3,
    firstTierMonthlyWageMultiplier: 0.5,
    subsequentTierMonthlyWageMultiplier: 1,
    sioMonthlyContributionRateFirstTier: 0.042,
    sioMonthlyContributionRateSubsequentTier: 0.084
  },
  overtime: {
    dayMultiplier: 1.25,
    nightMultiplier: 1.5
  },
  defaultInputs: {
    nationality: "expat",
    basicSalary: "800",
    allowances: "200",
    yearsOfService: "4.5",
    dayOvertimeHours: "10",
    nightOvertimeHours: "5"
  },
  extensionSlots: {
    monthlyEmployerFees: [],
    recurringBenefits: [],
    employeeComparisons: []
  }
};

function toPositiveNumber(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return 0;
  }

  return numberValue;
}

export function roundCurrency(value, config = LABOR_CALCULATOR_CONFIG) {
  const factor = 10 ** config.currencyDecimals;
  return Math.round((toPositiveNumber(value) + Number.EPSILON) * factor) / factor;
}

export function formatCurrency(value, config = LABOR_CALCULATOR_CONFIG) {
  return `${config.currency} ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: config.currencyDecimals,
    maximumFractionDigits: config.currencyDecimals
  }).format(roundCurrency(value, config))}`;
}

export function formatRate(rate, config = LABOR_CALCULATOR_CONFIG) {
  return `${roundCurrency(rate * config.percentMultiplier, config)}%`;
}

export function calculateInsuredSalaryBase(basicSalary, config = LABOR_CALCULATOR_CONFIG) {
  const salary = toPositiveNumber(basicSalary);
  const cappedSalary = Math.min(salary, config.insuredSalaryCap);

  return {
    salary,
    cappedSalary,
    capApplied: salary > config.insuredSalaryCap
  };
}

export function getNationalityConfig(nationality, config = LABOR_CALCULATOR_CONFIG) {
  return config.nationalityOptions[nationality] || config.nationalityOptions.expat;
}

export function calculateSocialInsurance(input, config = LABOR_CALCULATOR_CONFIG) {
  const nationalityConfig = getNationalityConfig(input.nationality, config);
  const salaryBase = calculateInsuredSalaryBase(input.basicSalary, config);

  // Legal formula: employer social insurance = nationality employer rate x insured salary, capped at the statutory insured wage ceiling.
  const amount = salaryBase.cappedSalary * nationalityConfig.socialInsuranceEmployerRate;

  return {
    amount: roundCurrency(amount, config),
    rate: nationalityConfig.socialInsuranceEmployerRate,
    rateLabel: formatRate(nationalityConfig.socialInsuranceEmployerRate, config),
    cappedSalary: salaryBase.cappedSalary,
    capApplied: salaryBase.capApplied
  };
}

export function calculateUnemploymentInsurance(input, config = LABOR_CALCULATOR_CONFIG) {
  const salaryBase = calculateInsuredSalaryBase(input.basicSalary, config);

  // Legal formula: unemployment insurance = employer unemployment rate x insured salary, using the same insured wage cap.
  const amount = salaryBase.cappedSalary * config.unemploymentInsuranceEmployerRate;

  return {
    amount: roundCurrency(amount, config),
    rate: config.unemploymentInsuranceEmployerRate,
    rateLabel: formatRate(config.unemploymentInsuranceEmployerRate, config),
    cappedSalary: salaryBase.cappedSalary,
    capApplied: salaryBase.capApplied
  };
}

export function calculateEOSB(input, config = LABOR_CALCULATOR_CONFIG) {
  const nationalityConfig = getNationalityConfig(input.nationality, config);
  const basicSalary = toPositiveNumber(input.basicSalary);
  const allowances = toPositiveNumber(input.allowances);
  const yearsOfService = toPositiveNumber(input.yearsOfService);
  const eosbWage = basicSalary + allowances;

  if (!nationalityConfig.eosbEligible || yearsOfService <= 0 || eosbWage <= 0) {
    return {
      amount: 0,
      monthlyEquivalent: 0,
      eosbWage,
      firstTierYears: 0,
      subsequentYears: 0,
      serviceMonths: 0,
      currentSioMonthlyContribution: 0,
      currentSioMonthlyContributionRate: 0,
      eligible: nationalityConfig.eosbEligible
    };
  }

  const firstTierYears = Math.min(yearsOfService, config.eosb.firstTierYears);
  const subsequentYears = Math.max(yearsOfService - config.eosb.firstTierYears, 0);

  // Legal formula: EOSB uses the configured first-tier wage multiplier for the first service tier and the configured subsequent-tier multiplier after that.
  const firstTierAmount =
    eosbWage * config.eosb.firstTierMonthlyWageMultiplier * firstTierYears;
  const subsequentTierAmount =
    eosbWage * config.eosb.subsequentTierMonthlyWageMultiplier * subsequentYears;
  const amount = firstTierAmount + subsequentTierAmount;
  const serviceMonths = yearsOfService * config.monthsPerYear;

  // Requested monthly equivalent: total accrued EOSB divided by months served.
  const monthlyEquivalent = serviceMonths > 0 ? amount / serviceMonths : 0;
  const currentSioMonthlyContributionRate =
    yearsOfService <= config.eosb.firstTierYears
      ? config.eosb.sioMonthlyContributionRateFirstTier
      : config.eosb.sioMonthlyContributionRateSubsequentTier;
  const currentSioMonthlyContribution = eosbWage * currentSioMonthlyContributionRate;

  return {
    amount: roundCurrency(amount, config),
    monthlyEquivalent: roundCurrency(monthlyEquivalent, config),
    eosbWage,
    firstTierYears,
    subsequentYears,
    serviceMonths,
    currentSioMonthlyContribution: roundCurrency(currentSioMonthlyContribution, config),
    currentSioMonthlyContributionRate,
    eligible: nationalityConfig.eosbEligible
  };
}

export function calculateOvertimePay(input, config = LABOR_CALCULATOR_CONFIG) {
  const basicSalary = toPositiveNumber(input.basicSalary);
  const dayOvertimeHours = toPositiveNumber(input.dayOvertimeHours);
  const nightOvertimeHours = toPositiveNumber(input.nightOvertimeHours);

  // Legal formula: hourly wage = monthly basic wage / configured working days / configured standard daily hours.
  const hourlyWage = basicSalary / config.workingDaysPerMonth / config.standardHoursPerDay;

  // Legal formula: overtime pay = hourly wage x statutory overtime multiplier x overtime hours.
  const dayOvertimePay = hourlyWage * config.overtime.dayMultiplier * dayOvertimeHours;
  const nightOvertimePay = hourlyWage * config.overtime.nightMultiplier * nightOvertimeHours;
  const amount = dayOvertimePay + nightOvertimePay;

  return {
    amount: roundCurrency(amount, config),
    hourlyWage: roundCurrency(hourlyWage, config),
    dayOvertimePay: roundCurrency(dayOvertimePay, config),
    nightOvertimePay: roundCurrency(nightOvertimePay, config),
    dayOvertimeHours,
    nightOvertimeHours
  };
}

export function calculateEmployerCost(input, config = LABOR_CALCULATOR_CONFIG) {
  const basicSalary = toPositiveNumber(input.basicSalary);
  const allowances = toPositiveNumber(input.allowances);
  const socialInsurance = calculateSocialInsurance(input, config);
  const unemploymentInsurance = calculateUnemploymentInsurance(input, config);
  const eosb = calculateEOSB(input, config);
  const overtime = calculateOvertimePay(input, config);
  const extensionCosts = [
    ...config.extensionSlots.monthlyEmployerFees,
    ...config.extensionSlots.recurringBenefits
  ].reduce((total, item) => total + toPositiveNumber(item.amount), 0);

  const totalEmployerCost =
    basicSalary +
    allowances +
    socialInsurance.amount +
    unemploymentInsurance.amount +
    eosb.monthlyEquivalent +
    overtime.amount +
    extensionCosts;

  return {
    basicSalary: roundCurrency(basicSalary, config),
    allowances: roundCurrency(allowances, config),
    socialInsurance,
    unemploymentInsurance,
    eosb,
    overtime,
    extensionCosts: roundCurrency(extensionCosts, config),
    totalEmployerCost: roundCurrency(totalEmployerCost, config)
  };
}
