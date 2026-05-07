"use client";

import { useMemo, useState } from "react";

import {
  LABOR_CALCULATOR_CONFIG,
  calculateEmployerCost,
  formatCurrency,
  formatRate
} from "../lib/labor-calculator";

const NUMERIC_FIELDS = {
  basicSalary: "Basic salary",
  allowances: "Allowances",
  yearsOfService: "Years of service",
  dayOvertimeHours: "Day overtime hours",
  nightOvertimeHours: "Night overtime hours"
};

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 11.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z" />
      <path d="M5.2 20a6.8 6.8 0 0 1 13.6 0" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19V9" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
      <path d="M3.5 19.5h17" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="7.5" width="16" height="11" rx="2.2" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" />
      <path d="M4 12h16" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 10h16" />
      <path d="M9 5v14" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5Z" />
      <path d="M5 5.5v15" />
      <path d="M9 7h6" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 10.5v5" />
      <path d="M12 7.5h.01" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12a7 7 0 1 0 2.1-5" />
      <path d="M5 4.5V8h3.5" />
    </svg>
  );
}

function validateLaborInputs(inputs) {
  return Object.entries(NUMERIC_FIELDS).reduce((errors, [field, label]) => {
    const rawValue = String(inputs[field] ?? "").trim();
    const numericValue = Number(rawValue);

    if (!rawValue) {
      errors[field] = `${label} is required.`;
    } else if (!Number.isFinite(numericValue)) {
      errors[field] = `${label} must be numeric.`;
    } else if (numericValue < 0) {
      errors[field] = `${label} cannot be negative.`;
    }

    return errors;
  }, {});
}

function getSafeNumericInputs(inputs, validationErrors) {
  return Object.keys(NUMERIC_FIELDS).reduce(
    (safeInputs, field) => ({
      ...safeInputs,
      [field]: validationErrors[field] ? 0 : Number(inputs[field])
    }),
    { nationality: inputs.nationality }
  );
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: LABOR_CALCULATOR_CONFIG.currencyDecimals
  }).format(Number.isFinite(value) ? value : 0);
}

function NumericField({ field, label, value, error, onChange, helper, step = "0.01" }) {
  return (
    <label className="labor-field" htmlFor={`labor-${field}`}>
      <span>{label}</span>
      <input
        id={`labor-${field}`}
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
        className={error ? "labor-input-invalid" : ""}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `labor-${field}-error` : undefined}
      />
      {helper ? <small>{helper}</small> : null}
      {error ? <strong id={`labor-${field}-error`}>{error}</strong> : null}
    </label>
  );
}

