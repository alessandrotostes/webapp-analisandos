import { Card } from '../ui/Card';

interface TransfersTabProps {
  hideValues?: boolean;
  selectedMonth: string;
  integrandoTotalRepasse: number;
  integrandoTotalSessions: number;
  integrandoTotalGross: number;
  integrandoRows: any[];
  presencialTotalRent: number;
  presencialTotalSessions: number;
  presencialTotalNet: number;
  presencialRows: any[];
  privateRows: any[];
  privateTotalSessions: number;
  privateTotalSupervision: number;
  privateTotalNet: number;
  numSupervisions?: number;
  setNumSupervisions?: (num: number) => void;
  costPerSupervision?: number;
  setSessionCostPerSupervision?: (cost: number) => void;
  supervisionTarget?: number;
  privateActivePatientsCount?: number;
  privateSessionsCount?: number;
  suggestedSavePerSession?: number;
  suggestedSavePerPatientMonthly?: number;
  suggestedSavePerSessionAssumingFour?: number;
  formatCurrency: (val: number) => string;
  onToggleRentCancelled?: (sessionId: string, currentVal: boolean) => void;
  onToggleRentPaid?: (sessionId: string, currentVal: boolean) => void;
  supervisionWeeks?: { date: string; value: number; isPaid: boolean; isCancelled: boolean }[];
  onToggleSupervisionPaid?: (dateStr: string, currentVal: boolean) => void;
  onToggleSupervisionCancelled?: (dateStr: string, currentVal: boolean) => void;
}

