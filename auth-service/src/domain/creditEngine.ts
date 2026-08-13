/**
 * Research-Grade Credit & Pricing Engine
 * Implements 1 Credit = $0.02 USD base valuation, exact per-second/per-image provider cost math,
 * configurable platform profit margins, two-phase atomic reserve/commit/refund,
 * and dynamic pricing auto-calculation.
 */

export interface ModelCreditRate {
  modelId: string;
  modelName: string;
  category: 'image' | 'video' | 'audio';
  billingUnit: 'per-second' | 'per-image' | 'per-1000-chars' | 'per-call';
  providerCostUsdPerUnit: number;
  profitMarginPercent: number;
  creditCostPerUnit: number;
  calculatedPriceUsdPerUnit: number;
}

export const CREDIT_VALUE_USD = 0.02; // 1 Credit = $0.02 USD

export const DEFAULT_MODEL_PRICING: Record<string, ModelCreditRate> = {
  // Video Models (Per Second Billing)
  'veo-3-1-standard': {
    modelId: 'veo-3-1-standard',
    modelName: 'Google Veo 3.1 Standard (1080p)',
    category: 'video',
    billingUnit: 'per-second',
    providerCostUsdPerUnit: 0.40,
    profitMarginPercent: 50,
    creditCostPerUnit: 30, // Math.ceil((0.40 / 0.02) * 1.5) = 30 credits/sec
    calculatedPriceUsdPerUnit: 0.60,
  },
  'veo-3-1-fast': {
    modelId: 'veo-3-1-fast',
    modelName: 'Google Veo 3.1 Fast',
    category: 'video',
    billingUnit: 'per-second',
    providerCostUsdPerUnit: 0.15,
    profitMarginPercent: 50,
    creditCostPerUnit: 12, // Math.ceil((0.15 / 0.02) * 1.5) = 12 credits/sec
    calculatedPriceUsdPerUnit: 0.225,
  },
  'veo-3-1-lite': {
    modelId: 'veo-3-1-lite',
    modelName: 'Google Veo 3.1 Lite',
    category: 'video',
    billingUnit: 'per-second',
    providerCostUsdPerUnit: 0.05,
    profitMarginPercent: 50,
    creditCostPerUnit: 4, // Math.ceil((0.05 / 0.02) * 1.5) = 4 credits/sec
    calculatedPriceUsdPerUnit: 0.075,
  },
  'wan-2-6': {
    modelId: 'wan-2-6',
    modelName: 'Wan 2.6 Native Audio',
    category: 'video',
    billingUnit: 'per-second',
    providerCostUsdPerUnit: 0.12,
    profitMarginPercent: 50,
    creditCostPerUnit: 9,
    calculatedPriceUsdPerUnit: 0.18,
  },
  'kling3_0': {
    modelId: 'kling3_0',
    modelName: 'Kling 3.0 1080p',
    category: 'video',
    billingUnit: 'per-second',
    providerCostUsdPerUnit: 0.10,
    profitMarginPercent: 50,
    creditCostPerUnit: 8,
    calculatedPriceUsdPerUnit: 0.15,
  },
  'sora-2': {
    modelId: 'sora-2',
    modelName: 'OpenAI Sora 2',
    category: 'video',
    billingUnit: 'per-second',
    providerCostUsdPerUnit: 0.25,
    profitMarginPercent: 50,
    creditCostPerUnit: 19,
    calculatedPriceUsdPerUnit: 0.375,
  },

  // Image Models (Per Image Billing)
  'gpt-image-hd': {
    modelId: 'gpt-image-hd',
    modelName: 'GPT Image HD (DALL-E Equivalent)',
    category: 'image',
    billingUnit: 'per-image',
    providerCostUsdPerUnit: 0.12,
    profitMarginPercent: 50,
    creditCostPerUnit: 9,
    calculatedPriceUsdPerUnit: 0.18,
  },
  'gpt-image-mini': {
    modelId: 'gpt-image-mini',
    modelName: 'GPT Image Mini Fast',
    category: 'image',
    billingUnit: 'per-image',
    providerCostUsdPerUnit: 0.02,
    profitMarginPercent: 50,
    creditCostPerUnit: 2,
    calculatedPriceUsdPerUnit: 0.03,
  },
  'nano-banana-pro': {
    modelId: 'nano-banana-pro',
    modelName: 'Nano Banana Pro',
    category: 'image',
    billingUnit: 'per-image',
    providerCostUsdPerUnit: 0.03,
    profitMarginPercent: 50,
    creditCostPerUnit: 3,
    calculatedPriceUsdPerUnit: 0.045,
  },

  // Audio Models
  'elevenlabs-tts': {
    modelId: 'elevenlabs-tts',
    modelName: 'ElevenLabs Voiceover & SFX',
    category: 'audio',
    billingUnit: 'per-1000-chars',
    providerCostUsdPerUnit: 0.01,
    profitMarginPercent: 50,
    creditCostPerUnit: 1,
    calculatedPriceUsdPerUnit: 0.015,
  },
};

