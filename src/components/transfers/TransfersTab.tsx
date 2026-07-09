import { Card } from '../ui/Card';

interface TransfersTabProps {
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
}

export function TransfersTab({
  selectedMonth,
  integrandoTotalRepasse,
  integrandoTotalSessions,
  integrandoRows,
  presencialTotalRent,
  presencialTotalSessions,
  presencialRows,
  privateRows,
  privateTotalSessions,
  formatCurrency,
  onToggleRentCancelled,
  onToggleRentPaid
}: TransfersTabProps) {
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
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{r.name}</strong>
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
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{r.name}</strong>
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

        {/* CARD 3: ANALISANDOS PARTICULARES (SUPERVISÃO) */}
        <Card title={`3. Reserva para Supervisão (Particular Online)`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Custo de 2 Supervisões (Meta)</span>
              <strong style={{ fontSize: '1.4rem', color: 'var(--accent-primary)' }}>{formatCurrency(360.00)}</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>
                Para atingir a meta mensal de supervisões
              </span>
            </div>

            <div style={{ padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                <strong>Cálculo de Retirada Sugerida:</strong>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Por Paciente Ativo no Mês:</span>
                <strong style={{ color: 'var(--accent-primary)' }}>
                  {privateRows.length > 0 ? formatCurrency(360.00 / privateRows.length) : formatCurrency(360.00)}
                </strong>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '-0.4rem', display: 'block' }}>
                Baseado em {privateRows.length} pacientes particulares online ativos no mês
              </span>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Por Sessão Realizada no Mês:</span>
                <strong style={{ color: 'var(--accent-primary)' }}>
                  {privateTotalSessions > 0 ? formatCurrency(360.00 / privateTotalSessions) : formatCurrency(360.00)}
                </strong>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '-0.4rem', display: 'block' }}>
                Baseado em {privateTotalSessions} sessões particulares online realizadas no mês
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '180px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Pacientes Considerados:</span>
              {privateRows.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>Nenhum paciente particular online ativo no mês.</p>
              ) : (
                privateRows.map((r, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{r.sessionsCount} sessões</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
