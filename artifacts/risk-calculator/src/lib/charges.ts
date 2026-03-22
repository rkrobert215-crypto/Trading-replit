export type Segment = 'equity-cnc' | 'equity-intraday' | 'futures' | 'options';

export interface ChargesBreakdown {
  brokerage: number;
  stt: number;
  exchangeCharges: number;
  gst: number;
  sebi: number;
  stampDuty: number;
  total: number;
}

export function calculateCharges(positionValue: number, segment: Segment): ChargesBreakdown {
  const brokeragePerOrder = Math.min(20, positionValue * 0.0003);
  const brokerage = brokeragePerOrder * 2;

  let stt: number;
  let exchangeCharges: number;

  switch (segment) {
    case 'equity-cnc':
      stt = positionValue * 0.001 * 2;
      exchangeCharges = positionValue * 0.0000345 * 2;
      break;
    case 'equity-intraday':
      stt = positionValue * 0.00025;
      exchangeCharges = positionValue * 0.0000345 * 2;
      break;
    case 'futures':
      stt = positionValue * 0.000125;
      exchangeCharges = positionValue * 0.0000173 * 2;
      break;
    case 'options':
      stt = positionValue * 0.000625;
      exchangeCharges = positionValue * 0.0000505 * 2;
      break;
  }

  const gst = (brokerage + exchangeCharges) * 0.18;
  const sebi = positionValue * 0.000001 * 2;
  const stampDuty = positionValue * 0.00003;

  const total = brokerage + stt + exchangeCharges + gst + sebi + stampDuty;

  return { brokerage, stt, exchangeCharges, gst, sebi, stampDuty, total };
}
