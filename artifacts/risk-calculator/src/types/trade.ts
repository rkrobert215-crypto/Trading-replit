export interface Trade {
  id: string;
  created_at?: string;
  updated_at?: string;
  trade_date: string;
  symbol: string;
  trade_type: string;
  instrument: string;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  option_type: string | null;
  strike_price: number | null;
  expiry_date: string | null;
  gross_pnl: number | null;
  charges: number | null;
  net_pnl: number | null;
  stop_loss: number | null;
  target: number | null;
  risk_amount: number | null;
  risk_reward_ratio: number | null;
  position_size_percent: number | null;
  capital_at_entry: number | null;
  strategy: string | null;
  setup_type: string | null;
  notes: string | null;
  status: string;
}