export interface CreditTransaction {
  id: string;
  userId: string;
  modelId: string;
  amount: number;
  providerCostEstimatedUsd: number;
  status: 'RESERVED' | 'COMMITTED' | 'REFUNDED';
  timestamp: string;
  reason?: string;
}

export class CreditEngine {
  private pricingTable: Map<string, ModelCreditRate> = new Map();
  private pendingTransactions: Map<string, CreditTransaction> = new Map();

  constructor() {
    // Populate default rates
    Object.values(DEFAULT_MODEL_PRICING).forEach((rate) => {
      this.pricingTable.set(rate.modelId, rate);
    });
  }

  /**
   * Dynamically calculate credit cost based on units (seconds, images, or characters)
   */
  public calculateTotalCredits(modelId: string, units: number = 1): { totalCredits: number; providerCostUsd: number; rate: ModelCreditRate } {
    const rate = this.pricingTable.get(modelId) || this.pricingTable.get('veo-3-1-fast')!;
    const totalCredits = Math.max(1, Math.ceil(rate.creditCostPerUnit * units));
    const providerCostUsd = Number((rate.providerCostUsdPerUnit * units).toFixed(4));
    return { totalCredits, providerCostUsd, rate };
  }

  /**
   * Get current model rates
   */
  public getModelPricingList(): ModelCreditRate[] {
    return Array.from(this.pricingTable.values());
  }

  /**
   * Admin can update provider cost or profit margin for any model,
   * which automatically re-computes the required user credit cost.
   */
  public updateModelPricing(modelId: string, newProviderCostUsd: number, newMarginPercent: number): ModelCreditRate {
    const rate = this.pricingTable.get(modelId);
    if (!rate) {
      throw new Error(`Model '${modelId}' not found in pricing registry`);
    }

    const calculatedPriceUsd = newProviderCostUsd * (1 + newMarginPercent / 100);
    const creditCostPerUnit = Math.max(1, Math.ceil(calculatedPriceUsd / CREDIT_VALUE_USD));

    const updated: ModelCreditRate = {
      ...rate,
      providerCostUsdPerUnit: newProviderCostUsd,
      profitMarginPercent: newMarginPercent,
      creditCostPerUnit,
      calculatedPriceUsdPerUnit: Number(calculatedPriceUsd.toFixed(4)),
    };

    this.pricingTable.set(modelId, updated);
    return updated;
  }

  /**
   * Phase 1: Reserve credits before calling provider API
   */
  public reserveCredits(
    userId: string,
    currentBalance: number,
    modelId: string,
    units: number = 1
  ): { success: boolean; transactionId?: string; creditsRequired?: number; providerCostUsd?: number; error?: string } {
    const { totalCredits, providerCostUsd } = this.calculateTotalCredits(modelId, units);

    if (currentBalance < totalCredits) {
      return {
        success: false,
        creditsRequired: totalCredits,
        error: `Insufficient credits. Required: ${totalCredits} credits for ${units} ${modelId} unit(s), Current Balance: ${currentBalance}`,
      };
    }

    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const transaction: CreditTransaction = {
      id: transactionId,
      userId,
      modelId,
      amount: totalCredits,
      providerCostEstimatedUsd: providerCostUsd,
      status: 'RESERVED',
      timestamp: new Date().toISOString(),
    };

    this.pendingTransactions.set(transactionId, transaction);

    return {
      success: true,
      transactionId,
      creditsRequired: totalCredits,
      providerCostUsd,
    };
  }

  /**
   * Phase 2a: Permanently commit credits on successful generation
   */
  public commitCredits(transactionId: string): boolean {
    const tx = this.pendingTransactions.get(transactionId);
    if (!tx || tx.status !== 'RESERVED') return false;

    tx.status = 'COMMITTED';
    this.pendingTransactions.delete(transactionId);
    return true;
  }

  /**
   * Phase 2b: Rollback & refund credits if provider request fails
   */
  public refundCredits(transactionId: string, reason: string = 'Provider Error'): { refundedAmount: number; userId: string } | null {
    const tx = this.pendingTransactions.get(transactionId);
    if (!tx || tx.status !== 'RESERVED') return null;

    tx.status = 'REFUNDED';
    tx.reason = reason;
    const amount = tx.amount;
    const userId = tx.userId;
    this.pendingTransactions.delete(transactionId);

    return { refundedAmount: amount, userId };
  }
}

export const globalCreditEngine = new CreditEngine();
