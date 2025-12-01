import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FinancialState, AIPlanResponse } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

const planSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    strategySummary: {
      type: Type.STRING,
      description: "Um resumo executivo profissional da estratégia de quitação de dívidas, explicando a lógica utilizada. Fale em Português.",
    },
    estimatedDebtFreeDate: {
      type: Type.STRING,
      description: "Data estimada (AAAA-MM) em que todas as dívidas serão quitadas.",
    },
    projections: {
      type: Type.ARRAY,
      description: "Projeção mês a mês.",
      items: {
        type: Type.OBJECT,
        properties: {
          monthIndex: { type: Type.INTEGER },
          monthLabel: { type: Type.STRING, description: "ex: 'Dez 2025'" },
          openingBalance: { type: Type.NUMBER },
          totalIncome: { type: Type.NUMBER },
          fixedExpenses: { type: Type.NUMBER },
          debtPayments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                debtId: { type: Type.STRING },
                creditor: { type: Type.STRING },
                amount: { type: Type.NUMBER },
              },
            },
          },
          closingBalance: { type: Type.NUMBER },
          notes: { type: Type.STRING, description: "Ações específicas para este mês." },
        },
        required: ["monthIndex", "monthLabel", "openingBalance", "totalIncome", "fixedExpenses", "debtPayments", "closingBalance", "notes"],
      },
    },
  },
  required: ["strategySummary", "projections", "estimatedDebtFreeDate"],
};

export const generateZeroDebtPlan = async (state: FinancialState): Promise<AIPlanResponse> => {
  const { transactions, debts, currentBalance } = state;

  const prompt = `
    Role: Você é um Especialista Sênior em Finanças Pessoais (Analista de Inteligência de Mercado).
    Goal: Executar um plano rigoroso de "Zero Dívida" começando em Dezembro de 2025.

    DADOS ATUAIS (Base JSON):
    - Saldo Inicial (Caixa): ${currentBalance.toFixed(2)}
    - Transações (Income/Expenses) com DATAS: ${JSON.stringify(transactions.map(t => ({ date: t.date, desc: t.description, amt: t.amount, type: t.type })))}
    - Dívidas Pendentes: ${JSON.stringify(debts.map(d => ({ creditor: d.creditor, remaining: d.remainingAmount, monthly: d.monthlyPayment, installmentsLeft: d.installmentsRemaining, priority: d.priority })))}

    REGRA DE FLUXO DE CAIXA (CLUSTERS):
    - Cluster "Vale": Dias 15 a 29 do mês.
    - Cluster "Pagamento": Dias 30 e 31 + Dias 01 a 14 do mês.
    
    REGRA DE OURO INEGOCIÁVEL:
    O Saldo Cash Acumulado (dinheiro em conta) NUNCA pode ser negativo. Se o fluxo de caixa for insuficiente, o pagamento de dívida deve ser fracionado ou adiado.
    Priorize pagar as despesas fixas de cada Cluster antes de usar o saldo para dívidas.

    FUNÇÕES DE LÓGICA:
    1. CALCULAR_FLUXO_DRE: Processe dia a dia. Some o saldo do Cluster Vale e Cluster Pagamento.
    2. ATUALIZAR_ESTADO: Abata as dívidas com o saldo livre (Fluxo de Caixa Líquido).
    3. PROJETAR: Estime a data final zero dívida.

    TAREFA IMEDIATA:
    1. Gere a projeção mês a mês começando em Dezembro 2025.
    2. Utilize apenas o Fluxo de Caixa Líquido (Receitas - Despesas) para abater as dívidas, sem fundos externos.
    
    Output JSON format only.
  `;

  try {
    const response = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: planSchema,
        thinkingConfig: { thinkingBudget: 2048 },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AIPlanResponse;
  } catch (error) {
    console.error("AI Plan Generation Error:", error);
    throw error;
  }
};