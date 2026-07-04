import React from 'react';
import type { Session } from '../../types';
import { Button } from '../ui/Button';
import { Table } from '../ui/Table';

interface SessionsTabProps {
  selectedMonth: string;
  googleAccessToken: string | null;
  handleSyncFromGoogleCalendar: () => void;
  syncingGoogleCalendar: boolean;
  handleOpenSessionModal: (session?: Session) => void;
  sessionFilters: { patientName: string; modality: string };
  setSessionFilters: React.Dispatch<React.SetStateAction<{ patientName: string; modality: string }>>;
  sessions: Session[];
  loadingSessions: boolean;
  handleDeleteSession: (id: string) => void;
  hasMoreSessions: boolean;
  loadSessionsData: (loadMore: boolean, lastDoc: any) => void;
  lastSessionDoc: any;
}

export function SessionsTab({
  selectedMonth,
  googleAccessToken,
  handleSyncFromGoogleCalendar,
  syncingGoogleCalendar,
  handleOpenSessionModal,
  sessionFilters,
  setSessionFilters,
  sessions,
  loadingSessions,
  handleDeleteSession,
  hasMoreSessions,
  loadSessionsData,
  lastSessionDoc
}: SessionsTabProps) {
  // Filtra as sessões localmente de forma fluida/parcial por nome
  const filteredSessions = sessionFilters.patientName.trim()
    ? sessions.filter(s =>
        s.patientName.toLowerCase().includes(sessionFilters.patientName.toLowerCase())
      )
    : sessions;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Agenda de Atendimentos</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Histórico completo e agendamentos (Período: {selectedMonth || 'Ano Inteiro'})</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {googleAccessToken && (
            <Button variant="primary" onClick={handleSyncFromGoogleCalendar} disabled={syncingGoogleCalendar}>
              {syncingGoogleCalendar ? 'Sincronizando...' : '🔄 Sincronizar Google Agenda'}
            </Button>
          )}
          <Button variant="success" onClick={() => handleOpenSessionModal()}>
            + Registrar Atendimento
          </Button>
        </div>
      </div>

      {/* Filtros da Agenda */}
      <section className="filters-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="filter-group" style={{ flex: '1 1 200px' }}>
          <label className="filter-label">Paciente</label>
          <input
            type="text"
            className="filter-input"
            placeholder="Nome do analisando..."
            value={sessionFilters.patientName}
            onChange={(e) => setSessionFilters(prev => ({ ...prev, patientName: e.target.value }))}
            style={{ width: '100%' }}
          />
        </div>
        <div className="filter-group" style={{ flex: '1 1 200px' }}>
          <label className="filter-label">Modalidade</label>
          <select
            className="filter-select"
            value={sessionFilters.modality}
            onChange={(e) => setSessionFilters(prev => ({ ...prev, modality: e.target.value }))}
            style={{ width: '100%' }}
          >
            <option value="">Todas</option>
            <option value="particular">Particular</option>
            <option value="social_clinic">Clínica Social</option>
            <option value="zenklub">Zenklub</option>
            <option value="integrando_ser">Integrando Ser</option>
          </select>
        </div>
      </section>

      <div className="card" style={{ padding: 0 }}>
        <Table
          columns={[
            { header: 'Data', accessor: (s: Session) => s.date },
            { header: 'Paciente', accessor: (s: Session) => s.patientName },
            { header: 'Modalidade', accessor: (s: Session) => <span style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>{s.modality.replace('_', ' ')}</span> },
            { header: 'Info Pagamento / Valor', accessor: (s: Session) => s.paymentInfo || '---' },
            { header: 'Duração (h)', accessor: (s: Session) => `${s.duration.toFixed(1)}h`, align: 'center' },
            {
              header: 'Ações',
              accessor: (s: Session) => (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button variant="secondary" onClick={() => handleOpenSessionModal(s)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                    Editar
                  </Button>
                  <Button variant="danger" onClick={() => s.id && handleDeleteSession(s.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                    Excluir
                  </Button>
                </div>
              ),
              align: 'center'
            }
          ]}
          data={filteredSessions}
          loading={loadingSessions}
        />

        {hasMoreSessions && sessions.length > 0 && (
          <div className="pagination-area" style={{ paddingBottom: '1.5rem' }}>
            <Button variant="primary" onClick={() => loadSessionsData(true, lastSessionDoc)} disabled={loadingSessions}>
              {loadingSessions ? 'Carregando...' : 'Ver Atendimentos Mais Antigos'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
