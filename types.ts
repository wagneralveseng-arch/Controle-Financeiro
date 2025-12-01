export type TransactionType = 'INCOME' | 'EXPENSE' | 'SAVING';

export interface Transaction {
  id: string;
  date: string; // ISO Date full
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  status: 'PENDING' | 'PAID';
  linkedDebtId?: string; // ID of the debt this transaction pays off
}

export interface Debt {
  id: string;
  creditor: string;
  totalAmount: number;
  remainingAmount: number;
  interestRate: number; // Monthly interest rate %
  dueDateDay: number; // Day of the month
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  monthlyPayment?: number; // For fixed installments
  installmentsRemaining?: number;
}

export interface MonthlyProjection {
  monthIndex: number; // 0 for current, 1 for next month...
  monthLabel: string;
  openingBalance: number;
  totalIncome: number;
  fixedExpenses: number;
  debtPayments: { debtId: string; amount: number; creditor: string }[];
  closingBalance: number;
  notes: string;
}

export interface FinancialState {
  currentBalance: number;
  transactions: Transaction[];
  debts: Debt[];
}

export interface AIPlanResponse {
  strategySummary: string;
  projections: MonthlyProjection[];
  estimatedDebtFreeDate: string;
}