export default function LaborCalculatorClient() {
  const [inputs, setInputs] = useState({ ...LABOR_CALCULATOR_CONFIG.defaultInputs });
  const validationErrors = useMemo(() => validateLaborInputs(inputs), [inputs]);
  const numericInputs = useMemo(
    () => getSafeNumericInputs(inputs, validationErrors),
    [inputs, validationErrors]
  );
  const result = useMemo(() => calculateEmployerCost(numericInputs), [numericInputs]);
  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const selectedNationality =
    LABOR_CALCULATOR_CONFIG.nationalityOptions[inputs.nationality] ||
    LABOR_CALCULATOR_CONFIG.nationalityOptions.expat;
  const capApplied =
    result.socialInsurance.capApplied || result.unemploymentInsurance.capApplied;

  function updateInput(field, value) {
    setInputs((current) => ({
      ...current,
      [field]: value
    }));
  }

  function resetCalculator() {
    setInputs({ ...LABOR_CALCULATOR_CONFIG.defaultInputs });
  }

  function focusResults() {
    document.getElementById("labor-results")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  const breakdownRows = [
    {
      component: "Basic Salary",
      calculation: "Monthly basic wage",
      amount: result.basicSalary
    },
    {
      component: "Allowances",
      calculation: "Recurring eligible allowances",
      amount: result.allowances
    },
    {
      component: `Social Insurance (${result.socialInsurance.rateLabel})`,
      calculation: `${result.socialInsurance.rateLabel} of ${formatCurrency(result.socialInsurance.cappedSalary)}${
        result.socialInsurance.capApplied ? " after salary cap" : ""
      }`,
      amount: result.socialInsurance.amount
    },
    {
      component: `Unemployment Insurance (${result.unemploymentInsurance.rateLabel})`,
      calculation: `${result.unemploymentInsurance.rateLabel} of ${formatCurrency(result.unemploymentInsurance.cappedSalary)}${
        result.unemploymentInsurance.capApplied ? " after salary cap" : ""
      }`,
      amount: result.unemploymentInsurance.amount
    },
    {
      component: "EOSB Accrual",
      calculation: result.eosb.eligible
        ? `${formatCurrency(result.eosb.amount)} / ${formatNumber(result.eosb.serviceMonths)} service months`
        : "Not applied for Bahraini employee",
      amount: result.eosb.monthlyEquivalent
    },
    {
      component: "Overtime Pay",
      calculation: "Day overtime + night overtime",
      amount: result.overtime.amount
    }
  ];

  return (
    <main className="home-reference-page labor-calculator-page">
      <section className="home-hero labor-hero">
        <div className="home-hero-copy labor-hero-copy">
          <h1>Labour Cost Calculator</h1>
          <p>Calculate monthly employer cost in BHD using labour law and SIO inputs.</p>
        </div>
      </section>

      <section className="labor-layout" aria-label="Labour cost calculator">
        <aside className="labor-panel labor-input-panel">
          <div className="labor-panel-heading">
            <span>
              <PersonIcon />
            </span>
            <h2>Employee Information</h2>
          </div>

          <form className="labor-form" noValidate>
            <label className="labor-field" htmlFor="labor-nationality">
              <span>Employee Nationality</span>
              <select
                id="labor-nationality"
                value={inputs.nationality}
                onChange={(event) => updateInput("nationality", event.target.value)}
              >
                {Object.entries(LABOR_CALCULATOR_CONFIG.nationalityOptions).map(
                  ([value, option]) => (
                    <option key={value} value={value}>
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </label>

            <NumericField
              field="basicSalary"
              label="Basic Salary (BHD)"
              value={inputs.basicSalary}
              error={validationErrors.basicSalary}
              onChange={updateInput}
            />

            <NumericField
              field="allowances"
              label="Allowances (BHD)"
              value={inputs.allowances}
              error={validationErrors.allowances}
              onChange={updateInput}
              helper="Used as eligible recurring allowance for EOSB wage."
            />

            <NumericField
              field="yearsOfService"
              label="Years of Service"
              value={inputs.yearsOfService}
              error={validationErrors.yearsOfService}
              onChange={updateInput}
              helper="Decimals are supported."
              step="0.1"
            />

            <div className="labor-overtime-fields">
              <NumericField
                field="dayOvertimeHours"
                label="Day Overtime Hours"
                value={inputs.dayOvertimeHours}
                error={validationErrors.dayOvertimeHours}
                onChange={updateInput}
                step="0.5"
              />
              <NumericField
                field="nightOvertimeHours"
                label="Night Overtime Hours"
                value={inputs.nightOvertimeHours}
                error={validationErrors.nightOvertimeHours}
                onChange={updateInput}
                step="0.5"
              />
            </div>

            <button
              type="button"
              className="labor-primary-action"
              onClick={focusResults}
              disabled={hasValidationErrors}
            >
              Calculate
            </button>
            <button type="button" className="labor-reset-action" onClick={resetCalculator}>
              <ResetIcon />
              Reset
            </button>
          </form>

          <div className="labor-note">
            <span>
              <InfoIcon />
            </span>
            <div>
              <h3>Important</h3>
              <p>
                Results are estimates based on configured Bahrain labour law and SIO rates.
                They do not replace formal legal or payroll advice.
              </p>
            </div>
          </div>
        </aside>

        <section className="labor-results-panel" id="labor-results">
          {hasValidationErrors ? (
            <p className="labor-validation-summary">
              Fix the highlighted fields to calculate a complete employer cost.
            </p>
          ) : null}

          <div className="labor-summary-grid">
            <article className="labor-metric-card">
              <div className="labor-metric-heading">
                <span>
                  <ChartIcon />
                </span>
                <h2>Total Employer Cost <small>Monthly</small></h2>
              </div>
              <strong>{formatCurrency(result.totalEmployerCost)}</strong>
              <p>Total monthly cost to employer</p>
            </article>

            <article className="labor-metric-card">
              <div className="labor-metric-heading">
                <span>
                  <BriefcaseIcon />
                </span>
                <h2>End-of-Service Benefit <small>Accrued</small></h2>
              </div>
              <strong>{formatCurrency(result.eosb.amount)}</strong>
              <p>{result.eosb.eligible ? "Total accrued EOSB estimate" : "Not applied"}</p>
            </article>
          </div>

          {capApplied ? (
            <div className="labor-cap-alert">
              <InfoIcon />
              <p>
                Insurance calculations use the insured salary cap of{" "}
                {formatCurrency(LABOR_CALCULATOR_CONFIG.insuredSalaryCap)}.
              </p>
            </div>
          ) : null}

          <article className="labor-panel labor-breakdown-panel">
            <div className="labor-panel-heading">
              <span>
                <TableIcon />
              </span>
              <h2>Cost Breakdown <small>Monthly</small></h2>
            </div>

            <div className="labor-table-wrap">
              <table className="labor-breakdown-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Component</th>
                    <th>Calculation</th>
                    <th>Amount (BHD)</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownRows.map((row, index) => (
                    <tr key={row.component}>
                      <td>{index + 1}</td>
                      <td>{row.component}</td>
                      <td>{row.calculation}</td>
                      <td>{formatCurrency(row.amount).replace(`${LABOR_CALCULATOR_CONFIG.currency} `, "")}</td>
                    </tr>
                  ))}
                  <tr className="labor-total-row">
                    <td colSpan="3">Total Employer Cost (Monthly)</td>
                    <td>{formatCurrency(result.totalEmployerCost)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <div className="labor-detail-grid">
            <article className="labor-panel labor-overtime-card">
              <div className="labor-panel-heading">
                <span>
                  <ClockIcon />
                </span>
                <h2>Overtime Breakdown</h2>
              </div>
              <dl>
                <div>
                  <dt>Hourly Wage</dt>
                  <dd>{formatCurrency(result.overtime.hourlyWage)}</dd>
                </div>
                <div>
                  <dt>Day Overtime ({formatNumber(result.overtime.dayOvertimeHours)} hrs @ {formatRate(LABOR_CALCULATOR_CONFIG.overtime.dayMultiplier)})</dt>
                  <dd>{formatCurrency(result.overtime.dayOvertimePay)}</dd>
                </div>
                <div>
                  <dt>Night Overtime ({formatNumber(result.overtime.nightOvertimeHours)} hrs @ {formatRate(LABOR_CALCULATOR_CONFIG.overtime.nightMultiplier)})</dt>
                  <dd>{formatCurrency(result.overtime.nightOvertimePay)}</dd>
                </div>
                <div className="labor-overtime-total">
                  <dt>Total Overtime Pay</dt>
                  <dd>{formatCurrency(result.overtime.amount)}</dd>
                </div>
              </dl>
            </article>

            <article className="labor-panel labor-explanation-card">
              <div className="labor-panel-heading">
                <span>
                  <BookIcon />
                </span>
                <h2>Calculation Explanation</h2>
              </div>
              <ul>
                <li>
                  Social insurance: {selectedNationality.label} employer rate (
                  {result.socialInsurance.rateLabel}) x min(basic salary,{" "}
                  {formatCurrency(LABOR_CALCULATOR_CONFIG.insuredSalaryCap)}).
                </li>
                <li>
                  Unemployment insurance: {result.unemploymentInsurance.rateLabel} x insured
                  salary base.
                </li>
                <li>
                  EOSB: {LABOR_CALCULATOR_CONFIG.eosb.firstTierMonthlyWageMultiplier} x
                  EOSB wage x first{" "}
                  {LABOR_CALCULATOR_CONFIG.eosb.firstTierYears} years, then{" "}
                  {LABOR_CALCULATOR_CONFIG.eosb.subsequentTierMonthlyWageMultiplier} x
                  EOSB wage x years after {LABOR_CALCULATOR_CONFIG.eosb.firstTierYears}.
                  Monthly equivalent = total accrued EOSB / service months.
                </li>
                {result.eosb.eligible ? (
                  <li>
                    SIO EOSB funding reference:{" "}
                    {formatRate(LABOR_CALCULATOR_CONFIG.eosb.sioMonthlyContributionRateFirstTier)}{" "}
                    in the first {LABOR_CALCULATOR_CONFIG.eosb.firstTierYears} years and{" "}
                    {formatRate(
                      LABOR_CALCULATOR_CONFIG.eosb.sioMonthlyContributionRateSubsequentTier
                    )}{" "}
                    after that. Current funding estimate:{" "}
                    {formatCurrency(result.eosb.currentSioMonthlyContribution)}.
                  </li>
                ) : (
                  <li>EOSB is not added for Bahraini employees in this employer-cost view.</li>
                )}
                <li>
                  Overtime: hourly wage = basic salary /{" "}
                  {LABOR_CALCULATOR_CONFIG.workingDaysPerMonth} days /{" "}
                  {LABOR_CALCULATOR_CONFIG.standardHoursPerDay} hours. Day overtime uses{" "}
                  {formatRate(LABOR_CALCULATOR_CONFIG.overtime.dayMultiplier)} and night
                  overtime uses {formatRate(LABOR_CALCULATOR_CONFIG.overtime.nightMultiplier)}.
                </li>
              </ul>
            </article>
          </div>
        </section>
      </section>

      <footer className="labor-footer-note">
        Based on labour law and Social Insurance Organization regulations.
      </footer>
    </main>
  );
}
