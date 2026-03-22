export interface OptionInputs {
  spotPrice: number;
  strikePrice: number;
  daysToExpiry: number;
  volatility: number;
  riskFreeRate: number;
  optionType: 'CE' | 'PE';
}

export interface GreeksResult {
  premium: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  intrinsicValue: number;
  timeValue: number;
}

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export function calculateGreeks(inputs: OptionInputs): GreeksResult {
  const { spotPrice, strikePrice, daysToExpiry, volatility, riskFreeRate, optionType } = inputs;

  const S = spotPrice;
  const K = strikePrice;
  const T = daysToExpiry / 365;
  const sigma = volatility / 100;
  const r = riskFreeRate / 100;

  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) {
    const intrinsicValue = optionType === 'CE'
      ? Math.max(0, S - K)
      : Math.max(0, K - S);
    return {
      premium: intrinsicValue,
      delta: optionType === 'CE' ? (S > K ? 1 : 0) : (S < K ? -1 : 0),
      gamma: 0,
      theta: 0,
      vega: 0,
      intrinsicValue,
      timeValue: 0,
    };
  }

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  let premium: number;
  let delta: number;

  if (optionType === 'CE') {
    premium = S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
    delta = normalCDF(d1);
  } else {
    premium = K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
    delta = normalCDF(d1) - 1;
  }

  const gamma = normalPDF(d1) / (S * sigma * Math.sqrt(T));

  const thetaAnnual = optionType === 'CE'
    ? -((S * normalPDF(d1) * sigma) / (2 * Math.sqrt(T))) - r * K * Math.exp(-r * T) * normalCDF(d2)
    : -((S * normalPDF(d1) * sigma) / (2 * Math.sqrt(T))) + r * K * Math.exp(-r * T) * normalCDF(-d2);
  const theta = thetaAnnual / 365;

  const vega = (S * Math.sqrt(T) * normalPDF(d1)) / 100;

  const intrinsicValue = optionType === 'CE'
    ? Math.max(0, S - K)
    : Math.max(0, K - S);
  const timeValue = Math.max(0, premium - intrinsicValue);

  return {
    premium: Math.max(0, premium),
    delta,
    gamma,
    theta,
    vega,
    intrinsicValue,
    timeValue,
  };
}

export const LOT_SIZES: Record<string, number> = {
  NIFTY: 25,
  BANKNIFTY: 15,
  FINNIFTY: 25,
  MIDCPNIFTY: 50,
  STOCK: 1,
};

export type IndexType = keyof typeof LOT_SIZES;
