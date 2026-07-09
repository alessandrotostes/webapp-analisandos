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
}

export function SessionModal({
  isOpen,
  onClose,
  onSubmit,
  sessionForm,
  setSessionForm,
  patients,
  isEditing,
  onPatientChange
}: SessionModalProps) {
  if (!isOpen) return null;

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
                {patients.map(p => (
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
              <option value="training_student">Aluno</option>
              <option value="integrando_ser">Integrando Ser</option>
              <option value="zenklub">Zenklub</option>
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
                  setSessionForm(prev => ({
                    ...prev,
                    isPaid: val === 'pago',
                    isPackage: val === 'pacote'
                  }));
                }}
              >
                <option value="não_pago">❌ Não Pago / Pendente</option>
                <option value="pago">✅ Pago</option>
                <option value="pacote">📦 Pacote</option>
              </select>
            </div>
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
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="success">
            Salvar Atendimento
          </Button>
        </div>
      </form>
    </div>
  );
}