export function TransfersTab({
  hideValues,
  selectedMonth,
  integrandoTotalRepasse,
  integrandoTotalSessions,
  integrandoRows,
  presencialTotalRent,
  presencialTotalSessions,
  presencialRows,
  formatCurrency,
  onToggleRentCancelled,
  onToggleRentPaid,
  supervisionWeeks = [],
  onToggleSupervisionPaid,
  onToggleSupervisionCancelled
}: TransfersTabProps) {
  const totalWeeksCount = supervisionWeeks.length || 4;
  const weeklyQuota = 360.00 / totalWeeksCount;
  const activeSupervisionTotal = supervisionWeeks
    .filter(w => !w.isCancelled)
    .reduce((sum, w) => sum + w.value, 0);
  const paidSupervisionTotal = supervisionWeeks
    .filter(w => !w.isCancelled && w.isPaid)
    .reduce((sum, w) => sum + w.value, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Cálculos de Repasses e Reservas</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Visão geral de taxas do Integrando Ser, custos de consultório presencial e reserva para supervisão (Mês Vigente: {selectedMonth || 'Mês Atual'})
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
        
        {/* CARD 1: INTEGRANDO SER (MÊS VIGENTE) */}
        <Card title={`1. Repasse Integrando Ser (25%)`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Total Geral a Pagar</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--accent-warning)' }}>{formatCurrency(integrandoTotalRepasse)}</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>
                Baseado em {integrandoTotalSessions} sessões realizadas no mês
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
              {integrandoRows.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>Nenhum atendimento Integrando Ser no mês.</p>
              ) : (
                integrandoRows.map((r, idx) => (
                  <div key={idx} style={{ padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.4rem' }}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{hideValues && r.name !== 'ZENKLUB' ? 'Analisando Oculto' : r.name}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total: {formatCurrency(r.repasse)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {r.sessions.map((s: any, sIdx: number) => (
                        <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span>📅 {s.date.split('-').reverse().join('/')}</span>
                          <span>Desconto: <strong style={{ color: 'var(--accent-warning)' }}>{formatCurrency(s.discount)}</strong> (25% de {formatCurrency(s.value)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* CARD 2: REPASSE CONSULTÓRIO (PRESENCIAL) */}
        <Card title={`2. Aluguel de Consultório (Presencial)`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Total do Mês (Aluguel)</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--accent-danger)' }}>{formatCurrency(presencialTotalRent)}</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>
                Baseado em {presencialTotalSessions} sessões presenciais realizadas
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
              {presencialRows.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>Nenhum atendimento presencial no mês.</p>
              ) : (
                presencialRows.map((r, idx) => (
                  <div key={idx} style={{ padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.4rem' }}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{hideValues && r.name !== 'ZENKLUB' ? 'Analisando Oculto' : r.name}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total: {formatCurrency(r.rent)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {r.sessions.map((s: any, sIdx: number) => (
                        <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span style={{ textDecoration: s.isRentCancelled ? 'line-through' : 'none' }}>
                            📅 {s.date.split('-').reverse().join('/')}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {s.isRentCancelled ? (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Cancelado</span>
                            ) : (
                              <span>Aluguel: <strong style={{ color: 'var(--accent-danger)' }}>{formatCurrency(30.00)}</strong></span>
                            )}
                            {!s.isRentCancelled && (
                              <button
                                onClick={() => onToggleRentPaid?.(s.id, s.isRentPaid)}
                                title={s.isRentPaid ? "Desmarcar como pago" : "Marcar como pago"}
                                style={{
                                  background: s.isRentPaid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                  border: `1px solid ${s.isRentPaid ? 'var(--accent-success)' : 'var(--accent-warning)'}`,
                                  color: s.isRentPaid ? 'var(--accent-success)' : 'var(--accent-warning)',
                                  borderRadius: '4px',
                                  padding: '0.15rem 0.4rem',
                                  fontSize: '0.65rem',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  outline: 'none',
                                  marginRight: '0.25rem'
                                }}
                              >
                                {s.isRentPaid ? "PAGO" : "PAGAR"}
                              </button>
                            )}
                            <button
                              onClick={() => onToggleRentCancelled?.(s.id, s.isRentCancelled)}
                              title={s.isRentCancelled ? "Ativar cobrança de aluguel" : "Cancelar aluguel desta sessão"}
                              style={{
                                background: s.isRentCancelled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                border: `1px solid ${s.isRentCancelled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                color: s.isRentCancelled ? 'var(--accent-success)' : 'var(--accent-danger)',
                                borderRadius: '4px',
                                padding: '0.15rem 0.4rem',
                                fontSize: '0.65rem',
                                cursor: 'pointer',
                                fontWeight: '600',
                                outline: 'none'
                              }}
                            >
                              {s.isRentCancelled ? "Ativar" : "Cancelar"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* CARD 3: RESERVA PARA SUPERVISÃO */}
        <Card title={`3. Reserva para Supervisão`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Total do Mês (Supervisão)</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1.4rem', color: 'var(--accent-primary)' }}>{formatCurrency(activeSupervisionTotal)}</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-success)', fontWeight: '600' }}>
                  Pago: {formatCurrency(paidSupervisionTotal)}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>
                {formatCurrency(360.00)} dividido em {totalWeeksCount} sextas-feiras ({formatCurrency(weeklyQuota)}/semana)
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
              <div style={{ padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.4rem' }}>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>Sextas-feiras do Mês</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>{totalWeeksCount} semanas</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {supervisionWeeks.map((w, idx) => (
                    <div key={w.date || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span style={{ textDecoration: w.isCancelled ? 'line-through' : 'none' }}>
                        📅 {w.date.split('-').reverse().join('/')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {w.isCancelled ? (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Cancelado</span>
                        ) : (
                          <span>Reserva: <strong style={{ color: 'var(--accent-primary)' }}>{formatCurrency(w.value)}</strong></span>
                        )}
                        {!w.isCancelled && (
                          <button
                            onClick={() => onToggleSupervisionPaid?.(w.date, w.isPaid)}
                            title={w.isPaid ? "Desmarcar como pago" : "Marcar como pago"}
                            style={{
                              background: w.isPaid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                              border: `1px solid ${w.isPaid ? 'var(--accent-success)' : 'var(--accent-warning)'}`,
                              color: w.isPaid ? 'var(--accent-success)' : 'var(--accent-warning)',
                              borderRadius: '4px',
                              padding: '0.15rem 0.4rem',
                              fontSize: '0.65rem',
                              cursor: 'pointer',
                              fontWeight: '600',
                              outline: 'none',
                              marginRight: '0.25rem'
                            }}
                          >
                            {w.isPaid ? "PAGO" : "PAGAR"}
                          </button>
                        )}
                        <button
                          onClick={() => onToggleSupervisionCancelled?.(w.date, w.isCancelled)}
                          title={w.isCancelled ? "Ativar reserva desta semana" : "Cancelar reserva desta semana"}
                          style={{
                            background: w.isCancelled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${w.isCancelled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            color: w.isCancelled ? 'var(--accent-success)' : 'var(--accent-danger)',
                            borderRadius: '4px',
                            padding: '0.15rem 0.4rem',
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                            fontWeight: '600',
                            outline: 'none'
                          }}
                        >
                          {w.isCancelled ? "Ativar" : "Cancelar"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
