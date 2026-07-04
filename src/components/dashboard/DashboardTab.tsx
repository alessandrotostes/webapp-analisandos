
import { Card } from '../ui/Card';
import type { Session, Patient } from '../../types';

interface DashboardTabProps {
  totalMetrics: {
    faturado: number;
    recebido: number;
    pendente: number;
  };
  rentTotalPaid: number;
  patients: Patient[];
  upcomingSessions: Session[];
  loadingUpcomingSessions: boolean;
  loadingSessions: boolean;
  zenklubTotalFaturado: number;
  weekSessionsToReceive: { id?: string; patientName: string; date: string; value: number }[];
  weekSessionsTotal: number;
  formatCurrency: (val: number) => string;
}

export function DashboardTab({
  totalMetrics,
  rentTotalPaid,
  patients,
  upcomingSessions,
  loadingUpcomingSessions,
  loadingSessions,
  zenklubTotalFaturado,
  weekSessionsToReceive,
  weekSessionsTotal,
  formatCurrency
}: DashboardTabProps) {
  const getWeekdayName = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return [
      'Domingo',
      'Segunda',
      'Terça',
      'Quarta',
      'Quinta',
      'Sexta',
      'Sábado'
    ][date.getDay()];
  };

  return (
    <div>
      <section className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <Card title="Receita Prevista (Filtro)">
          <div className="card-value">{formatCurrency(totalMetrics.faturado)}</div>
          <p className="card-subtitle">Valor total lançado nas faturas</p>
        </Card>
        <Card title="Receita Efetivada (Filtro)">
          <div className="card-value" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {formatCurrency(totalMetrics.recebido)}
          </div>
          <p className="card-subtitle">Pagamentos confirmados</p>
        </Card>
        <Card title="Saldo Devedor / Pendente">
          <div className="card-value" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {formatCurrency(totalMetrics.pendente)}
          </div>
          <p className="card-subtitle">Faturas em aberto</p>
        </Card>
        <Card title="Faturamento Zenklub (Ciclo)">
          <div className="card-value" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {formatCurrency(zenklubTotalFaturado)}
          </div>
          <p className="card-subtitle">
            Ciclo: 24 do mês anterior a 23 do atual
          </p>
        </Card>
        <Card title="Custo de Consultório">
          <div className="card-value" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {formatCurrency(rentTotalPaid)}
          </div>
          <p className="card-subtitle">Total investido em sublocação de salas</p>
        </Card>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        <Card title="Próximas Sessões da Semana">
          {loadingUpcomingSessions ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando agenda...</p>
          ) : upcomingSessions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma sessão marcada para os próximos 7 dias.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '300px' }}>
              {upcomingSessions.map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>{s.patientName}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                      {s.date} - Modalidade: <span style={{ textTransform: 'uppercase' }}>{s.modality.replace('_', ' ')}</span>
                    </span>
                  </div>
                  <span className="badge badge-partial" style={{ fontSize: '0.7rem' }}>
                    Agendada
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title={`Saldo a Receber na Semana (${formatCurrency(weekSessionsTotal)})`}>
          {loadingSessions ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando sessões...</p>
          ) : weekSessionsToReceive.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum atendimento de Segunda a Sexta nesta semana.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '300px' }}>
              {weekSessionsToReceive.map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>{s.patientName}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                      {getWeekdayName(s.date)} ({s.date.split('-')[2]}/{s.date.split('-')[1]})
                    </span>
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--accent-success)' }}>
                    {formatCurrency(s.value)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Origem dos Analisandos Ativos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            {[
              { key: 'particular', label: 'Particular' },
              { key: 'social_clinic', label: 'Clínica Social' },
              { key: 'zenklub', label: 'Zenklub' },
              { key: 'integrando_ser', label: 'Integrando Ser' },
              { key: 'training_student', label: 'Aluno em Formação' }
            ].map((item) => {
              const count = patients.filter(p => p.origin === item.key && p.status === 'active').length;
              const pct = patients.length > 0 ? (count / patients.length) * 100 : 0;
              return (
                <div key={item.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {item.label}
                    </span>
                    <strong>{count} ({Math.round(pct)}%)</strong>
                  </div>
                  <div style={{ background: 'var(--bg-main)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, background: 'var(--accent-primary-gradient)', height: '100%', borderRadius: '4px' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
