import { supabase } from './supabaseClient';
import { Transaction, Debt, FinancialState } from '../types';

// Dados Iniciais para Semeadura (Seed) - Perfil Analista
const INITIAL_TRANSACTIONS = [
    // VALE CLUSTER (15-30) - Dezembro 2025
    { date: '2025-12-15T10:00:00.000Z', description: 'Renda Mensal (Vale)', amount: 2323.20, type: 'INCOME', category: 'Salary', status: 'PAID' },
    { date: '2025-12-15T10:00:00.000Z', description: 'Aluguel', amount: 550.00, type: 'EXPENSE', category: 'Housing', status: 'PENDING' },
    { date: '2025-12-15T10:00:00.000Z', description: 'Celular', amount: 60.00, type: 'EXPENSE', category: 'Utilities', status: 'PENDING' },
    { date: '2025-12-15T10:00:00.000Z', description: 'Futebol', amount: 50.00, type: 'EXPENSE', category: 'Leisure', status: 'PENDING' },
    { date: '2025-12-15T10:00:00.000Z', description: 'Cannabis', amount: 150.00, type: 'EXPENSE', category: 'Personal', status: 'PENDING' },
    { date: '2025-12-16T10:00:00.000Z', description: 'Filho/Lazer (Parcial 1)', amount: 300.00, type: 'EXPENSE', category: 'Family', status: 'PENDING' },
    { date: '2025-12-16T10:00:00.000Z', description: 'Variável Geral', amount: 50.00, type: 'EXPENSE', category: 'General', status: 'PENDING' },
    // VALE (End of month items usually fall into the 30th bucket)
    { date: '2025-12-30T10:00:00.000Z', description: 'Renda Mensal (Fim Mês)', amount: 1061.17, type: 'INCOME', category: 'Salary', status: 'PENDING' },
    { date: '2025-12-30T10:00:00.000Z', description: 'Internet', amount: 165.00, type: 'EXPENSE', category: 'Utilities', status: 'PENDING' },
    { date: '2025-12-30T10:00:00.000Z', description: 'Filho/Lazer (Parcial 2)', amount: 300.00, type: 'EXPENSE', category: 'Family', status: 'PENDING' },
    { date: '2025-12-30T10:00:00.000Z', description: 'Variável Geral (Fim Mês)', amount: 50.00, type: 'EXPENSE', category: 'General', status: 'PENDING' },
];

const INITIAL_DEBTS = [
    { creditor: 'Receita Federal (Parcelamento)', total_amount: 5184.96, remaining_amount: 5184.96, interest_rate: 0, due_date_day: 20, priority: 'HIGH' },
    { creditor: 'Multa do Carro', total_amount: 850.00, remaining_amount: 850.00, interest_rate: 0, due_date_day: 10, priority: 'MEDIUM' },
    { creditor: 'Faculdade', total_amount: 1559.16, remaining_amount: 1559.16, interest_rate: 0, due_date_day: 10, priority: 'MEDIUM' },
    { creditor: 'Luz (Atrasada)', total_amount: 365.00, remaining_amount: 365.00, interest_rate: 0, due_date_day: 5, priority: 'HIGH' },
    { creditor: 'Sabesp (Atrasada)', total_amount: 1109.24, remaining_amount: 1109.24, interest_rate: 0, due_date_day: 5, priority: 'HIGH' },
    { creditor: 'Carro Dívida Ativa', total_amount: 773.28, remaining_amount: 773.28, interest_rate: 0, due_date_day: 20, priority: 'MEDIUM' },
];

export const dataService = {
  
  // Load all data
  async fetchFinancialState(): Promise<FinancialState> {
    // 1. Check if we need to seed
    const { count } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
    
    if (count === 0) {
      await this.seedDatabase();
    }

    // 2. Fetch Transactions
    const { data: transData, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: true });

    if (transError) console.error('Error fetching transactions:', transError);

    // 3. Fetch Debts
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
      status: t.status
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
      currentBalance: 0, // Always 0 per logic
      transactions,
      debts
    };
  },

  // Seed Database (Run only once)
  async seedDatabase() {
    console.log("Seeding Database...");
    
    const { error: tError } = await supabase.from('transactions').insert(INITIAL_TRANSACTIONS);
    if (tError) console.error("Seed Transactions Error", tError);

    const { error: dError } = await supabase.from('debts').insert(INITIAL_DEBTS);
    if (dError) console.error("Seed Debts Error", dError);
  },

  // --- Transactions ---

  async addTransactions(transactions: Omit<Transaction, 'id'>[]) {
    const records = transactions.map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        status: t.status
    }));
    
    const { error } = await supabase.from('transactions').insert(records);
    if (error) throw error;
  },

  async updateTransaction(t: Transaction) {
    const { error } = await supabase.from('transactions').update({
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        status: t.status
    }).eq('id', t.id);
    if (error) throw error;
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