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

  // Filtrar apenas transações relevantes para o futuro ou recorrentes
  // Simplificamos os dados para não estourar o limite de tokens, focando em padrões
  const simplifiedTransactions = transactions.map(t => ({
    date: t.date.split('T')[0],
    desc: t.description,
    amt: t.amount,
    type: t.type,
    cat: t.category,
    status: t.status
  }));

  const simplifiedDebts = debts.map(d => ({
    id: d.id,
    creditor: d.creditor,
    remaining: d.remainingAmount,
    rate: d.interestRate,
    priority: d.priority
  }));

  const prompt = `
    ATUE COMO: "Especialista em Finanças e Investimentos".
    MISSÃO: Você é um consultor de elite contratado para executar um plano de saneamento financeiro ("Zero Dívida"). Seu objetivo é limpar o passivo para liberar fluxo de caixa para futuros investimentos.

    DADOS DO CLIENTE (JSON):
    - Saldo em Caixa Atual (Real): R$ ${currentBalance.toFixed(2)}
    - Histórico de Transações (Receitas/Despesas): ${JSON.stringify(simplifiedTransactions)}
    - Carteira de Dívidas (Passivos): ${JSON.stringify(simplifiedDebts)}

    REGRAS DE NEGÓCIO RIGOROSAS (FLUXO DE CAIXA):
    1. O cliente opera em Ciclos Quinzenais (Clusters):
       - Cluster "Vale": Recebe dia 15 -> Cobre contas do dia 15 ao dia 29.
       - Cluster "Pagamento": Recebe dia 30 -> Cobre contas do dia 30 ao dia 14 do mês seguinte.
    2. REGRA DE OURO: O Saldo Acumulado NUNCA pode ficar negativo. Se faltar dinheiro, o pagamento da dívida deve ser fracionado. Prioridade absoluta para despesas essenciais.
    3. DATA DE INÍCIO: Considere a data atual para frente.

    DIRETRIZES TÁTICAS:
    1. Analise o padrão de gastos do cliente nas transações fornecidas para projetar o fluxo futuro.
    2. Use o método "Avalanche" (maior juros primeiro) ou "Bola de Neve" (menor valor primeiro) conforme o que liberar fluxo de caixa mais rápido neste cenário.
    3. Se houver "Poupança" lançada nas transações, considere se ela deve ser usada para abater dívida (matematicamente mais vantajoso) ou mantida como reserva de emergência, e explique sua decisão nas notas.

    OUTPUT ESPERADO:
    Gere um JSON estrito seguindo o schema fornecido. Não adicione texto fora do JSON.
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