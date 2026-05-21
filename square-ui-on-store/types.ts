// ── Square Money ──────────────────────────────────────────────────────────────
export type SquareMoney = {
  amount: number;
  currency: string;
};

// ── Square Orders API ─────────────────────────────────────────────────────────
export type SquareAppliedDiscount = {
  uid: string;
  discount_uid: string;
  applied_money: SquareMoney;
};

export type SquareLineItem = {
  uid: string;
  name: string;
  quantity: string;
  base_price_money: SquareMoney;
  gross_sales_money: SquareMoney;
  total_tax_money: SquareMoney;
  total_discount_money: SquareMoney;
  total_money: SquareMoney;
  variation_total_price_money: SquareMoney;
  total_service_charge_money: SquareMoney;
  applied_discounts?: SquareAppliedDiscount[];
};

export type SquareDiscount = {
  uid: string;
  name: string;
  percentage?: string;
  amount_money?: SquareMoney;
  applied_money: SquareMoney;
  type: string;
  scope: string;
};

export type SquareOrder = {
  id: string;
  location_id: string;
  created_at: string;
  updated_at: string;
  state: string;
  version: number;
  line_items: SquareLineItem[];
  discounts?: SquareDiscount[];
  total_money: SquareMoney;
  total_tax_money: SquareMoney;
  total_discount_money: SquareMoney;
  total_tip_money: SquareMoney;
  total_service_charge_money: SquareMoney;
  net_amounts: {
    total_money: SquareMoney;
    tax_money: SquareMoney;
    discount_money: SquareMoney;
    tip_money: SquareMoney;
    service_charge_money: SquareMoney;
  };
};

// ── Square Payments API ───────────────────────────────────────────────────────
export type SquarePayment = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string; // COMPLETED | FAILED | CANCELED
  amount_money: SquareMoney;
  total_money: SquareMoney;
  order_id: string;
  location_id: string;
  receipt_number: string;
  receipt_url?: string;
};

// ── Merged type used in the frontend ─────────────────────────────────────────
// Payment + Order merged by the backend (or dummy data)
export type SquareTransaction = {
  payment: SquarePayment;
  order: SquareOrder;
};

export type SquareTransactionsResponse = {
  location_name: string;
  transactions: SquareTransaction[];
  cursor?: string;
};
