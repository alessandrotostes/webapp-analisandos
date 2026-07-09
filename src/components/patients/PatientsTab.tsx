import { useState } from 'react';
import type { Patient } from '../../types';
import { Button } from '../ui/Button';

interface PatientsTabProps {
  patients: Patient[];
  loadingPatients: boolean;
  patientStatusFilterTab: 'active' | 'paused' | 'ended';
  setPatientStatusFilterTab: (tab: 'active' | 'paused' | 'ended') => void;
  onSelectPatient: (p: Patient) => void;
  onEditPatient: (p: Patient) => void;
  onDeletePatient: (id: string) => void;
  onAddPatient: () => void;
  formatCurrency: (val: number) => string;
}

export function PatientsTab({
  patients,
  loadingPatients,
  patientStatusFilterTab,
  setPatientStatusFilterTab,
  onSelectPatient,
  onEditPatient,
  onDeletePatient,
  onAddPatient,
  formatCurrency
}: PatientsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const displayedPatients = patients
    .filter(p => p.status === patientStatusFilterTab)
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Controle de Analisandos</h2>
        <Button variant="primary" onClick={onAddPatient}>
          + Adicionar Analisando
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Campo de Busca */}
        <input
          type="text"
          placeholder="Buscar analisando por nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            width: '100%',
            maxWidth: '400px',
            fontSize: '0.9rem'
          }}
        />

        {/* Sub-abas de Status */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '10px', width: 'fit-content', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setPatientStatusFilterTab('active')}
            style={{
              padding: '0.45rem 1.25rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              background: patientStatusFilterTab === 'active' ? 'var(--accent-primary)' : 'transparent',
              color: patientStatusFilterTab === 'active' ? 'white' : 'var(--text-secondary)',
              transition: 'var(--transition-smooth)'
            }}
          >
            🟢 Ativos ({patients.filter(p => p.status === 'active').length})
          </button>
          <button
            type="button"
            onClick={() => setPatientStatusFilterTab('paused')}
            style={{
              padding: '0.45rem 1.25rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              background: patientStatusFilterTab === 'paused' ? 'var(--accent-warning)' : 'transparent',
              color: patientStatusFilterTab === 'paused' ? 'white' : 'var(--text-secondary)',
              transition: 'var(--transition-smooth)'
            }}
          >
            🟡 Pausados ({patients.filter(p => p.status === 'paused').length})
          </button>
          <button
            type="button"
            onClick={() => setPatientStatusFilterTab('ended')}
            style={{
              padding: '0.45rem 1.25rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              background: patientStatusFilterTab === 'ended' ? 'var(--accent-danger)' : 'transparent',
              color: patientStatusFilterTab === 'ended' ? 'white' : 'var(--text-secondary)',
              transition: 'var(--transition-smooth)'
            }}
          >
            🔴 Encerrados ({patients.filter(p => p.status === 'ended').length})
          </button>
        </div>
      </div>

      {loadingPatients ? (
        <p style={{ color: 'var(--text-muted)' }}>Carregando dados dos analisandos...</p>
      ) : displayedPatients.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Nenhum analisando encontrado{searchQuery ? ` para "${searchQuery}"` : ''}.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '1.25rem' }}>
          {displayedPatients.map((p) => (
            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</h3>
                  <span className={`badge ${p.status === 'active' ? 'badge-paid' : p.status === 'paused' ? 'badge-pending' : 'badge-unpaid'}`}>
                    {p.status === 'active' ? 'Ativo' : p.status === 'paused' ? 'Pausado' : 'Encerrado'}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem', marginTop: '0.5rem' }}>
                  <div><strong>Origem:</strong> <span style={{ textTransform: 'uppercase' }}>{p.origin.replace('_', ' ')}</span></div>
                  <div><strong>Formato:</strong> <span style={{ textTransform: 'uppercase' }}>{p.format}</span></div>
                  <div><strong>Valor da Sessão:</strong> {formatCurrency(p.defaultRate)}</div>
                  {p.phone && <div><strong>Contato:</strong> {p.phone}</div>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <Button variant="primary" onClick={() => onSelectPatient(p)} style={{ flex: '1 1 100%', padding: '0.5rem', fontSize: '0.8rem' }}>
                  📁 Ver Prontuário
                </Button>
                <Button variant="secondary" onClick={() => onEditPatient(p)} style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => p.id && onDeletePatient(p.id)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
