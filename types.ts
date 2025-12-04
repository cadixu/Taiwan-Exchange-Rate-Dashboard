export interface ExchangeRate {
  currency: string;
  currencyName?: string;
  cashBuy: number | null;
  cashSell: number | null;
  spotBuy: number | null;
  spotSell: number | null;
}

export interface CalculatedRate extends ExchangeRate {
  cashMid: number | null;
  spotMid: number | null;
}

export interface FetchState {
  loading: boolean;
  error: string | null;
  data: CalculatedRate[];
  lastUpdated: Date | null;
}
