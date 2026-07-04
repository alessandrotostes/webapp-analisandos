import { useState } from 'react';
import { Card } from '../ui/Card';
import { Table } from '../ui/Table';

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
  numSupervisions: number;
  setNumSupervisions: (num: number) => void;
  costPerSupervision: number;
  setSessionCostPerSupervision: (cost: number) => void;
  supervisionTarget: number;
  privateActivePatientsCount: number;
  privateSessionsCount: number;
  suggestedSavePerSession: number;
  suggestedSavePerPatientMonthly: number;
  suggestedSavePerSessionAssumingFour: number;
  formatCurrency: (val: number) => string;
}

export function TransfersTab({
  selectedMonth,
  integrandoTotalRepasse,
  integrandoTotalSessions,
  integrandoTotalGross,
  integrandoRows,
  presencialTotalRent,
  presencialTotalSessions,
  presencialTotalNet,
  presencialRows,
  numSupervisions,
  setNumSupervisions,
  costPerSupervision,
  setSessionCostPerSupervision,
  supervisionTarget,
  privateActivePatientsCount,
  privateSessionsCount,
  suggestedSavePerSession,
  suggestedSavePerPatientMonthly,
  suggestedSavePerSessionAssumingFour,
  formatCurrency
}: TransfersTabProps) {
  const [transfersSubTab, setTransfersSubTab] = useState<'integrando' | 'rent' | 'supervision'>('integrando');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Cálculos de Repasses e Custo de Supervisão</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Detalhamento de comissões para projetos, aluguel de consultório e planejamento de supervisão (Mês Selecionado: {selectedMonth || 'Ano Inteiro'})
          </p>
        </div>
      </div>

      {/* Sub-abas de Repasse */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setTransfersSubTab('integrando')}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: '600',
            background: transfersSubTab === 'integrando' ? 'var(--accent-primary)' : 'transparent',
            color: transfersSubTab === 'integrando' ? 'white' : 'var(--text-secondary)',
            transition: 'var(--transition-smooth)'
          }}
        >
          🤝 Repasse Integrando Ser (25%)
        </button>
        <button
          type="button"
          onClick={() => setTransfersSubTab('rent')}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: '600',
            background: transfersSubTab === 'rent' ? 'var(--accent-primary)' : 'transparent',
            color: transfersSubTab === 'rent' ? 'white' : 'var(--text-secondary)',
            transition: 'var(--transition-smooth)'
          }}
        >
          🏢 Repasse Consultório (Presencial)
        </button>
        <button
          type="button"
          onClick={() => setTransfersSubTab('supervision')}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: '600',
            background: transfersSubTab === 'supervision' ? 'var(--accent-primary)' : 'transparent',
            color: transfersSubTab === 'supervision' ? 'white' : 'var(--text-secondary)',
            transition: 'var(--transition-smooth)'
          }}
        >
          🧠 Planejamento de Supervisão (Particular)
        </button>
      </div>

      {/* CONTEÚDO SUB-ABA: INTEGRANDO SER (25%) */}
      {transfersSubTab === 'integrando' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <Card title="Repasse Total Integrando Ser">
              <div className="card-value" style={{ color: 'var(--accent-warning)' }}>{formatCurrency(integrandoTotalRepasse)}</div>
              <p className="card-subtitle">25% das sessões do mês selecionado</p>
            </Card>
            <Card title="Sessões Realizadas">
              <div className="card-value">{integrandoTotalSessions}</div>
              <p className="card-subtitle">Total de sessões acumuladas no mês</p>
            </Card>
            <Card title="Faturamento Bruto Integrando">
              <div className="card-value" style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>{formatCurrency(integrandoTotalGross)}</div>
              <p className="card-subtitle">Valor total recebido antes do repasse</p>
            </Card>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <Table
              columns={[
                { header: 'Paciente', accessor: (r: any) => r.name },
                { header: 'Sessões no Mês', accessor: (r: any) => `${r.sessionsCount} sessões`, align: 'center' },
                { header: 'Valor por Sessão', accessor: (r: any) => formatCurrency(r.rate), align: 'right' },
                { header: 'Faturamento Bruto', accessor: (r: any) => formatCurrency(r.gross), align: 'right' },
                {
                  header: 'Repasse Devido (25%)',
                  accessor: (r: any) => (
                    <strong style={{ color: 'var(--accent-warning)' }}>{formatCurrency(r.repasse)}</strong>
                  ),
                  align: 'right'
                }
              ]}
              data={integrandoRows}
              loading={false}
            />
          </div>
        </div>
      )}

      {/* CONTEÚDO SUB-ABA: REPASSE CONSULTÓRIO (PRESENCIAL) */}
      {transfersSubTab === 'rent' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <Card title="Custo de Aluguel a Repassar">
              <div className="card-value" style={{ color: 'var(--accent-danger)' }}>{formatCurrency(presencialTotalRent)}</div>
              <p className="card-subtitle">R$ 30,00 por sessão do período</p>
            </Card>
            <Card title="Sessões Presenciais">
              <div className="card-value">{presencialTotalSessions}</div>
              <p className="card-subtitle">Sessões em consultório físico no mês</p>
            </Card>
            <Card title="Receita Líquida (Consultório)">
              <div className="card-value" style={{ color: 'var(--accent-success)' }}>{formatCurrency(presencialTotalNet)}</div>
              <p className="card-subtitle">Ganhos descontado o aluguel de sala</p>
            </Card>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <Table
              columns={[
                { header: 'Paciente', accessor: (r: any) => r.name },
                { header: 'Sessões no Mês', accessor: (r: any) => `${r.sessionsCount} sessões`, align: 'center' },
                { header: 'Valor por Sessão (Bruto)', accessor: (r: any) => formatCurrency(r.rate), align: 'right' },
                { 
                  header: 'Valor Sessão Líquido (Sessão - R$30)', 
                  accessor: (r: any) => (
                    <strong style={{ color: 'var(--accent-success)' }}>{formatCurrency(r.netRate)}</strong>
                  ),
                  align: 'right' 
                },
                { header: 'Aluguel Devido (R$ 30 por Sessão)', accessor: (r: any) => formatCurrency(r.rent), align: 'right' },
                { 
                  header: 'Ganho Líquido Total', 
                  accessor: (r: any) => (
                    <strong style={{ color: 'var(--accent-success)' }}>{formatCurrency(r.netTotal)}</strong>
                  ), 
                  align: 'right' 
                }
              ]}
              data={presencialRows}
              loading={false}
            />
          </div>
        </div>
      )}

      {/* CONTEÚDO SUB-ABA: PLANEJAMENTO DE SUPERVISÃO */}
      {transfersSubTab === 'supervision' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          
          {/* Parâmetros e Meta de Supervisão */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>Custo de Supervisão Mensal</h3>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="filter-group" style={{ flex: '1 1 120px' }}>
                <label className="filter-label">Qtd. Supervisões / Mês</label>
                <input
                  type="number"
                  className="filter-input"
                  min="1"
                  value={numSupervisions}
                  onChange={(e) => setNumSupervisions(Number(e.target.value))}
                  style={{ width: '100%', minWidth: 'auto' }}
                />
              </div>
              <div className="filter-group" style={{ flex: '1 1 120px' }}>
                <label className="filter-label">Custo / Supervisão (R$)</label>
                <input
                  type="number"
                  className="filter-input"
                  min="0"
                  value={costPerSupervision}
                  onChange={(e) => setSessionCostPerSupervision(Number(e.target.value))}
                  style={{ width: '100%', minWidth: 'auto' }}
                />
              </div>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Meta Financeira de Custo</span>
              <strong style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}>{formatCurrency(supervisionTarget)} / mês</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                Meta para fazer {numSupervisions} supervisões clínicas de {formatCurrency(costPerSupervision)} cada.
              </p>
            </div>
          </div>

          {/* Planejamento de Rateio Recomendado */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>Planejamento de Reserva (Pacientes Particulares)</h3>
            
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <strong>Analisandos Particulares Ativos:</strong> {privateActivePatientsCount} analisandos
              </div>
              <div>
                <strong>Sessões Particulares Realizadas no Mês:</strong> {privateSessionsCount} sessões
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.05)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', display: 'block', fontWeight: 'bold' }}>Proposta por Sessão Executada</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Reservar {formatCurrency(suggestedSavePerSession)}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                    De cada sessão de paciente particular realizada neste mês para cobrir a meta de {formatCurrency(supervisionTarget)}.
                  </span>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-success)', textTransform: 'uppercase', display: 'block', fontWeight: 'bold' }}>Proposta Fixa por Paciente Ativo</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Reservar {formatCurrency(suggestedSavePerPatientMonthly)} / mês</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                    De cada um dos {privateActivePatientsCount} pacientes particulares neste mês. (Aproximadamente <strong>{formatCurrency(suggestedSavePerSessionAssumingFour)}</strong> por sessão individual, assumindo 4 sessões/mês).
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
