
import { GoogleGenAI, Type } from "@google/genai";
import { FinancialState, AnnualReportResponse, AIPlanResponse } from "../types";

const MODEL_REPORT = "gemini-3-flash-preview";
const MODEL_PLAN = "gemini-3-pro-preview";

// Schema para o Relatório Anual
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

// Schema para o plano de quitação de dívidas
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
    MISSÃO: Analisar o histórico transacional e a carteira de dívidas do cliente para identificar o PERFIL ECONÔMICO e gerar uma PROJEÇÃO ANUAL de 12 meses.

    DADOS DO CLIENTE:
    - Saldo em Caixa Atual: R$ ${currentBalance.toFixed(2)}
    - Transações: ${JSON.stringify(simplifiedTransactions)}
    - Dívidas Ativas: ${JSON.stringify(simplifiedDebts)}

    DIRETRIZES:
    - Seja realista. Se o saldo for negativo, sugira cortes.
    - O Perfil Econômico deve refletir o equilíbrio entre entradas e saídas.
    - Projeção: Mês 1 começa com o Saldo Atual.
    - Gere JSON estrito conforme o schema.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL_REPORT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: reportSchema,
        // Removido thinkingBudget para maior velocidade e compatibilidade imediata
      },
    });

    if (!response.text) throw new Error("Modelo não retornou texto.");
    return JSON.parse(response.text) as AnnualReportResponse;
  } catch (error) {
    console.error("Gemini Annual Report Error:", error);
    throw error;
  }
};

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
    ATUE COMO: "Especialista em Recuperação de Crédito".
    MISSÃO: Gerar um plano de 12 meses focado em QUITAR DÍVIDAS.
    DADOS: Saldo R$ ${currentBalance.toFixed(2)}, Dívidas: ${JSON.stringify(simplifiedDebts)}, Transações: ${JSON.stringify(simplifiedTransactions)}.
    Gere JSON estrito conforme o schema.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL_PLAN,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: planSchema,
        thinkingConfig: { thinkingBudget: 2048 },
      },
    });

    if (!response.text) throw new Error("Modelo não retornou texto.");
    return JSON.parse(response.text) as AIPlanResponse;
  } catch (error) {
    console.error("Gemini Zero Debt Plan Error:", error);
    throw error;
  }
};
