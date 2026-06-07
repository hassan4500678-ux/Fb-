export const SALARY_DEFAULTS = Object.freeze({
  basicSalary: 20_000,
  petrol: 11_625,
  mobile: 500,
  bikeMaintenance: 1_000,
  dailyRounds: 2_600,
  halfDayDeduction: 150,
  absentDeduction: 2_766,
});

export function incentiveFor(category, percentage) {
  const tiers = {
    Biscuit: [
      [105, 13_500],
      [102, 11_500],
      [100, 9_500],
    ],
    Cake: [
      [105, 13_000],
      [102, 11_000],
      [100, 9_000],
    ],
    Piper: [
      [105, 37_000],
      [102, 34_500],
      [100, 32_000],
    ],
    Rider: [
      [105, 13_500],
      [102, 11_500],
      [100, 9_500],
    ],
  };

  const matched = (tiers[category] ?? tiers.Rider).find(([min]) => percentage >= min);
  return matched ? matched[1] : 0;
}

export function coinsForPoints(points) {
  if (points >= 60) return 200;
  if (points >= 30) return 100;
  return Math.max(0, Math.floor(points));
}

export function workingDays(year, month, holidayDates = []) {
  const holidays = new Set(holidayDates.map(String));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let count = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const isoDate = date.toISOString().slice(0, 10);
    const isFriday = date.getUTCDay() === 5;
    if (!isFriday && !holidays.has(isoDate)) count += 1;
  }

  return count;
}

export function dailyFixedTarget(monthlyTarget, workingDayCount) {
  if (!workingDayCount) return 0;
  return Number((Number(monthlyTarget) / workingDayCount).toFixed(2));
}

export function kpiPercentage(achieved, target) {
  if (!Number(target)) return 0;
  return Number(((Number(achieved) / Number(target)) * 100).toFixed(2));
}

export function salaryNet({
  halfDays = 0,
  absents = 0,
  kpiIncentive = 0,
  pcIncentive = 0,
  badgeBonus = 0,
} = {}) {
  const gross =
    SALARY_DEFAULTS.basicSalary +
    SALARY_DEFAULTS.petrol +
    SALARY_DEFAULTS.mobile +
    SALARY_DEFAULTS.bikeMaintenance +
    SALARY_DEFAULTS.dailyRounds +
    Number(kpiIncentive) +
    Number(pcIncentive) +
    Number(badgeBonus);

  const deductions =
    Number(halfDays) * SALARY_DEFAULTS.halfDayDeduction +
    Number(absents) * SALARY_DEFAULTS.absentDeduction;

  return {
    gross,
    deductions,
    netSalary: Math.max(0, Number((gross - deductions).toFixed(2))),
  };
}
