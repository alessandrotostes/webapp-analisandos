import { useState } from 'react';
import { Card } from '../ui/Card';
import type { Session, Patient, Invoice } from '../../types';

interface DashboardTabProps {
  hideValues?: boolean;
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
  weekSessionsToReceive: { id?: string; patientName: string; date: string; value: number; type: 'vigente' | 'anterior' }[];
  weekSessionsTotal: number;
  formatCurrency: (val: number) => string;
  zenklubSessionsForDetail: { patientName: string; date: string; value: number }[];
  zenklubCyclePeriodLabel: string;
  selectedMonth: string;
  previousMonthName: string;
  salarioLiquidoPrevisto: number;
  salarioLiquidoRecebido: number;
  salaryTotalRepasses: number;
  annualBruto: number;
  annualLiquido: number;
  salaryMonth: string;
  selectedYear: number;
  sessions?: Session[];
  onSelectPatientByName?: (name: string) => void;
  displayInvoices?: Invoice[];
}

export function DashboardTab({
  hideValues,
  totalMetrics,
  rentTotalPaid,
  patients,
  upcomingSessions,
  loadingUpcomingSessions,
  loadingSessions,
  zenklubTotalFaturado,
  weekSessionsToReceive,
  weekSessionsTotal,
  formatCurrency,
  zenklubSessionsForDetail,
  zenklubCyclePeriodLabel,
  selectedMonth,
  previousMonthName,
  salarioLiquidoPrevisto,
  salarioLiquidoRecebido,
  salaryTotalRepasses,
  annualBruto,
  annualLiquido,
  salaryMonth,
  selectedYear,
  sessions = [],
  onSelectPatientByName,
  displayInvoices = []
}: DashboardTabProps) {
  const [showZenklubModal, setShowZenklubModal] = useState(false);
  const [showReceitaModal, setShowReceitaModal] = useState(false);
  const [showPrevistaModal, setShowPrevistaModal] = useState(false);
  const [showPendenteModal, setShowPendenteModal] = useState(false);

  const isInvoiceValidForPatientStatus = (inv: Invoice) => {
    const p = patients.find(pat => pat.name === inv.patientName);
    if (!p) return true;
    if (p.status === 'active') return true;
    const lastSessionMonthStr = p.lastSessionDate ? p.lastSessionDate.split('-')[1] : null;
    const lastSessionYear = p.lastSessionDate ? Number(p.lastSessionDate.split('-')[0]) : null;
    if (!lastSessionMonthStr || !lastSessionYear) return false;
    const monthNumMap: Record<string, number> = {
      'JANEIRO': 1, 'FEVEREIRO': 2, 'MARÇO': 3, 'ABRIL': 4,
      'MAIO': 5, 'JUNHO': 6, 'JULHO': 7, 'AGOSTO': 8,
      'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12
    };
    const invMonthNum = monthNumMap[inv.month] || 1;
    const lastSessMonthNum = Number(lastSessionMonthStr);
    if (inv.year < lastSessionYear) return true;
    if (inv.year > lastSessionYear) return false;
    return invMonthNum <= lastSessMonthNum;
  };

  const isPatientClickable = (name: string) => patients.some(p => p.name === name);

  const renderPatientLink = (name: string, defaultStyle: React.CSSProperties = {}) => {
    const clickable = isPatientClickable(name);
    const displayName = hideValues ? 'Analisando Oculto' : name;
    if (!clickable) {
      return <strong style={{ color: 'var(--text-primary)', ...defaultStyle }}>{displayName}</strong>;
    }
    return (
      <strong 
        onClick={() => onSelectPatientByName?.(name)}
        style={{ 
          color: 'var(--accent-primary)', 
          cursor: 'pointer', 
          textDecoration: 'underline',
          ...defaultStyle 
        }}
        title={`Ir para o prontuário de ${displayName}`}
      >
        {displayName}
      </strong>
    );
  };
  const getWeekdayName = (dateStr: string) => {
    if (!dateStr) return '';
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

  const monthNumMap: Record<string, string> = {
    'JANEIRO': '01', 'FEVEREIRO': '02', 'MARÇO': '03', 'ABRIL': '04',
    'MAIO': '05', 'JUNHO': '06', 'JULHO': '07', 'AGOSTO': '08',
    'SETEMBRO': '09', 'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12'
  };

  const monthNum = monthNumMap[selectedMonth] || '07';
  const prefix = `${selectedYear}-${monthNum}`;

  const eligiblePatientsForPrevista = patients
    .filter(p => {
      if (p.origin === 'zenklub') return false;
      if (p.status === 'active') return true;
      const hasSessionInMonth = (sessions || []).some(s =>
        s.patientName === p.name &&
        s.date &&
        s.date.startsWith(prefix) &&
        (!s.isCancelled || s.isCharged)
      );
      return hasSessionInMonth;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const previstaList = eligiblePatientsForPrevista.map(p => {
    const patientSessions = (sessions || []).filter(s => {
      return (
        s.patientName === p.name &&
        s.date &&
        s.date.startsWith(prefix) &&
        (!s.isCancelled || s.isCharged)
      );
    });

    const isPackagePatient = patientSessions.some(s => s.isPackage === true);
    let expectedValue = 0;

    if (isPackagePatient) {
      const inv = displayInvoices?.find(i => i.patientName === p.name);
      expectedValue = inv ? inv.value : (patientSessions.length * p.defaultRate);
    } else {
      expectedValue = patientSessions.reduce((sum, s) => {
        const rate = p.defaultRate;
        const val = s.sessionValue !== undefined ? s.sessionValue : rate;
        return sum + val;
      }, 0);
    }

    return {
      patientName: p.name,
      sessionsCount: patientSessions.length,
      expectedValue
    };
  });

  const totalPrevistaCalculated = previstaList.reduce((sum, item) => sum + item.expectedValue, 0);

  const sessionsVigente = weekSessionsToReceive.filter(s => s.type === 'vigente');
  const sessionsAnterior = weekSessionsToReceive.filter(s => s.type === 'anterior');

  const totalVigente = sessionsVigente.reduce((sum, s) => sum + s.value, 0);
  const totalAnterior = sessionsAnterior.reduce((sum, s) => sum + s.value, 0);

  return (
    <div>
      {/* Acumulado do Ano e Salário Líquido (Tamanho Pequeno) */}
      <div className="dashboard-summary-bar">
        <div>
          <span style={{ fontWeight: '600' }}>Acumulado (Jan a {salaryMonth.toLowerCase()}/{selectedYear}):</span>
          <span style={{ marginLeft: '0.5rem' }}>Bruto: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(annualBruto)}</strong></span>
          <span className="divider">
            Líquido: <strong style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{formatCurrency(annualLiquido)}</strong>
          </span>
        </div>
        <div>
          <span style={{ fontWeight: '600' }}>Salário Líquido ({salaryMonth.toLowerCase()}):</span>
          <span style={{ marginLeft: '0.5rem' }}>Previsto: <strong style={{ color: 'var(--accent-primary)' }}>{formatCurrency(salarioLiquidoPrevisto)}</strong></span>
          <span className="divider">
            Pago: <strong style={{ color: 'var(--accent-success)' }}>{formatCurrency(salarioLiquidoRecebido)}</strong>
          </span>
          <span className="divider">
            Despesas/Repasses: <strong style={{ color: 'var(--text-secondary)' }}>{formatCurrency(salaryTotalRepasses)}</strong>
          </span>
        </div>
      </div>

      <section className="dashboard-grid">
        <div onClick={() => setShowPrevistaModal(true)} style={{ cursor: 'pointer' }} title="Clique para ver detalhamento de receita prevista">
          <Card title="Receita Prevista (Filtro)">
            <div className="card-value">{formatCurrency(totalPrevistaCalculated)}</div>
            <p className="card-subtitle">
              Valor total previsto de atendimentos <br />
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>🔍 Clique para ver detalhamento</span>
            </p>
          </Card>
        </div>
        <div onClick={() => setShowReceitaModal(true)} style={{ cursor: 'pointer' }} title="Clique para ver quem pagou">
          <Card title="Receita Efetivada (Filtro)">
            <div className="card-value" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {formatCurrency(totalMetrics.recebido)}
            </div>
            <p className="card-subtitle">
              Pagamentos confirmados <br />
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-success)', fontWeight: 'bold' }}>🔍 Clique para ver pagamentos</span>
            </p>
          </Card>
        </div>
        <div onClick={() => setShowPendenteModal(true)} style={{ cursor: 'pointer' }} title="Clique para ver quem deve">
          <Card title="Saldo Devedor / Pendente">
            <div className="card-value" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {formatCurrency(totalMetrics.pendente)}
            </div>
            <p className="card-subtitle">
              Faturas em aberto <br />
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', fontWeight: 'bold' }}>🔍 Clique para ver devedores</span>
            </p>
          </Card>
        </div>
        <div onClick={() => setShowZenklubModal(true)} style={{ cursor: 'pointer' }} title="Clique para ver detalhamento de sessões">
          <Card title="Faturamento Zenklub (Ciclo)">
            <div className="card-value" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {formatCurrency(zenklubTotalFaturado)}
            </div>
            <p className="card-subtitle">
              Ciclo: {zenklubCyclePeriodLabel} <br />
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>🔍 Clique para ver sessões</span>
            </p>
          </Card>
        </div>
        <Card title="Custo de Consultório">
          <div className="card-value" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {formatCurrency(rentTotalPaid)}
          </div>
          <p className="card-subtitle">Custo de sublocação no mês vigente</p>
        </Card>
      </section>

      <div className="dashboard-bottom-grid">
        <Card title="Próximas Sessões da Semana">
          {loadingUpcomingSessions ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando agenda...</p>
          ) : upcomingSessions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma sessão marcada para os próximos 7 dias.</p>
          ) : (
            <div className="dashboard-scrollable-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {upcomingSessions.map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div>
                    {renderPatientLink(s.patientName)}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                      {s.date ? s.date.split('-').reverse().join('/') : ''} - Modalidade: <span style={{ textTransform: 'uppercase' }}>{s.modality.replace('_', ' ')}</span>
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
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              
              <div className="dashboard-scrollable-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Mês Vigente */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                      Mês Vigente ({selectedMonth})
                    </span>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--accent-success)' }}>
                      Subtotal: {formatCurrency(totalVigente)}
                    </strong>
                  </div>
                  {sessionsVigente.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem', margin: '0.5rem 0' }}>Nenhum atendimento neste mês.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {sessionsVigente.map((s) => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <div>
                            {renderPatientLink(s.patientName, { fontSize: '0.85rem' })}
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                              {s.patientName === 'Zenklub' ? (
                                'Total consolidado da semana'
                              ) : (
                                `${getWeekdayName(s.date)} (${s.date.split('-')[2]}/${s.date.split('-')[1]})`
                              )}
                            </span>
                          </div>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--accent-success)' }}>
                            {formatCurrency(s.value)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mês Anterior */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Mês Anterior ({previousMonthName})
                    </span>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Subtotal: {formatCurrency(totalAnterior)}
                    </strong>
                  </div>
                  {sessionsAnterior.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem', margin: '0.5rem 0' }}>Nenhum atendimento pendente do mês anterior.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {sessionsAnterior.map((s) => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <div>
                            {renderPatientLink(s.patientName, { fontSize: '0.85rem' })}
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                              {s.patientName === 'Zenklub' ? (
                                'Total consolidado da semana'
                              ) : (
                                `${getWeekdayName(s.date)} (${s.date.split('-')[2]}/${s.date.split('-')[1]})`
                              )}
                            </span>
                          </div>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {formatCurrency(s.value)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Total Geral da Semana */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.75rem', flexShrink: 0 }}>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Total Geral da Semana:</strong>
                <strong style={{ fontSize: '1rem', color: 'var(--accent-success)' }}>{formatCurrency(weekSessionsTotal)}</strong>
              </div>

            </div>
          )}
        </Card>

        <Card title="Origem dos Analisandos Ativos">
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="dashboard-scrollable-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              {[
                { key: 'particular', label: 'Particular' },
                { key: 'social_clinic', label: 'Clínica Social' },
                { key: 'zenklub', label: 'Zenklub' },
                { key: 'integrando_ser', label: 'Integrando Ser' },
                { key: 'training_student', label: 'Aluno em Formação' }
              ].map((item) => {
                const activeCount = patients.filter(p => p.status === 'active').length;
                const count = patients.filter(p => p.origin === item.key && p.status === 'active').length;
                const pct = activeCount > 0 ? (count / activeCount) * 100 : 0;
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
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.75rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Ativos do Zenklub:</span>
                <strong>{patients.filter(p => p.origin === 'zenklub' && p.status === 'active').length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Ativos sem o Zenklub:</span>
                <strong>{patients.filter(p => p.origin !== 'zenklub' && p.status === 'active').length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                <span>Total de Analisandos Ativos Geral:</span>
                <strong>{patients.filter(p => p.status === 'active').length}</strong>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {showZenklubModal && (
        <div className="modal-overlay" onClick={() => setShowZenklubModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                Detalhamento Zenklub - Ciclo
              </h3>
              <button 
                onClick={() => setShowZenklubModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Período de apuração: <strong>{zenklubCyclePeriodLabel}</strong>
            </p>

            {zenklubSessionsForDetail.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
                Nenhuma sessão registrada para analisandos Zenklub neste ciclo.
              </p>
            ) : (
              <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem' }}>Analisando</th>
                      <th style={{ padding: '0.75rem' }}>Data</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zenklubSessionsForDetail.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < zenklubSessionsForDetail.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                        <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>{renderPatientLink(item.patientName, { fontWeight: '600' })}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{item.date ? item.date.split('-').reverse().join('/') : ''}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--accent-success)', fontWeight: 'bold' }}>{formatCurrency(item.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Total Consolidado:
              </span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--accent-primary)' }}>
                {formatCurrency(zenklubTotalFaturado)}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowZenklubModal(false)}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceitaModal && (
        <div className="modal-overlay" onClick={() => setShowReceitaModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                Detalhamento - Receita Efetivada
              </h3>
              <button 
                onClick={() => setShowReceitaModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Período: <strong>{selectedMonth || 'Todos os meses'} / {selectedYear}</strong>
            </p>

            {(() => {
              const paidInvoices = displayInvoices
                .filter(inv => isInvoiceValidForPatientStatus(inv) && inv.id !== 'virtual-zenklub-invoice' && inv.paidValue > 0)
                .sort((a, b) => a.patientName.localeCompare(b.patientName));

              if (paidInvoices.length === 0) {
                return (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
                    Nenhum pagamento registrado neste período.
                  </p>
                );
              }

              return (
                <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '0.75rem' }}>Analisando</th>
                        <th style={{ padding: '0.75rem' }}>Referência</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Valor Pago</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paidInvoices.map((item, idx) => (
                        <tr key={item.id || idx} style={{ borderBottom: idx < paidInvoices.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                          <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>{renderPatientLink(item.patientName, { fontWeight: '600' })}</td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{item.month} / {item.year}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--accent-success)', fontWeight: 'bold' }}>{formatCurrency(item.paidValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Total Efetivado:
              </span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--accent-success)' }}>
                {formatCurrency(totalMetrics.recebido)}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowReceitaModal(false)}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {showPendenteModal && (
        <div className="modal-overlay" onClick={() => setShowPendenteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                Detalhamento - Saldo Devedor
              </h3>
              <button 
                onClick={() => setShowPendenteModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Período: <strong>{selectedMonth || 'Todos os meses'} / {selectedYear}</strong>
            </p>

            {(() => {
              const pendingInvoices = displayInvoices
                .filter(inv => isInvoiceValidForPatientStatus(inv) && inv.id !== 'virtual-zenklub-invoice' && inv.pendingValue > 0)
                .sort((a, b) => a.patientName.localeCompare(b.patientName));

              if (pendingInvoices.length === 0) {
                return (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
                    Nenhum saldo pendente neste período.
                  </p>
                );
              }

              return (
                <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '0.75rem' }}>Analisando</th>
                        <th style={{ padding: '0.75rem' }}>Referência</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Valor Devido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingInvoices.map((item, idx) => (
                        <tr key={item.id || idx} style={{ borderBottom: idx < pendingInvoices.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                          <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                            {renderPatientLink(item.patientName)}
                          </td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{item.month} / {item.year}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--accent-danger)', fontWeight: 'bold' }}>{formatCurrency(item.pendingValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Total Pendente:
              </span>
              <strong style={{ fontSize: '1.2rem', color: 'var(--accent-danger)' }}>
                {formatCurrency(totalMetrics.pendente)}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowPendenteModal(false)}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrevistaModal && (
        <div className="modal-overlay" onClick={() => setShowPrevistaModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                Detalhamento - Receita Prevista
              </h3>
              <button 
                onClick={() => setShowPrevistaModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Período: <strong>{selectedMonth || 'Todos os meses'} / {selectedYear}</strong>
            </p>

            {previstaList.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
                Nenhum paciente ou atendimento registrado neste período.
              </p>
            ) : (
              <>
                <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '0.75rem' }}>Analisando</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Sessões Previstas</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Valor Previsto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previstaList.map((item, idx) => (
                        <tr key={item.patientName || idx} style={{ borderBottom: idx < previstaList.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                          <td style={{ padding: '0.75rem' }}>
                            {renderPatientLink(item.patientName, { fontWeight: '600' })}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            {item.sessionsCount}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                            {formatCurrency(item.expectedValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Total Previsto:
                  </span>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--accent-primary)' }}>
                    {formatCurrency(totalPrevistaCalculated)}
                  </strong>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowPrevistaModal(false)}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
