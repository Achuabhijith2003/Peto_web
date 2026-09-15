import { PaymentAdapter } from "./adapters/payment.adapter.interface";
import { StripeAdapter } from "./adapters/stripe.adapter";
import { RazorpayAdapter } from "./adapters/razorpay.adapter";
import { PaymentProvider } from "./payment.types";
import { getRegionalConfig, assertPaymentsEnabled } from "../regions/regional.service";

export class PaymentRouter {
  private static stripeAdapter = new StripeAdapter();
  private static razorpayAdapter = new RazorpayAdapter();

  /**
   * Get adapter by provider enum
   */
  static getAdapter(provider: PaymentProvider): PaymentAdapter {
    switch (provider) {
      case "RAZORPAY":
        return this.razorpayAdapter;
      case "STRIPE":
      default:
        return this.stripeAdapter;
    }
  }

  /**
   * Route to the optimal payment provider based on country, currency, and regional rules
   */
  static async selectProvider(
    country: string,
    currency: string,
    preferredProvider?: PaymentProvider
  ): Promise<{ adapter: PaymentAdapter; resolvedProvider: PaymentProvider; currency: string }> {
    // 1. Enforce regional payments availability
    await assertPaymentsEnabled(country);

    // 2. Load regional configuration
    const regionalConfig = await getRegionalConfig(country);
    const supportedProviders = regionalConfig.supported_payment_providers || ["STRIPE"];
    const targetCurrency = currency
      ? currency.toUpperCase()
      : regionalConfig.default_currency || "USD";

    // 3. If explicit preferred provider was requested and is permitted in this country
    if (preferredProvider && supportedProviders.includes(preferredProvider)) {
      return {
        adapter: this.getAdapter(preferredProvider),
        resolvedProvider: preferredProvider,
        currency: targetCurrency,
      };
    }

    // 4. Country / Currency Smart Routing
    const upperCountry = country.toUpperCase().trim();
    if (
      (upperCountry === "IN" || targetCurrency === "INR") &&
      supportedProviders.includes("RAZORPAY")
    ) {
      return {
        adapter: this.razorpayAdapter,
        resolvedProvider: "RAZORPAY",
        currency: "INR",
      };
    }

    // Default provider for this region
    const defaultProv = (regionalConfig.default_payment_provider as PaymentProvider) || "STRIPE";
    return {
      adapter: this.getAdapter(defaultProv),
      resolvedProvider: defaultProv,
      currency: targetCurrency,
    };
  }
}
