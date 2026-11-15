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

  return parsed.data.map((row) => ({
    timestamp: row.timestamp,
    EURUSD: Number(row.EURUSD),
    USDJPY: Number(row.USDJPY),
    USDSGD: Number(row.USDSGD),
  }));
}