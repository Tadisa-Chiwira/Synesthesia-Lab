import Papa from 'papaparse';

export type FxRow = {
  timestamp: string;
  EURUSD: number;
  USDJPY: number;
  USDSGD: number;
};

type CsvRow = {
  timestamp: string;
  EURUSD: string;
  USDJPY: string;
  USDSGD: string;
};

export async function loadFxData(): Promise<FxRow[]> {
  const response = await fetch('/data/fx-data.csv');

  if (!response.ok) {
    throw new Error('Could not load the FX dataset');
  }

  const csvText = await response.text();

  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0].message);
  }

  const rows = parsed.data.map((row) => ({
    timestamp: row.timestamp,
    EURUSD: Number(row.EURUSD),
    USDJPY: Number(row.USDJPY),
    USDSGD: Number(row.USDSGD),
  }));
  if (rows.length < 21 || rows.some(row =>
    !Number.isFinite(Date.parse(row.timestamp)) ||
    [row.EURUSD, row.USDJPY, row.USDSGD].some(rate => !Number.isFinite(rate) || rate <= 0)
  )) {
    throw new Error('FX data must contain at least 21 dated observations with positive rates');
  }
  if (rows.some((row, i) => i > 0 && Date.parse(row.timestamp) <= Date.parse(rows[i - 1].timestamp))) {
    throw new Error('FX observations must be in chronological order');
  }
  return rows;
}
