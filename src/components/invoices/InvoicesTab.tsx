import type { Invoice, Session, Patient } from '../../types';
import { Button } from '../ui/Button';
import { Table } from '../ui/Table';

interface InvoicesTabProps {
  hideValues?: boolean;
  handleOpenInvoiceModal: (invoice?: Invoice) => void;
  invoiceFilters: { patientName: string };
  setInvoiceFilters: React.Dispatch<React.SetStateAction<{ patientName: string }>>;
  totalMetrics: { faturado: number; recebido: number; pendente: number };
  invoices: Invoice[];
  sessions: Session[];
  patients: Patient[];
  loadingInvoices: boolean;
  handleQuickPayInvoice: (invoice: Invoice) => void;
  handleDeleteInvoice: (id: string) => void;
  hasMoreInvoices: boolean;
  loadInvoicesData: (loadMore: boolean, lastDoc: any) => void;
  lastInvoiceDoc: any;
  formatCurrency: (val: number) => string;
}

export function InvoicesTab({
  hideValues,
  handleOpenInvoiceModal,
  invoiceFilters,
  setInvoiceFilters,
  totalMetrics,
  invoices,
  sessions,
  patients,
  loadingInvoices,
  handleQuickPayInvoice,
  handleDeleteInvoice,
  hasMoreInvoices,
  loadInvoicesData,
  lastInvoiceDoc,
  formatCurrency
}: InvoicesTabProps) {
  // Filtro de faturas client-side para busca fluida/parcial por nome
  const filteredInvoices = invoiceFilters.patientName.trim()
    ? invoices.filter(inv =>
        inv.patientName.toLowerCase().includes(invoiceFilters.patientName.toLowerCase())
      )
    : invoices;

  // Filtro de sessões correspondentes do paciente pesquisado
  const matchedSessions = invoiceFilters.patientName.trim()
    ? sessions.filter(s =>
        s.patientName.toLowerCase().includes(invoiceFilters.patientName.toLowerCase())
      )
    : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Lançamentos de Invoices</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Controle de cobranças mensais dos pacientes</p>
        </div>
        <Button variant="primary" onClick={() => handleOpenInvoiceModal()}>
          + Lançar Fatura
        </Button>
      </div>

      {/* Filtros de Faturamento */}
      <section className="filters-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="filter-group" style={{ flex: '1 1 250px' }}>
          <label className="filter-label">Buscar Paciente</label>
          <input
            type="text"
            className="filter-input"
            placeholder="Nome do analisando..."
            value={invoiceFilters.patientName}
            onChange={(e) => setInvoiceFilters(prev => ({ ...prev, patientName: e.target.value }))}
            style={{ width: '100%', minWidth: 'auto' }}
          />
        </div>

        {/* Resumo Mensal Dinâmico */}
        <div style={{ display: 'flex', gap: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Faturado no Mês</span>
            <strong style={{ fontSize: '1rem', color: 'var(--accent-primary)' }}>{formatCurrency(totalMetrics.faturado)}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Recebido (Obtido)</span>
            <strong style={{ fontSize: '1rem', color: 'var(--accent-success)' }}>{formatCurrency(totalMetrics.recebido)}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Saldo Pendente</span>
            <strong style={{ fontSize: '1rem', color: 'var(--accent-danger)' }}>{formatCurrency(totalMetrics.pendente)}</strong>
          </div>
        </div>
      </section>

      <div className="card" style={{ padding: 0, marginBottom: invoiceFilters.patientName.trim() ? '2rem' : 0 }}>
        <Table
          columns={[
            { header: 'Nº Fatura', accessor: (inv: Invoice) => `#${inv.invoiceNumber}`, align: 'center' },
            { header: 'Referência', accessor: (inv: Invoice) => `${inv.month} / ${inv.year}`, className: 'hide-mobile' },
            { header: 'Paciente', accessor: (inv: Invoice) => hideValues && inv.patientName !== 'ZENKLUB' ? 'Analisando Oculto' : inv.patientName },
            { header: 'Valor Previsto', accessor: (inv: Invoice) => formatCurrency(inv.value), align: 'right' },
            { header: 'Total Pago', accessor: (inv: Invoice) => formatCurrency(inv.paidValue), align: 'right' },
            {
              header: 'Pendente',
              className: 'hide-mobile',
              accessor: (inv: Invoice) => {
                // Calcular data da segunda e sexta-feira da semana atual
                const today = new Date();
                const day = today.getDay();
                const monday = new Date(today);
                const diffToMonday = day === 0 ? -6 : 1 - day;
                monday.setDate(today.getDate() + diffToMonday);
                monday.setHours(0, 0, 0, 0);

                const friday = new Date(monday);
                friday.setDate(monday.getDate() + 4);
                friday.setHours(23, 59, 59, 999);

                const formatDate = (d: Date) => {
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const dayStr = String(d.getDate()).padStart(2, '0');
                  return `${y}-${m}-${dayStr}`;
                };

                const monStr = formatDate(monday);
                const friStr = formatDate(friday);

                // Filtrar sessões não pagas e não canceladas da semana do paciente
                const patientWeekSessions = sessions.filter(s => 
                  s.patientName === inv.patientName &&
                  s.date >= monStr &&
                  s.date <= friStr &&
                  s.isPaid !== true &&
                  !s.isPackage &&
                  !(s.isCancelled && !s.isCharged)
                );

                const weekPendingValue = patientWeekSessions.reduce((sum, s) => {
                  const p = patients.find(pat => pat.name === s.patientName);
                  const rate = p ? p.defaultRate : (Number(s.paymentInfo) || 150);
                  const val = s.sessionValue !== undefined ? s.sessionValue : rate;
                  return sum + val;
                }, 0);

                if (weekPendingValue === 0) {
                  return <span className="badge badge-paid">Quitado</span>;
                }
                return <span className="badge badge-pending">{formatCurrency(weekPendingValue)}</span>;
              },
              align: 'center'
            },
            {
              header: 'Ações',
              accessor: (inv: Invoice) => (
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                  {inv.patientName === 'ZENKLUB' ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Consolidado</span>
                  ) : (
                    <>
                      {Math.max(0, inv.value - inv.paidValue) > 0 && (
                        <Button variant="success" onClick={() => handleQuickPayInvoice(inv)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                          Quitar
                        </Button>
                      )}
                      <Button variant="secondary" onClick={() => handleOpenInvoiceModal(inv)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => inv.id && handleDeleteInvoice(inv.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        Excluir
                      </Button>
                    </>
                  )}
                </div>
              ),
              align: 'center'
            }
          ]}
          data={filteredInvoices}
          loading={loadingInvoices}
        />

        {hasMoreInvoices && invoices.length > 0 && (
          <div className="pagination-area" style={{ paddingBottom: '1.5rem' }}>
            <Button variant="primary" onClick={() => loadInvoicesData(true, lastInvoiceDoc)} disabled={loadingInvoices}>
              {loadingInvoices ? 'Carregando...' : 'Carregar Faturas Anteriores'}
            </Button>
          </div>
        )}
      </div>

      {/* SESSÕES DO PACIENTE PESQUISADO */}
      {invoiceFilters.patientName.trim() && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
            Sessões Registradas de "{invoiceFilters.patientName}" (Período Selecionado)
          </h3>
          <div className="card" style={{ padding: 0 }}>
            <Table
              columns={[
                { header: 'Data', accessor: (s: Session) => s.date ? s.date.split('-').reverse().join('/') : '' },
                { header: 'Modalidade', accessor: (s: Session) => <span style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>{s.modality.replace('_', ' ')}</span> },
                { header: 'Info Pagamento / Valor', accessor: (s: Session) => s.paymentInfo || '---' },
                { header: 'Duração', accessor: (s: Session) => `${s.duration.toFixed(1)}h`, align: 'center' }
              ]}
              data={matchedSessions}
            />
            {matchedSessions.length === 0 && (
              <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Nenhuma sessão encontrada para este filtro no período.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
