import React from 'react';
import type { Patient } from '../../types';
import { Button } from '../ui/Button';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  patientForm: Partial<Patient>;
  setPatientForm: React.Dispatch<React.SetStateAction<Partial<Patient>>>;
  isEditing: boolean;
}

export function PatientModal({
  isOpen,
  onClose,
  onSubmit,
  patientForm,
  setPatientForm,
  isEditing
}: PatientModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={onSubmit} className="modal-content">
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: '700' }}>
          {isEditing ? 'Editar Analisando' : 'Novo Analisando'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="filter-group">
            <label className="filter-label">Nome Completo</label>
            <input
              type="text"
              className="filter-input"
              required
              value={patientForm.name || ''}
              onChange={(e) => setPatientForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Origem do Analisando</label>
            <select
              className="filter-select"
              value={patientForm.origin || 'particular'}
              onChange={(e) => setPatientForm(prev => ({ ...prev, origin: e.target.value as any }))}
            >
              <option value="particular">Particular</option>
              <option value="social_clinic">Clínica Social</option>
              <option value="zenklub">Zenklub</option>
              <option value="integrando_ser">Integrando Ser</option>
              <option value="training_student">Aluno em Formação</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Formato de Atendimento</label>
            <select
              className="filter-select"
              value={patientForm.format || 'presencial'}
              onChange={(e) => setPatientForm(prev => ({ ...prev, format: e.target.value as any }))}
            >
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Valor Padrão por Sessão (R$)</label>
            <input
              type="number"
              className="filter-input"
              required
              value={patientForm.defaultRate !== undefined ? patientForm.defaultRate : ''}
              onChange={(e) => setPatientForm(prev => ({ ...prev, defaultRate: Number(e.target.value) }))}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              className="filter-select"
              value={patientForm.status || 'active'}
              onChange={(e) => setPatientForm(prev => ({ ...prev, status: e.target.value as any }))}
            >
              <option value="active">Ativo</option>
              <option value="paused">Pausado</option>
              <option value="ended">Encerrado</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Telefone (opcional)</label>
            <input
              type="text"
              className="filter-input"
              value={patientForm.phone || ''}
              onChange={(e) => setPatientForm(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Notas Adicionais</label>
            <textarea
              className="filter-input"
              rows={3}
              value={patientForm.notes || ''}
              onChange={(e) => setPatientForm(prev => ({ ...prev, notes: e.target.value }))}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary">
            Salvar Analisando
          </Button>
        </div>
      </form>
    </div>
  );
}
