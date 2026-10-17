import React from 'react';
import type { Session, Patient } from '../../types';
import { Button } from '../ui/Button';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  sessionForm: Partial<Session>;
  setSessionForm: React.Dispatch<React.SetStateAction<Partial<Session>>>;
  patients: Patient[];
  isEditing: boolean;
  onPatientChange: (name: string) => void;
  isSaving?: boolean;
}

export function SessionModal({
  isOpen,
  onClose,
  onSubmit,
  sessionForm,
  setSessionForm,
  patients,
  isEditing,
  onPatientChange,
  isSaving = false
}: SessionModalProps) {
  if (!isOpen) return null;

  const activePatients = patients
    .filter(p => p.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={onSubmit} className="modal-content">
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: '700' }}>
          {isEditing ? 'Editar Registro de Atendimento' : 'Novo Atendimento'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="filter-group">
            <label className="filter-label">Analisando</label>
            {isEditing ? (
              <input type="text" className="filter-input" disabled value={sessionForm.patientName || ''} />
            ) : (
              <select
                className="filter-select"
                value={sessionForm.patientName || ''}
                onChange={(e) => onPatientChange(e.target.value)}
              >
                {activePatients.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="filter-group">
            <label className="filter-label">Data da Sessão</label>
            <input
              type="date"
              className="filter-input"
              required
              value={sessionForm.date || ''}
              onChange={(e) => setSessionForm(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Modalidade de Atendimento</label>
            <select
              className="filter-select"
              value={sessionForm.modality === 'presencial' || sessionForm.modality === 'online' ? sessionForm.modality : 'online'}
              onChange={(e) => setSessionForm(prev => ({ ...prev, modality: e.target.value }))}
            >
              <option value="online">Online</option>
              <option value="presencial">Presencial</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Tipo de Paciente</label>
            <select
              className="filter-select"
              value={sessionForm.patientType || 'particular'}
              onChange={(e) => setSessionForm(prev => ({ ...prev, patientType: e.target.value }))}
            >
              <option value="particular">Particular</option>
              <option value="social_clinic">Clínica Social</option>
              <option value="integrando_ser">Integrando Ser</option>
              <option value="training_student">Aluno em Formação</option>
              <option value="supervision">Supervisão</option>
              {sessionForm.patientType === 'zenklub' && <option value="zenklub">Zenklub</option>}
            </select>
          </div>

          <div className="responsive-modal-grid">
            <div className="filter-group">
              <label className="filter-label">Valor da Sessão (R$)</label>
              <input
                type="number"
                step="0.01"
                className="filter-input"
                required
                value={sessionForm.sessionValue !== undefined ? sessionForm.sessionValue : ''}
                onChange={(e) => setSessionForm(prev => ({ ...prev, sessionValue: Number(e.target.value) }))}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Status do Pagamento</label>
              <select
                className="filter-select"
                value={sessionForm.isPackage ? 'pacote' : (sessionForm.isPaid ? 'pago' : 'não_pago')}
                onChange={(e) => {
                  const val = e.target.value;
                  const isPkg = val === 'pacote';
                  setSessionForm(prev => ({
                    ...prev,
                    isPaid: val === 'pago',
                    isPackage: isPkg,
                    // Mantém packageTotalSessions se já tinha
                    packageTotalSessions: isPkg ? (prev.packageTotalSessions || 4) : prev.packageTotalSessions,
                    packageSessionIndex: isPkg ? (prev.packageSessionIndex || 1) : prev.packageSessionIndex
                  }));
                }}
              >
                <option value="não_pago">❌ Não Pago / Pendente</option>
                <option value="pago">✅ Pago</option>
                <option value="pacote">📦 Pacote (Pago)</option>
              </select>
            </div>
          </div>

          {/* Configuração de Pacote (disponível para marcar pacote com 2, 3 ou 4 sessões, mesmo antes de pagar) */}
          <div
            style={{
              background: (sessionForm.isPackage || (sessionForm.packageTotalSessions && sessionForm.packageTotalSessions > 0)) ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="checkbox"
                  checked={!!sessionForm.packageTotalSessions}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSessionForm(prev => ({
                      ...prev,
                      packageTotalSessions: checked ? 4 : undefined,
                      packageSessionIndex: checked ? 1 : undefined
                    }));
                  }}
                  style={{ cursor: 'pointer' }}
                />
                📦 Esta sessão faz parte de um Pacote
              </label>
              {sessionForm.packageTotalSessions && (
                <span style={{ fontSize: '0.72rem', color: '#a78bfa', fontWeight: 600 }}>
                  {sessionForm.isPackage ? 'Pago via Pacote' : 'Aguardando Pagamento'}
                </span>
              )}
            </div>

            {sessionForm.packageTotalSessions && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.75rem',
                  paddingTop: '0.4rem',
                  borderTop: '1px dashed rgba(139, 92, 246, 0.3)'
                }}
              >
                <div className="filter-group">
                  <label className="filter-label" style={{ color: '#a78bfa' }}>Total de Sessões do Pacote</label>
                  <select
                    className="filter-select"
                    value={sessionForm.packageTotalSessions || 4}
                    onChange={(e) => {
                      const total = Number(e.target.value);
                      setSessionForm(prev => ({
                        ...prev,
                        packageTotalSessions: total,
                        packageSessionIndex: Math.min(prev.packageSessionIndex || 1, total)
                      }));
                    }}
                  >
                    <option value={2}>2 Sessões</option>
                    <option value={3}>3 Sessões</option>
                    <option value={4}>4 Sessões</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label" style={{ color: '#a78bfa' }}>Número desta Sessão</label>
                  <select
                    className="filter-select"
                    value={sessionForm.packageSessionIndex || 1}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, packageSessionIndex: Number(e.target.value) }))}
                  >
                    {Array.from({ length: sessionForm.packageTotalSessions || 4 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        Sessão {num} de {sessionForm.packageTotalSessions || 4}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="filter-group">
            <label className="filter-label">Notas Adicionais de Cobrança (Opcional)</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Ex: cortesia, convênio..."
              value={sessionForm.paymentInfo || ''}
              onChange={(e) => setSessionForm(prev => ({ ...prev, paymentInfo: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Duração da Sessão (horas)</label>
            <input
              type="number"
              step="0.5"
              className="filter-input"
              required
              value={sessionForm.duration !== undefined ? sessionForm.duration : 1.0}
              onChange={(e) => setSessionForm(prev => ({ ...prev, duration: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" variant="success" disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Atendimento'}
          </Button>
        </div>
      </form>
    </div>
  );
}
