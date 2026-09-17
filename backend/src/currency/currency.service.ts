/**
 * Peto Centralized Multi-Currency & Exchange Rate Service
 * File: backend/src/currency/currency.service.ts
 */

export interface CurrencyMetadata {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  rateToUsd: number; // e.g. 1 USD = 87.0 INR => rateToUsd for INR is 1/87.0
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyMetadata> = {
  USD: {
    code: "USD",
    symbol: "$",
    name: "United States Dollar",
    decimals: 2,
    rateToUsd: 1.0,
  },
  INR: {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
    decimals: 2,
    rateToUsd: 1 / 87.0,
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    decimals: 2,
    rateToUsd: 1.08,
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    decimals: 2,
    rateToUsd: 1.28,
  },
  CAD: {
    code: "CAD",
    symbol: "CA$",
    name: "Canadian Dollar",
    decimals: 2,
    rateToUsd: 0.73,
  },
  AUD: {
    code: "AUD",
    symbol: "AU$",
    name: "Australian Dollar",
    decimals: 2,
    rateToUsd: 0.65,
  },
  SGD: {
    code: "SGD",
    symbol: "SG$",
    name: "Singapore Dollar",
    decimals: 2,
    rateToUsd: 0.76,
  },
  AED: {
    code: "AED",
    symbol: "د.إ",
    name: "UAE Dirham",
    decimals: 2,
    rateToUsd: 0.27,
  },
  JPY: {
    code: "JPY",
    symbol: "¥",
    name: "Japanese Yen",
    decimals: 0,
    rateToUsd: 0.0066,
  },
};

export class CurrencyService {
  /**
   * Return metadata for a currency code with safe USD fallback
   */
  static getMetadata(currencyCode?: string): CurrencyMetadata {
    const code = (currencyCode || "USD").toUpperCase().trim();
    return SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES["USD"];
  }

  /**
   * Return formatted currency symbol
   */
  static getSymbol(currencyCode?: string): string {
    return this.getMetadata(currencyCode).symbol;
  }

  /**
   * Convert an amount between two currencies
   */
  static convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): {
    sourceAmount: number;
    sourceCurrency: string;
    targetAmount: number;
    targetCurrency: string;
    exchangeRate: number;
    rateTimestamp: string;
    rateSource: string;
  } {
    const fromMeta = this.getMetadata(fromCurrency);
    const toMeta = this.getMetadata(toCurrency);

    if (fromMeta.code === toMeta.code) {
      return {
        sourceAmount: amount,
        sourceCurrency: fromMeta.code,
        targetAmount: amount,
        targetCurrency: toMeta.code,
        exchangeRate: 1.0,
        rateTimestamp: new Date().toISOString(),
        rateSource: "PETO_CENTRAL_BANK_RATES",
      };
    }

    // Convert to USD first, then to target currency
    const amountInUsd = amount * fromMeta.rateToUsd;
    const targetRaw = amountInUsd / toMeta.rateToUsd;
    const exchangeRate = fromMeta.rateToUsd / toMeta.rateToUsd;

    const targetAmount =
      toMeta.decimals === 0
        ? Math.round(targetRaw)
        : parseFloat(targetRaw.toFixed(toMeta.decimals));

    return {
      sourceAmount: amount,
      sourceCurrency: fromMeta.code,
      targetAmount,
      targetCurrency: toMeta.code,
      exchangeRate: parseFloat(exchangeRate.toFixed(6)),
      rateTimestamp: new Date().toISOString(),
      rateSource: "PETO_CENTRAL_BANK_RATES",
    };
  }

  /**
   * Compute standard nominal billable ad event cost in the account's fixed currency
   */
  static calculateAdEventCost(
    eventType: "IMPRESSION" | "CLICK",
    currencyCode: string = "USD"
  ): number {
    const currency = (currencyCode || "USD").toUpperCase();
    const meta = this.getMetadata(currency);

    // Baseline USD pricing: $0.01 per impression, $0.25 per click
    const baseCostUsd = eventType === "IMPRESSION" ? 0.01 : 0.25;

    if (currency === "USD") {
      return baseCostUsd;
    }

    // Convert baseline USD cost into target account currency
    const costInLocal = baseCostUsd / meta.rateToUsd;
    return meta.decimals === 0
      ? Math.max(1, Math.round(costInLocal))
      : parseFloat(Math.max(0.01, costInLocal).toFixed(2));
  }
}
