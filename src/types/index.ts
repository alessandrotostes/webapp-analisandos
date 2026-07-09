export interface RateReadjustment {
  id: string;
  date: string;
  value: number;
}

export interface Patient {
  id?: string;
  name: string;
  origin: 'particular' | 'social_clinic' | 'zenklub' | 'integrando_ser' | 'training_student';
  format: 'presencial' | 'online';
  defaultRate: number;     // Valor cobrado por sessão (R$)
  status: 'active' | 'paused' | 'ended';
  phone?: string;
  email?: string;
  notes?: string;
  rateReadjustments?: RateReadjustment[];
  lastSessionDate?: string;
}

export interface Invoice {
  id?: string;
  year: number;            // Ano da fatura (ex: 2025, 2026)
  month: string;           // Mês (ex: "JANEIRO", "FEVEREIRO")
  invoiceNumber: number;   // Nº da fatura
  date: string | null;     // Data de emissão (AAAA-MM-DD ou null se não preenchido)
  patientName: string;     // Nome do paciente
  value: number;           // Valor faturado
  paidValue: number;       // Valor pago
  pendingValue: number;    // Valor pendente
  notes?: string;          // Observações qualitativas
}

export interface RentLog {
  id?: string;
  patientName: string;     // Nome do paciente associado à reserva
  dateRef: string;         // Referência de data (ex: "21/01", "23/01, 30/01")
  valuePaid: number;       // Valor pago (R$ 30 por sessão)
  sessionsCount: number;   // Quantidade de sessões correspondentes
}

export interface Session {
  id?: string;
  patientName: string;     // Nome do paciente
  date: string;            // Data do atendimento (AAAA-MM-DD)
  paymentInfo?: string;    // Valor pago, "gratuita", "cancelou", etc.
  duration: number;        // Duração (geralmente 1.0)
  modality: string;        // Tipo de atendimento (ex: "CLINICA SOCIAL", "PRESENCIAL", etc.)
  notes?: string;          // Anotações clínicas / evolução do paciente
  googleEventId?: string;  // ID do evento vinculado no Google Calendar (para sync bidirecional)
  sessionValue?: number;   // Valor cobrado na sessão (R$)
  isPaid?: boolean;        // Pago ou Não Pago
  isPackage?: boolean;     // Sessão paga via pacote (não computa na receita mensal)
  isCancelled?: boolean;   // Sessão cancelada
  isCharged?: boolean;     // Sessão cobrada (mesmo se cancelada)
  isParentsSession?: boolean; // Sessão com os Pais do paciente
  patientType?: string;    // Tipo de Paciente
  isRentCancelled?: boolean; // Aluguel da sala cancelado/isento para esta sessão
  isRentPaid?: boolean;      // Aluguel da sala pago
}

export interface PlatformTransaction {
  id?: string;
  platform: 'zenklub' | 'integrando_ser';
  date: string;            // Data da transação (AAAA-MM-DD)
  patientName: string;     // Nome do paciente
  value: number;           // Valor pago/recebido
  type?: 'corporativo' | 'particular'; // Apenas para Zenklub
}
