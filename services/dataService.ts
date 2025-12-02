import { supabase } from './supabaseClient';
import { Transaction, Debt, FinancialState } from '../types';

// Helper para garantir UUID válido ou null
const sanitizeUUID = (id: string | undefined | null) => {
  if (!id || typeof id !== 'string') return null;
  const trimmed = id.trim();
  if (trimmed === '') return null;
  return trimmed;
};

export const dataService = {
  
  // Load all data
  async fetchFinancialState(): Promise<FinancialState> {
    // 1. Fetch Transactions (Associated with the logged user via RLS)
    const { data: transData, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: true });

    if (transError) console.error('Error fetching transactions:', transError);

    // 2. Fetch Debts (Associated with the logged user via RLS)
    const { data: debtData, error: debtError } = await supabase
      .from('debts')
      .select('*')
      .order('remaining_amount', { ascending: false });

    if (debtError) console.error('Error fetching debts:', debtError);

    // Map to App Types
    const transactions: Transaction[] = (transData || []).map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: Number(t.amount),
      type: t.type,
      category: t.category,
      status: t.status,
      linkedDebtId: t.linked_debt_id // Map snake_case to camelCase
    }));

    const debts: Debt[] = (debtData || []).map(d => ({
      id: d.id,
      creditor: d.creditor,
      totalAmount: Number(d.total_amount),
      remainingAmount: Number(d.remaining_amount),
      interestRate: Number(d.interest_rate),
      dueDateDay: d.due_date_day,
      priority: d.priority
    }));

    return {
      currentBalance: 0, // Always 0 initially
      transactions,
      debts
    };
  },

  // --- Transactions ---

  async addTransactions(transactions: Omit<Transaction, 'id'>[]) {
    const records = transactions.map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        status: t.status,
        linked_debt_id: sanitizeUUID(t.linkedDebtId) // Sanitize here
    }));
    
    // RLS in Supabase automatically assigns the auth.uid() to the user_id column
    const { error } = await supabase.from('transactions').insert(records);
    if (error) {
        console.error("Supabase Insert Error:", error);
        throw new Error(error.message);
    }
  },

  async updateTransaction(t: Transaction) {
    // Dynamic payload construction to handle linked_debt_id properly
    const payload: any = {
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        status: t.status
    };

    // Only include linked_debt_id if it is a valid UUID, otherwise send null or omit if you want strict behavior
    // Sending null is safer to clear a previous link
    payload.linked_debt_id = sanitizeUUID(t.linkedDebtId);

    const { error } = await supabase.from('transactions').update(payload).eq('id', t.id);
    
    if (error) {
        console.error("Supabase Update Error:", error);
        throw new Error(error.message);
    }
  },

  async deleteTransaction(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Debts ---

  async addDebt(d: Omit<Debt, 'id'>) {
    const { error } = await supabase.from('debts').insert({
        creditor: d.creditor,
        total_amount: d.totalAmount,
        remaining_amount: d.remainingAmount,
        interest_rate: d.interestRate,
        due_date_day: d.dueDateDay,
        priority: d.priority
    });
    if (error) throw error;
  },

  async updateDebt(d: Debt) {
    const { error } = await supabase.from('debts').update({
        creditor: d.creditor,
        total_amount: d.totalAmount,
        remaining_amount: d.remainingAmount,
        interest_rate: d.interestRate,
        due_date_day: d.dueDateDay,
        priority: d.priority
    }).eq('id', d.id);
    if (error) throw error;
  },

  async deleteDebt(id: string) {
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (error) throw error;
  }
};