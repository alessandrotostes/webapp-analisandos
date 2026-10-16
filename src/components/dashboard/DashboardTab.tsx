import { useState } from 'react';
import { Card } from '../ui/Card';
import type { Session, Patient } from '../../types';

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
  salarioLiquidoRecebido,
  salaryTotalRepasses,
  annualBruto,
  annualLiquido,
  salaryMonth,
  selectedYear,
  sessions = [],
  onSelectPatientByName,
}: DashboardTabProps) {
  const [showZenklubModal, setShowZenklubModal] = useState(false);
  const [showInvestimentosModal, setShowInvestimentosModal] = useState(false);
  const [showReceitaModal, setShowReceitaModal] = useState(false);
  const [showPrevistaModal, setShowPrevistaModal] = useState(false);
  const [showPendenteModal, setShowPendenteModal] = useState(false);

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

  const monthNum = monthNumMap[selectedMonth] || '10';
  const prefix = `${selectedYear}-${monthNum}`;
  const isFromOctoberOnwards = selectedYear > 2026 || (selectedYear === 2026 && (!selectedMonth || Number(monthNum) >= 10));

  const getSessionValueHelper = (s: Session) => {
    if (s.sessionValue !== undefined && s.sessionValue !== null) return s.sessionValue;
    const p = patients.find(pat => pat.name === s.patientName);
    return p ? p.defaultRate : (Number(s.paymentInfo) || 150);
  };

  // Cálculo dos valores recebidos na semana vigente (para o card Investimentos - 20%)
  const { weekPaidSessions, weekReceivedTotal, weeklyInvestment, monthlyAccumulatedInvestment } = (() => {
    const today = new Date();
    const day = today.getDay();
    const saturdayStart = new Date(today);
    let diffToSaturday = 0;
    if (day === 6) {
      diffToSaturday = 0;
    } else if (day === 0) {
      diffToSaturday = -1;
    } else {
      diffToSaturday = -(day + 1);
    }
    saturdayStart.setDate(today.getDate() + diffToSaturday);
    saturdayStart.setHours(0, 0, 0, 0);

    const saturdayEnd = new Date(saturdayStart);
    saturdayEnd.setDate(saturdayStart.getDate() + 7);
    saturdayEnd.setHours(23, 59, 59, 999);

    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayStr}`;
    };

    const startStr = fmt(saturdayStart);
    const endStr = fmt(saturdayEnd);

    const zenklubPatientsLocal = patients.filter(p => p.origin === 'zenklub');
    const zenklubPatientNamesLocal = new Set(zenklubPatientsLocal.map(p => p.name));

    const monthPaidSessions = (sessions || []).filter(s => {
      const isZenklub = !isFromOctoberOnwards && (s.patientType === 'zenklub' || (s.patientType === undefined && (zenklubPatientNamesLocal.has(s.patientName) || s.modality === 'zenklub')));
      if (isZenklub) return false;
      if (!s.date || !s.date.startsWith(prefix)) return false;
      if (s.isCancelled && !s.isCharged) return false;
      return s.isPaid === true || s.isPackage === true;
    });

    const paidThisWeek = monthPaidSessions
      .filter(s => s.date >= startStr && s.date <= endStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    const weekRec = paidThisWeek.reduce((sum, s) => sum + getSessionValueHelper(s), 0);
    const monthRec = monthPaidSessions.reduce((sum, s) => sum + getSessionValueHelper(s), 0);

    return {
      weekPaidSessions: paidThisWeek,
      weekReceivedTotal: weekRec,
      weeklyInvestment: weekRec * 0.20,
      monthlyAccumulatedInvestment: monthRec * 0.20
    };
  })();

  const eligiblePatientsForPrevista = patients
    .filter(p => {
      if (!isFromOctoberOnwards && p.origin === 'zenklub') return false;
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

    const expectedValue = patientSessions.reduce((sum, s) => {
      const rate = p.defaultRate;
      const val = s.sessionValue !== undefined ? s.sessionValue : rate;
      return sum + val;
    }, 0);

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
      {/* Acumulado do Ano e Resumo Mensal (Tamanho Pequeno) */}
      <div className="dashboard-summary-bar">
        <div>
          <span style={{ fontWeight: '600' }}>Acumulado (Jan a {salaryMonth.toLowerCase()}/{selectedYear}):</span>
          <span style={{ marginLeft: '0.5rem' }}>Bruto: <strong style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{formatCurrency(annualBruto)}</strong></span>
          <span className="divider">
            Líquido: <strong style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{formatCurrency(annualLiquido)}</strong>
          </span>
        </div>
        <div>
          <span>
            Pago: <strong style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{formatCurrency(salarioLiquidoRecebido)}</strong>
          </span>
          <span className="divider">
            Despesas/Repasses: <strong style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{formatCurrency(salaryTotalRepasses)}</strong>
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
        {isFromOctoberOnwards ? (
          <div onClick={() => setShowInvestimentosModal(true)} style={{ cursor: 'pointer' }} title="Clique para ver detalhamento de investimentos">
            <Card title="Investimentos">
              <div className="card-value" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {formatCurrency(weeklyInvestment)}
              </div>
              <p className="card-subtitle">
                20% recebido na semana <br />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'inline-block', marginTop: '0.15rem' }}>
                  Acumulado no mês: <strong style={{ color: 'var(--accent-primary)' }}>{formatCurrency(monthlyAccumulatedInvestment)}</strong>
                </span>
              </p>
            </Card>
          </div>
        ) : (
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
        )}
        <Card title="Custo de Consultório">
          <div className="card-value" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {formatCurrency(rentTotalPaid)}
          </div>
          <p className="card-subtitle">Custo de sublocação no mês vigente</p>
        </Card>
      </section>

      <div className="dashboard-bottom-grid">
        <Card title="Próximas Sessões da Semana">
          {loadingUpcomingSessions && loadingSessions ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando agenda...</p>
          ) : (
            (() => {
              const today = new Date();
              const dayOfWeek = today.getDay();
              const saturdayStart = new Date(today);
              let diffToSaturday = 0;
              if (dayOfWeek === 6) {
                diffToSaturday = 0;
              } else if (dayOfWeek === 0) {
                diffToSaturday = -1;
              } else {
                diffToSaturday = -(dayOfWeek + 1);
              }
              saturdayStart.setDate(today.getDate() + diffToSaturday);

              const fmtIso = (d: Date) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${dd}`;
              };

              const todayStr = fmtIso(today);

              // Combina sessões carregadas sem duplicar
              const mergedSessionsMap = new Map<string, Session>();
              [...(sessions || []), ...(upcomingSessions || [])].forEach((s) => {
                if (!s.date) return;
                if (s.isCancelled && !s.isCharged) return;
                const key = s.id || `${s.patientName}-${s.date}`;
                mergedSessionsMap.set(key, s);
              });
              const allValidWeekPool = Array.from(mergedSessionsMap.values());

              const weekDays = [
                { offset: 2, short: 'SEG', full: 'Segunda-feira' },
                { offset: 3, short: 'TER', full: 'Terça-feira' },
                { offset: 4, short: 'QUA', full: 'Quarta-feira' },
                { offset: 5, short: 'QUI', full: 'Quinta-feira' },
                { offset: 6, short: 'SEX', full: 'Sexta-feira' },
              ].map((wd) => {
                const d = new Date(saturdayStart);
                d.setDate(saturdayStart.getDate() + wd.offset);
                const dateStr = fmtIso(d);
                const [, mm, dd] = dateStr.split('-');
                const daySessions = allValidWeekPool
                  .filter((s) => s.date === dateStr)
                  .sort((a, b) => a.patientName.localeCompare(b.patientName));

                return {
                  ...wd,
                  dateStr,
                  dayNum: dd,
                  monthNum: mm,
                  formattedDate: `${dd}/${mm}/${d.getFullYear()}`,
                  isToday: dateStr === todayStr,
                  daySessions,
                };
              });

              const totalWeeklyCount = weekDays.reduce((acc, wd) => acc + wd.daySessions.length, 0);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                  {/* Resumo da Carga Semanal */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(56, 189, 248, 0.08)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: '8px',
                      padding: '0.45rem 0.75rem',
                      marginBottom: '0.75rem',
                      fontSize: '0.8rem',
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                    }}
                  >
                    <span>📅 Carga Semanal:</span>
                    <strong>{totalWeeklyCount} {totalWeeklyCount === 1 ? 'sessão programada' : 'sessões programadas'} nesta semana</strong>
                  </div>

                  <div
                    className="dashboard-scrollable-content"
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}
                  >
                    {weekDays.map((day) => (
                      <div
                        key={day.dateStr}
                        style={{
                          display: 'flex',
                          alignItems: 'stretch',
                          background: day.isToday ? 'rgba(56, 189, 248, 0.06)' : 'var(--bg-main)',
                          borderRadius: '10px',
                          border: day.isToday
                            ? '1px solid var(--accent-primary)'
                            : '1px solid var(--border-color)',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        {/* Folha de Calendário Lateral (Dia da Semana + Data) */}
                        <div
                          style={{
                            width: '68px',
                            minWidth: '68px',
                            background: day.isToday
                              ? 'rgba(56, 189, 248, 0.16)'
                              : 'rgba(255, 255, 255, 0.03)',
                            borderRight: day.isToday
                              ? '1px solid rgba(56, 189, 248, 0.35)'
                              : '1px solid var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.5rem 0.35rem',
                            textAlign: 'center',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              letterSpacing: '0.06em',
                              color: day.isToday ? 'var(--accent-primary)' : 'var(--text-muted)',
                              textTransform: 'uppercase',
                            }}
                          >
                            {day.short}
                          </span>
                          <span
                            style={{
                              fontSize: '1.25rem',
                              fontWeight: 800,
                              lineHeight: 1.15,
                              color: day.isToday ? 'var(--accent-primary)' : 'var(--text-primary)',
                            }}
                          >
                            {day.dayNum}
                          </span>
                        </div>

                        {/* Conteúdo do Dia: Cabeçalho + Nomes dos Pacientes */}
                        <div
                          style={{
                            flex: 1,
                            padding: '0.55rem 0.75rem',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                              paddingBottom: '0.25rem',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: day.isToday ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              }}
                            >
                              {day.full} • Dia {day.dayNum}
                            </span>
                            {day.isToday && (
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '999px',
                                  background: 'rgba(56, 189, 248, 0.2)',
                                  color: 'var(--accent-primary)',
                                  textTransform: 'uppercase',
                                }}
                              >
                                Hoje
                              </span>
                            )}
                          </div>

                          {day.daySessions.length === 0 ? (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                fontStyle: 'italic',
                              }}
                            >
                              Sem sessões agendadas
                            </span>
                          ) : (
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.35rem',
                              }}
                            >
                              {day.daySessions.map((s, idx) => {
                                const isPresencial = (s.modality || '').toLowerCase().includes('presencial');
                                return (
                                  <span
                                    key={s.id || `${s.patientName}-${idx}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '6px',
                                      padding: '0.2rem 0.5rem',
                                      fontSize: '0.78rem',
                                    }}
                                    title={`Modalidade: ${isPresencial ? 'Presencial (Consultório)' : 'Online'}`}
                                  >
                                    <span style={{ fontSize: '0.72rem' }}>{isPresencial ? '🏢' : '🌐'}</span>
                                    {renderPatientLink(s.patientName, {
                                      fontSize: '0.78rem',
                                      textDecoration: 'none',
                                    })}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()
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
                { key: 'integrando_ser', label: 'Integrando Ser' },
                { key: 'training_student', label: 'Aluno em Formação' },
                { key: 'supervision', label: 'Supervisão' }
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
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.75rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Total de Supervisão:</span>
                <strong>{patients.filter(p => p.origin === 'supervision' && p.status === 'active').length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                <span>Total das Outras Categorias:</span>
                <strong>{patients.filter(p => p.origin !== 'supervision' && p.status === 'active').length}</strong>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Card Pequeno: Pacientes Ativos Há 1 Ano ou Mais Sem Reajuste */}
      <div style={{ marginTop: '1.25rem' }}>
        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            minHeight: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {(() => {
            const today = new Date();
            const oneYearAgo = new Date(
              today.getFullYear() - 1,
              today.getMonth(),
              today.getDate()
            );
            const oneYearAgoStr = `${oneYearAgo.getFullYear()}-${String(
              oneYearAgo.getMonth() + 1
            ).padStart(2, '0')}-${String(oneYearAgo.getDate()).padStart(2, '0')}`;

            const fmtDateBr = (dStr: string) => {
              if (!dStr) return '—';
              const parts = dStr.split('-');
              return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
            };

            const overdueReadjustmentPatients = patients
              .filter((p) => p.status === 'active')
              .map((p) => {
                const sortedReadj = [...(p.rateReadjustments || [])]
                  .filter((r) => !!r.date)
                  .sort((a, b) => b.date.localeCompare(a.date));
                const lastReadj = sortedReadj[0] || null;

                let firstSession = p.firstSessionDate || '';
                if (!firstSession) {
                  const pSessions = (sessions || [])
                    .filter(
                      (s) =>
                        s.patientName === p.name &&
                        s.date &&
                        (!s.isCancelled || s.isCharged)
                    )
                    .sort((a, b) => a.date.localeCompare(b.date));
                  firstSession = pSessions[0]?.date || '';
                }

                const referenceDate = lastReadj ? lastReadj.date : firstSession;
                const isOneYearOrMore =
                  !!referenceDate && referenceDate <= oneYearAgoStr;

                return {
                  id: p.id || p.name,
                  name: p.name,
                  currentRate: p.defaultRate,
                  lastReadjustmentDate: lastReadj ? lastReadj.date : null,
                  referenceDate,
                  isOneYearOrMore,
                };
              })
              .filter((item) => item.isOneYearOrMore)
              .sort((a, b) => a.referenceDate.localeCompare(b.referenceDate));

            return (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '0.5rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      margin: 0,
                    }}
                  >
                    Pacientes Ativos Há 1 Ano ou Mais Sem Reajuste
                  </h3>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                      background:
                        overdueReadjustmentPatients.length > 0
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(16, 185, 129, 0.15)',
                      color:
                        overdueReadjustmentPatients.length > 0
                          ? 'var(--accent-warning)'
                          : 'var(--accent-success)',
                      border: `1px solid ${
                        overdueReadjustmentPatients.length > 0
                          ? 'var(--accent-warning)'
                          : 'var(--accent-success)'
                      }`,
                    }}
                  >
                    {overdueReadjustmentPatients.length}{' '}
                    {overdueReadjustmentPatients.length === 1
                      ? 'paciente'
                      : 'pacientes'}
                  </span>
                </div>

                {overdueReadjustmentPatients.length === 0 ? (
                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      fontSize: '0.82rem',
                      margin: 0,
                    }}
                  >
                    Nenhum paciente ativo completou 1 ano ou mais sem reajuste até hoje.
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
                      gap: '0.6rem',
                      maxHeight: '165px',
                      overflowY: 'auto',
                      paddingRight: '0.25rem',
                    }}
                  >
                    {overdueReadjustmentPatients.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          {renderPatientLink(item.name, { fontSize: '0.85rem' })}
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {item.lastReadjustmentDate
                              ? `Último reajuste: ${fmtDateBr(item.lastReadjustmentDate)}`
                              : `Sem reajuste (1ª sessão: ${fmtDateBr(item.referenceDate)})`}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              color: 'var(--text-muted)',
                              display: 'block',
                            }}
                          >
                            Sessão
                          </span>
                          <strong
                            style={{
                              fontSize: '0.85rem',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {formatCurrency(item.currentRate)}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Gráfico de Evolução Anual da Clínica (Janeiro a Dezembro) */}
      <div style={{ marginTop: '1.5rem' }}>
        <Card title={`Evolução da Clínica ao Longo do Ano (${selectedYear})`}>
          {(() => {
            const monthsInfo = [
              { num: '01', short: 'Jan', full: 'Janeiro' },
              { num: '02', short: 'Fev', full: 'Fevereiro' },
              { num: '03', short: 'Mar', full: 'Março' },
              { num: '04', short: 'Abr', full: 'Abril' },
              { num: '05', short: 'Mai', full: 'Maio' },
              { num: '06', short: 'Jun', full: 'Junho' },
              { num: '07', short: 'Jul', full: 'Julho' },
              { num: '08', short: 'Ago', full: 'Agosto' },
              { num: '09', short: 'Set', full: 'Setembro' },
              { num: '10', short: 'Out', full: 'Outubro' },
              { num: '11', short: 'Nov', full: 'Novembro' },
              { num: '12', short: 'Dez', full: 'Dezembro' }
            ];

            const zenklubPats = patients.filter(p => p.origin === 'zenklub');
            const zenklubNames = new Set(zenklubPats.map(p => p.name));

            const monthlyStats = monthsInfo.map((m, idx) => {
              const mPrefix = `${selectedYear}-${m.num}`;
              const isOctOrAfter = selectedYear > 2026 || (selectedYear === 2026 && idx + 1 >= 10);

              const validMonthSessions = (sessions || []).filter(s => {
                if (!s.date || !s.date.startsWith(mPrefix)) return false;
                return !s.isCancelled || s.isCharged;
              });

              const uniquePatients = new Set(validMonthSessions.map(s => s.patientName));
              const patientsCount = uniquePatients.size;

              const nonZenklubValidSessions = validMonthSessions.filter(s => {
                const isZk = !isOctOrAfter && (s.patientType === 'zenklub' || (s.patientType === undefined && (zenklubNames.has(s.patientName) || s.modality === 'zenklub')));
                return !isZk;
              });

              const pendingCount = nonZenklubValidSessions.filter(
                s => !s.isPaid && !s.isPackage
              ).length;

              const nonZenklubPaidRevenue = nonZenklubValidSessions
                .filter(s => s.isPaid === true || s.isPackage === true)
                .reduce((sum, s) => sum + getSessionValueHelper(s), 0);

              let zenklubCycleRevenue = 0;
              if (!isOctOrAfter) {
                const M = idx + 1;
                let startMonthIndex = M - 1;
                let startYear = selectedYear;
                if (startMonthIndex === 0) {
                  startMonthIndex = 12;
                  startYear = selectedYear - 1;
                }
                const startStr = `${startYear}-${String(startMonthIndex).padStart(2, '0')}-24`;
                const endStr = `${selectedYear}-${m.num}-23`;
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const paymentDateStr = `${selectedYear}-${m.num}-06`;

                if (todayStr >= paymentDateStr) {
                  zenklubCycleRevenue = (sessions || [])
                    .filter(s => {
                      const isZk = s.patientType === 'zenklub' || (s.patientType === undefined && (zenklubNames.has(s.patientName) || s.modality === 'zenklub'));
                      return isZk && s.date >= startStr && s.date <= endStr && s.date <= todayStr && (!s.isCancelled || s.isCharged);
                    })
                    .reduce((sum, s) => sum + getSessionValueHelper(s), 0);
                }
              }

              return {
                ...m,
                patientsCount,
                pendingCount,
                revenue: nonZenklubPaidRevenue + zenklubCycleRevenue
              };
            });

            const maxPatients = Math.max(...monthlyStats.map(m => m.patientsCount), 0);
            const maxRevenue = Math.max(...monthlyStats.map(m => m.revenue), 0);

            const monthsWithPatients = monthlyStats.filter(m => m.patientsCount > 0);
            const minPatients = monthsWithPatients.length > 0
              ? Math.min(...monthsWithPatients.map(m => m.patientsCount))
              : 0;

            const monthsWithRevenueAndNoPending = monthlyStats.filter(
              m => m.revenue > 0 && m.pendingCount === 0
            );
            const minRevenue = monthsWithRevenueAndNoPending.length > 0
              ? Math.min(...monthsWithRevenueAndNoPending.map(m => m.revenue))
              : 0;

            const peakPatientMonths = maxPatients > 0
              ? monthlyStats.filter(m => m.patientsCount === maxPatients)
              : [];
            const lowPatientMonths = minPatients > 0
              ? monthsWithPatients.filter(m => m.patientsCount === minPatients)
              : [];

            const peakRevenueMonths = maxRevenue > 0
              ? monthlyStats.filter(m => m.revenue === maxRevenue)
              : [];
            const lowRevenueMonths = minRevenue > 0
              ? monthsWithRevenueAndNoPending.filter(m => m.revenue === minRevenue)
              : [];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
                {/* Destaques do Ano: Maiores em Azul e Menores em Vermelho */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '1rem' }}>
                  {/* Maior Quantidade de Pacientes (Azul) */}
                  <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.35)', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                        Maior Qtd. de Pacientes
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--accent-primary)' }}>
                        {peakPatientMonths.length > 0 ? peakPatientMonths.map(m => m.full).join(', ') : 'Sem registros'}
                      </strong>
                    </div>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
                      {maxPatients} pac.
                    </strong>
                  </div>

                  {/* Maior Ganho Financeiro (Azul) */}
                  <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.35)', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                        Maior Ganho Financeiro
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--accent-primary)' }}>
                        {peakRevenueMonths.length > 0 ? peakRevenueMonths.map(m => m.full).join(', ') : 'Sem registros'}
                      </strong>
                    </div>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
                      {formatCurrency(maxRevenue)}
                    </strong>
                  </div>

                  {/* Menor Quantidade de Pacientes (Vermelho) */}
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                        Menor Qtd. de Pacientes
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--accent-danger)' }}>
                        {lowPatientMonths.length > 0 ? lowPatientMonths.map(m => m.full).join(', ') : 'Sem registros'}
                      </strong>
                    </div>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--accent-danger)', whiteSpace: 'nowrap' }}>
                      {minPatients} pac.
                    </strong>
                  </div>

                  {/* Menor Ganho Financeiro sem Pendências (Vermelho) */}
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                        Menor Ganho (Sem Pendências)
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--accent-danger)' }}>
                        {lowRevenueMonths.length > 0 ? lowRevenueMonths.map(m => m.full).join(', ') : 'Sem registros'}
                      </strong>
                    </div>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--accent-danger)', whiteSpace: 'nowrap' }}>
                      {formatCurrency(minRevenue)}
                    </strong>
                  </div>
                </div>

                {/* Legenda */}
                <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'flex-end', fontSize: '0.75rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#cbd5e1', display: 'inline-block' }} />
                    Pacientes (Cinza Pastel)
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#86efac', display: 'inline-block' }} />
                    Ganho Financeiro (Verde Pastel)
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--accent-primary)', display: 'inline-block' }} />
                    Mês de Alta (Azul)
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--accent-danger)', display: 'inline-block' }} />
                    Mês de Baixa (Vermelho)
                  </span>
                </div>

                {/* Gráfico de Barras Simples (Jan a Dez) */}
                <div style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(68px, 1fr))', gap: '0.5rem', alignItems: 'end', minHeight: '210px', padding: '1rem 0.5rem 0.5rem 0.5rem', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    {monthlyStats.map((m) => {
                      const patHeightPct = maxPatients > 0 ? Math.max((m.patientsCount / maxPatients) * 100, m.patientsCount > 0 ? 8 : 2) : 2;
                      const revHeightPct = maxRevenue > 0 ? Math.max((m.revenue / maxRevenue) * 100, m.revenue > 0 ? 8 : 2) : 2;
                      const isPeakPat = maxPatients > 0 && m.patientsCount === maxPatients;
                      const isLowPat = minPatients > 0 && minPatients < maxPatients && m.patientsCount === minPatients;
                      const isPeakRev = maxRevenue > 0 && m.revenue === maxRevenue;
                      const isLowRev = minRevenue > 0 && minRevenue < maxRevenue && m.pendingCount === 0 && m.revenue === minRevenue;
                      const isSelected = selectedMonth && m.full.toUpperCase() === selectedMonth.toUpperCase();

                      const patColor = isPeakPat
                        ? 'var(--accent-primary)'
                        : isLowPat
                          ? 'var(--accent-danger)'
                          : 'rgba(203, 213, 225, 0.75)';
                      const revColor = isPeakRev
                        ? 'var(--accent-primary)'
                        : isLowRev
                          ? 'var(--accent-danger)'
                          : 'rgba(134, 239, 172, 0.75)';

                      return (
                        <div
                          key={m.num}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.2rem',
                            borderRadius: '8px',
                            background: isSelected ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                            border: isSelected ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent'
                          }}
                          title={`${m.full}/${selectedYear}: ${m.patientsCount} pacientes | ${formatCurrency(m.revenue)}${m.pendingCount > 0 ? ` (${m.pendingCount} pendente(s))` : ''}`}
                        >
                          {/* Valores no topo */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.65rem', lineHeight: 1.2, minHeight: '26px', justifyContent: 'flex-end' }}>
                            <span style={{ color: isPeakPat ? 'var(--accent-primary)' : isLowPat ? 'var(--accent-danger)' : 'var(--text-secondary)', fontWeight: isPeakPat || isLowPat ? '700' : '500' }}>
                              {m.patientsCount} pac.
                            </span>
                            <span style={{ color: isPeakRev ? 'var(--accent-primary)' : isLowRev ? 'var(--accent-danger)' : 'var(--text-muted)', fontWeight: isPeakRev || isLowRev ? '700' : '500', whiteSpace: 'nowrap' }}>
                              {m.revenue > 0 ? formatCurrency(m.revenue) : 'R$ 0'}
                            </span>
                          </div>

                          {/* Barras */}
                          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '5px', height: '120px', width: '100%' }}>
                            <div
                              style={{
                                width: '14px',
                                height: `${patHeightPct}%`,
                                background: patColor,
                                borderRadius: '4px 4px 0 0',
                                transition: 'height 0.3s ease',
                                boxShadow: isPeakPat ? '0 0 8px rgba(56, 189, 248, 0.45)' : isLowPat ? '0 0 8px rgba(239, 68, 68, 0.45)' : 'none'
                              }}
                            />
                            <div
                              style={{
                                width: '14px',
                                height: `${revHeightPct}%`,
                                background: revColor,
                                borderRadius: '4px 4px 0 0',
                                transition: 'height 0.3s ease',
                                boxShadow: isPeakRev ? '0 0 8px rgba(56, 189, 248, 0.45)' : isLowRev ? '0 0 8px rgba(239, 68, 68, 0.45)' : 'none'
                              }}
                            />
                          </div>

                          {/* Rótulo do Mês */}
                          <span style={{ fontSize: '0.75rem', fontWeight: isSelected || isPeakPat || isPeakRev || isLowPat || isLowRev ? '700' : '500', color: isPeakPat || isPeakRev ? 'var(--accent-primary)' : isLowPat || isLowRev ? 'var(--accent-danger)' : isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {m.short}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </Card>
      </div>

      {showInvestimentosModal && (
        <div className="modal-overlay" onClick={() => setShowInvestimentosModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                Detalhamento - Investimentos (20%)
              </h3>
              <button 
                onClick={() => setShowInvestimentosModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Reserva semanal de <strong>20%</strong> sobre a receita efetivada (valores recebidos) na semana vigente.
            </p>

            {weekPaidSessions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
                Nenhum pagamento confirmado nesta semana até o momento.
              </p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem' }}>Analisando</th>
                      <th style={{ padding: '0.75rem' }}>Data</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Recebido</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Reserva (20%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekPaidSessions.map((item, idx) => {
                      const val = getSessionValueHelper(item);
                      return (
                        <tr key={item.id || idx} style={{ borderBottom: idx < weekPaidSessions.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                          <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>{renderPatientLink(item.patientName, { fontWeight: '600' })}</td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{item.date ? item.date.split('-').reverse().join('/') : ''}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--accent-success)' }}>{formatCurrency(val)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{formatCurrency(val * 0.20)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Total Recebido na Semana:
                </span>
                <strong style={{ fontSize: '1rem', color: 'var(--accent-success)' }}>
                  {formatCurrency(weekReceivedTotal)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                  Valor a Reservar na Semana (20%):
                </span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--accent-primary)' }}>
                  {formatCurrency(weeklyInvestment)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Acumulado no Mês ({selectedMonth} / {selectedYear}):
                </span>
                <strong style={{ fontSize: '1rem', color: 'var(--accent-primary)' }}>
                  {formatCurrency(monthlyAccumulatedInvestment)}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowInvestimentosModal(false)}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

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
              const getSessionValue = (s: Session) => {
                if (s.sessionValue !== undefined && s.sessionValue !== null) return s.sessionValue;
                const p = patients.find(pat => pat.name === s.patientName);
                return p ? p.defaultRate : (Number(s.paymentInfo) || 150);
              };

              const zenklubPatients = patients.filter(p => p.origin === 'zenklub');
              const zenklubPatientNames = new Set(zenklubPatients.map(p => p.name));

              const nonZenklubMonthSessions = (sessions || []).filter(s => {
                const isZenklub = !isFromOctoberOnwards && (s.patientType === 'zenklub' || (s.patientType === undefined && (zenklubPatientNames.has(s.patientName) || s.modality === 'zenklub')));
                if (isZenklub) return false;
                return s.date && s.date.startsWith(prefix) && (!s.isCancelled || s.isCharged);
              });

              const paidMap = new Map<string, number>();
              nonZenklubMonthSessions.filter(s => s.isPaid === true || s.isPackage === true).forEach(s => {
                const current = paidMap.get(s.patientName) || 0;
                paidMap.set(s.patientName, current + getSessionValue(s));
              });

              const paidItems = Array.from(paidMap.entries())
                .map(([patientName, paidValue]) => ({
                  patientName,
                  month: selectedMonth,
                  year: selectedYear,
                  paidValue
                }))
                .sort((a, b) => a.patientName.localeCompare(b.patientName));

              if (paidItems.length === 0) {
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
                      {paidItems.map((item, idx) => (
                        <tr key={item.patientName || idx} style={{ borderBottom: idx < paidItems.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
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
              const getSessionValue = (s: Session) => {
                if (s.sessionValue !== undefined && s.sessionValue !== null) return s.sessionValue;
                const p = patients.find(pat => pat.name === s.patientName);
                return p ? p.defaultRate : (Number(s.paymentInfo) || 150);
              };

              const zenklubPatients = patients.filter(p => p.origin === 'zenklub');
              const zenklubPatientNames = new Set(zenklubPatients.map(p => p.name));

              const nonZenklubMonthSessions = (sessions || []).filter(s => {
                const isZenklub = !isFromOctoberOnwards && (s.patientType === 'zenklub' || (s.patientType === undefined && (zenklubPatientNames.has(s.patientName) || s.modality === 'zenklub')));
                if (isZenklub) return false;
                return s.date && s.date.startsWith(prefix) && (!s.isCancelled || s.isCharged);
              });

              const pendingMap = new Map<string, { pendingValue: number; dates: string[] }>();
              nonZenklubMonthSessions.filter(s => s.isPaid !== true && !s.isPackage).forEach(s => {
                const current = pendingMap.get(s.patientName) || { pendingValue: 0, dates: [] };
                current.pendingValue += getSessionValue(s);
                if (s.date) {
                  current.dates.push(s.date);
                }
                pendingMap.set(s.patientName, current);
              });

              const pendingItems = Array.from(pendingMap.entries())
                .map(([patientName, data]) => {
                  const sortedDates = [...data.dates].sort((a, b) => a.localeCompare(b));
                  return {
                    patientName,
                    dates: sortedDates,
                    oldestDate: sortedDates[0] || '9999-99-99',
                    pendingValue: data.pendingValue
                  };
                })
                .sort((a, b) => a.oldestDate.localeCompare(b.oldestDate) || a.patientName.localeCompare(b.patientName));

              if (pendingItems.length === 0) {
                return (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
                    Nenhum saldo pendente neste período.
                  </p>
                );
              }

              const now = new Date();
              const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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
                      {pendingItems.map((item, idx) => (
                        <tr key={item.patientName || idx} style={{ borderBottom: idx < pendingItems.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                          <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                            {renderPatientLink(item.patientName)}
                          </td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                            {item.dates.map((d, dIdx) => {
                              const isPast = d < todayStr;
                              return (
                                <span key={d + dIdx}>
                                  <span style={{ color: isPast ? 'var(--accent-danger)' : 'var(--text-secondary)', fontWeight: isPast ? '600' : '400' }}>
                                    {d.split('-').reverse().join('/')}
                                  </span>
                                  {dIdx < item.dates.length - 1 ? ', ' : ''}
                                </span>
                              );
                            })}
                          </td>
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
