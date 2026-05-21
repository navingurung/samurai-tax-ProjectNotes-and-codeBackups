import type { SquareTransactionsResponse } from "./types";
import { DUMMY_SQUARE_TRANSACTIONS } from "./dummyData";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const fetchSquareTransactions = async (params?: {
  date?: string;
  status?: string;
  query?: string;
}): Promise<SquareTransactionsResponse> => {
  await delay(600);

  let transactions = [...DUMMY_SQUARE_TRANSACTIONS.transactions];

  if (params?.status && params.status !== "ALL") {
    transactions = transactions.filter(
      (tx) => tx.payment.status === params.status,
    );
  }

  if (params?.date) {
    transactions = transactions.filter((tx) =>
      tx.payment.created_at.startsWith(params.date!),
    );
  }

  if (params?.query) {
    const q = params.query.toLowerCase();
    transactions = transactions.filter(
      (tx) =>
        tx.payment.id.toLowerCase().includes(q) ||
        tx.payment.order_id.toLowerCase().includes(q) ||
        tx.payment.receipt_number.toLowerCase().includes(q),
    );
  }

  return {
    location_name: DUMMY_SQUARE_TRANSACTIONS.location_name,
    transactions,
  };
};
