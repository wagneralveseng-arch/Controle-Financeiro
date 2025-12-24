
import { GoogleGenAI, Type } from "@google/genai";
import { FinancialState, AnnualReportResponse, AIPlanResponse } from "../types";

const MODEL_NAME = "gemini-3-pro-preview";

// Using object literals for schemas to follow best practices as per guidelines
const reportSchema = {
  type: Type.OBJECT,
  properties: {
    economicProfile: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, description: "Título do perfil financeiro (ex: Poupador Estratégico)." },
        description: { type: Type.STRING, description: "Análise detalhada do comportamento." },
        score: { type: Type.INTEGER, description: "Pontuação de saúde financeira de 0 a 100." },
        keyAdvice: { type: Type.STRING, description: "A principal recomendação para o ano." },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["category", "description", "score", "keyAdvice", "strengths", "weaknesses"],
    },
    annualSummary: {
      type: Type.OBJECT,
      properties: {
        totalProjectedIncome: { type: Type.NUMBER },
        totalProjectedExpenses: { type: Type.NUMBER },
        totalProjectedSavings: { type: Type.NUMBER },
        averageMonthlyBalance: { type: Type.NUMBER },
      },
      required: ["totalProjectedIncome", "totalProjectedExpenses", "totalProjectedSavings", "averageMonthlyBalance"],
    },
    projections: {
      type: Type.ARRAY,
      description: "Projeção de 12 meses.",
      items: {
        type: Type.OBJECT,
        properties: {
          monthLabel: { type: Type.STRING, description: "ex: 'Jan 2026'" },
          openingBalance: { type: Type.NUMBER },
          totalIncome: { type: Type.NUMBER },
          totalExpenses: { type: Type.NUMBER },
          totalSavings: { type: Type.NUMBER },
          closingBalance: { type: Type.NUMBER },
          notes: { type: Type.STRING },
        },
        required: ["monthLabel", "openingBalance", "totalIncome", "totalExpenses", "totalSavings", "closingBalance", "notes"],
      },
    },
  },
  required: ["economicProfile", "annualSummary", "projections"],
};

// Schema for the zero debt strategy plan
const planSchema = {
  type: Type.OBJECT,
  properties: {
    estimatedDebtFreeDate: { type: Type.STRING, description: "Data estimada para quitação (ex: Jan/2026)" },
    strategySummary: { type: Type.STRING, description: "Resumo da estratégia" },
    projections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          monthLabel: { type: Type.STRING },
          openingBalance: { type: Type.NUMBER },
          totalIncome: { type: Type.NUMBER },
          fixedExpenses: { type: Type.NUMBER },
          debtPayments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                creditor: { type: Type.STRING },
                amount: { type: Type.NUMBER },
              },
              required: ["creditor", "amount"],
            },
          },
          closingBalance: { type: Type.NUMBER },
          notes: { type: Type.STRING },
        },
        required: ["monthLabel", "openingBalance", "totalIncome", "fixedExpenses", "debtPayments", "closingBalance", "notes"],
      },
    },
  },
  required: ["estimatedDebtFreeDate", "strategySummary", "projections"],
};

export const generateAnnualReport = async (state: FinancialState): Promise<AnnualReportResponse> => {
  const { transactions, debts, currentBalance } = state;

  const simplifiedTransactions = transactions.map(t => ({
    date: t.date.split('T')[0],
    desc: t.description,
    amt: t.amount,
    type: t.type,
    cat: t.category,
    status: t.status
  }));

  const simplifiedDebts = debts.map(d => ({
    creditor: d.creditor,
    remaining: d.remainingAmount,
    rate: d.interestRate,
    priority: d.priority
  }));

  const prompt = `
    ATUE COMO: "Diretor Financeiro (CFO) e Especialista em Behavioral Finance".
    MISSÃO: Analisar o histórico transacional e a carteira de dívidas do cliente para:
    1. Identificar o PERFIL ECONÔMICO (Psicologia Financeira).
    2. Gerar uma PROJEÇÃO ANUAL (12 meses) de fluxo de caixa.

    DADOS DO CLIENTE (JSON):
    - Saldo em Caixa Atual: R$ ${currentBalance.toFixed(2)}
    - Transações (Passado e Agendadas): ${JSON.stringify(simplifiedTransactions)}
    - Dívidas Ativas: ${JSON.stringify(simplifiedDebts)}

    DIRETRIZES DE ANÁLISE:
    - Analise a recorrência de receitas para projetar os próximos 12 meses.
    - Avalie se as despesas são essenciais ou supérfluas baseando-se nas categorias.
    - Perfil Econômico: Classifique se o usuário é "Sobrevivente", "Poupador", "Investidor", "Endividado" ou "Arrojado".
    - Projeção: O saldo inicial do Mês 1 é o saldo atual. O fechamento de um mês é a abertura do outro.

    Gere um JSON estrito seguindo o schema. Fale em Português do Brasil.
  `;

  try {
    // Initializing SDK inside the function to ensure the latest configuration as per requirements
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: reportSchema,
        thinkingConfig: { thinkingBudget: 2048 },
      },
    });

    return JSON.parse(response.text) as AnnualReportResponse;
  } catch (error) {
    console.error("Annual Report Error:", error);
    throw error;
  }
};

// Fixed missing generateZeroDebtPlan export to handle debt quittance strategy
export const generateZeroDebtPlan = async (state: FinancialState): Promise<AIPlanResponse> => {
  const { transactions, debts, currentBalance } = state;

  const simplifiedTransactions = transactions.slice(-30).map(t => ({
    date: t.date.split('T')[0],
    desc: t.description,
    amt: t.amount,
    type: t.type,
    status: t.status
  }));

  const simplifiedDebts = debts.map(d => ({
    creditor: d.creditor,
    remaining: d.remainingAmount,
    rate: d.interestRate,
    priority: d.priority
  }));

  const prompt = `
    ATUE COMO: "Especialista em Recuperação de Crédito e Planejamento Financeiro".
    DADOS:
    - Saldo Atual: R$ ${currentBalance.toFixed(2)}
    - Dívidas Ativas: ${JSON.stringify(simplifiedDebts)}
    - Histórico Recente: ${JSON.stringify(simplifiedTransactions)}

    MISSÃO: Gerar um plano tático de 12 meses focado em QUITAR TODAS AS DÍVIDAS o mais rápido possível.
    Use o "Método Avalanche" (maiores juros primeiro) ou "Bola de Neve" conforme sua análise técnica.
    O saldo inicial do Mês 1 é o saldo atual.
    
    Gere um JSON estrito seguindo o schema. Fale em Português do Brasil.
  `;

  try {
    // Initializing SDK inside the function for fresh state
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: planSchema,
        thinkingConfig: { thinkingBudget: 4096 },
      },
    });

    return JSON.parse(response.text) as AIPlanResponse;
  } catch (error) {
    console.error("Zero Debt Plan Error:", error);
    throw error;
  }
};
