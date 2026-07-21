export interface TransacaoGastoPayload {
  tipo: 'gasto' | 'ganho';
  descricao: string;
  valor: number;
  categoria?: string;
  metodoPagamento?: string;
  pago?: boolean;
  data?: string;
}

export function enviarTransacaoParaGastos(payload: TransacaoGastoPayload): void {
  try {
    const endpoint = (import.meta as any).env?.VITE_GASTOS_API_URL;
    if (!endpoint) return;
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch((err) => {
      console.error("Erro ao enviar transação de integração:", err);
    });
  } catch (err) {
    console.error("Erro na integração de gastos:", err);
  }
}
