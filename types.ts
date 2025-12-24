
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
  monthLabel: string;
  openingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  closingBalance: number;
  notes: string;
}

export interface EconomicProfile {
  category: string;
  description: string;
  score: number; // 0-100
  keyAdvice: string;
  strengths: string[];
  weaknesses: string[];
}

export interface AnnualReportResponse {
  economicProfile: EconomicProfile;
  annualSummary: {
    totalProjectedIncome: number;
    totalProjectedExpenses: number;
    totalProjectedSavings: number;
    averageMonthlyBalance: number;
  };
  projections: MonthlyProjection[];
}

export interface FinancialState {
  currentBalance: number;
  transactions: Transaction[];
  debts: Debt[];
}

// Fixed missing AIPlanResponse export for AI strategy features
export interface AIPlanResponse {
  estimatedDebtFreeDate: string;
  strategySummary: string;
  projections: {
    monthLabel: string;
    openingBalance: number;
    totalIncome: number;
    fixedExpenses: number;
    debtPayments: {
      creditor: string;
      amount: number;
    }[];
    closingBalance: number;
    notes: string;
  }[];
}
