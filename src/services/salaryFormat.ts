const salaryPeriodLabels: Record<string, string> = {
  연봉: '연',
  연간: '연',
  연: '연',
  월급: '월',
  월간: '월',
  월: '월',
  시간급: '시급',
  시급: '시급',
  일급: '일급',
  주급: '주급',
};

const salaryPeriodPattern = /^(연봉|연간|월급|월간|시간급|시급|일급|주급|연|월)\s*/;
const amountPattern = /(\d[\d,]*(?:\.\d+)?)\s*(만원|만\s*원|만|원)/g;

function formatNumber(value: string): string {
  const normalized = value.replaceAll(',', '');
  const match = /^(\d+)(?:\.(\d+))?$/.exec(normalized);
  if (!match) return value;
  const integer = (match[1] || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return match[2] ? `${integer}.${match[2]}` : integer;
}

function formatWholeWonAsManWon(value: string): string {
  const amount = BigInt(value);
  const wholeManWon = amount / 10_000n;
  const remainder = (amount % 10_000n)
    .toString()
    .padStart(4, '0')
    .replace(/0+$/, '');
  const decimal = remainder ? `.${remainder}` : '';

  return `${formatNumber(wholeManWon.toString())}${decimal}만 원`;
}

function formatAmount(value: string, unit: string, convertWholeWonToManWon: boolean): string {
  const normalizedValue = value.replaceAll(',', '');
  const isWholeAmount = /^\d+$/.test(normalizedValue);
  const normalizedUnit = unit.replaceAll(' ', '');

  if (
    convertWholeWonToManWon &&
    normalizedUnit === '원' &&
    isWholeAmount &&
    BigInt(normalizedValue) >= 10_000n
  ) {
    return formatWholeWonAsManWon(normalizedValue);
  }

  if (normalizedUnit !== '원') return `${formatNumber(value)}만 원`;
  return `${formatNumber(value)}원`;
}

function stripRepeatedPeriod(value: string): string {
  let result = value;
  while (salaryPeriodPattern.test(result)) result = result.replace(salaryPeriodPattern, '').trim();
  return result;
}

/**
 * Formats source salary text for display without converting its pay period.
 * Annual, monthly, daily, and weekly whole-won amounts use exact man-won notation above 10,000 won.
 * Hourly and period-less amounts stay in won because converting them would obscure their meaning.
 */
export function formatSalaryDisplay(rawSalary?: string): string {
  if (typeof rawSalary !== 'string') return '';
  let value = rawSalary.trim().replace(/\s+/g, ' ');
  if (!value) return '';

  const isMinimumAnnual = /^최소\s*연봉\s*\/?\s*/.test(value);
  let period = '';
  if (isMinimumAnnual) {
    period = '연';
    value = value.replace(/^최소\s*연봉\s*\/?\s*/, '').trim();
  } else {
    const periodMatch = salaryPeriodPattern.exec(value);
    if (periodMatch) {
      period = salaryPeriodLabels[periodMatch[1] || ''] || '';
      value = stripRepeatedPeriod(value.slice(periodMatch[0].length).trim());
    }
  }

  const repeatedPeriodPattern =
    period === '연'
      ? /(?:연봉|연간|연)\s*(?=\d)/g
      : period === '월'
        ? /(?:월급|월간|월)\s*(?=\d)/g
        : period === '시급'
          ? /(?:시간급|시급)\s*(?=\d)/g
          : period === '일급'
            ? /일급\s*(?=\d)/g
            : period === '주급'
              ? /주급\s*(?=\d)/g
              : null;
  if (repeatedPeriodPattern) value = value.replace(repeatedPeriodPattern, '');

  value = value.replace(/협의\s*가능/g, '협의 가능');

  let negotiationNote = '';
  if (isMinimumAnnual) {
    if (/면접\s*후\s*협의 가능/.test(value)) {
      negotiationNote = '면접 후 협의 가능';
      value = value.replace(/\s*(?:[-·]\s*)?\(?면접\s*후\s*협의 가능\)?\s*/, '').trim();
    } else if (/협의 가능/.test(value)) {
      negotiationNote = '협의 가능';
      value = value.replace(/\s*(?:[-·]\s*)?\(?협의 가능\)?\s*/, '').trim();
    }
  }

  // Infer a missing unit on the first value of a range, such as 4500~6000만원.
  value = value.replace(
    /(\d[\d,]*(?:\.\d+)?)\s*(?:~|-|–)\s*(\d[\d,]*(?:\.\d+)?)\s*(만원|만\s*원|만|원)/g,
    '$1$3 ~ $2$3',
  );
  const convertWholeWonToManWon = ['연', '월', '일급', '주급'].includes(period);
  value = value.replace(amountPattern, (_match, amount: string, unit: string) =>
    formatAmount(amount, unit, convertWholeWonToManWon),
  );
  value = value.replace(/원\s*(?:~|-|–)\s*(?=\d)/g, '원 ~ ');
  value = value.replace(/\s+/g, ' ').replace(/,\s*$/, '').trim();

  if (isMinimumAnnual && !value.includes('이상')) {
    const noteSeparatorIndex = value.indexOf(' - ');
    value =
      noteSeparatorIndex > -1
        ? `${value.slice(0, noteSeparatorIndex)} 이상${value.slice(noteSeparatorIndex)}`
        : `${value} 이상`;
  }
  if (negotiationNote) value = `${value} (${negotiationNote})`;

  return [period, value].filter(Boolean).join(' ');
}
