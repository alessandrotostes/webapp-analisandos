import React from 'react';
import type { Invoice, Patient } from '../../types';
import { Button } from '../ui/Button';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  invoiceForm: Partial<Invoice>;
  setInvoiceForm: React.Dispatch<React.SetStateAction<Partial<Invoice>>>;
  patients: Patient[];
  isEditing: boolean;
}

export function InvoiceModal({
  isOpen,
  onClose,
  onSubmit,
  invoiceForm,
  setInvoiceForm,
  patients,
  isEditing
}: InvoiceModalProps) {
  if (!isOpen) return null;

  const defaultYear = new Date().getFullYear();
  const defaultMonth = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ][new Date().getMonth()];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={onSubmit} className="modal-content">
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: '700' }}>
          {isEditing ? 'Editar Fatura' : 'Lançar Nova Fatura'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="filter-group">
            <label className="filter-label">Analisando</label>
            <select
              className="filter-select"
              value={invoiceForm.patientName || ''}
              onChange={(e) => {
                const matched = patients.find(p => p.name === e.target.value);
                setInvoiceForm(prev => ({
                  ...prev,
                  patientName: e.target.value,
                  value: matched ? matched.defaultRate * 4 : 600,
                  pendingValue: matched ? matched.defaultRate * 4 : 600
                }));
              }}
            >
              {patients.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="filter-group">
              <label className="filter-label">Ano Referência</label>
              <input
                type="number"
                className="filter-input"
                required
                value={invoiceForm.year || defaultYear}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, year: Number(e.target.value) }))}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Mês Referência</label>
              <select
                className="filter-select"
                value={invoiceForm.month || defaultMonth}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, month: e.target.value }))}
              >
                <option value="JANEIRO">Janeiro</option>
                <option value="FEVEREIRO">Fevereiro</option>
                <option value="MARÇO">Março</option>
                <option value="ABRIL">Abril</option>
                <option value="MAIO">Maio</option>
                <option value="JUNHO">Junho</option>
                <option value="JULHO">Julho</option>
                <option value="AGOSTO">Agosto</option>
                <option value="SETEMBRO">Setembro</option>
                <option value="OUTUBRO">Outubro</option>
                <option value="NOVEMBRO">Novembro</option>
                <option value="DEZEMBRO">Dezembro</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="filter-group">
              <label className="filter-label">Nº Fatura</label>
              <input
                type="number"
                className="filter-input"
                required
                value={invoiceForm.invoiceNumber || ''}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoiceNumber: Number(e.target.value) }))}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Data Limite de Vencimento</label>
              <input
                type="date"
                className="filter-input"
                value={invoiceForm.date || ''}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="filter-group">
              <label className="filter-label">Valor Cobrado (R$)</label>
              <input
                type="number"
                className="filter-input"
                required
                value={invoiceForm.value !== undefined ? invoiceForm.value : ''}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, value: Number(e.target.value) }))}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Valor Recebido (R$)</label>
              <input
                type="number"
                className="filter-input"
                required
                value={invoiceForm.paidValue !== undefined ? invoiceForm.paidValue : ''}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, paidValue: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Notas / Lançamentos Extras</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Ex: reajuste de valor, desconto aplicado"
              value={invoiceForm.notes || ''}
              onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary">
            Salvar Lançamento
          </Button>
        </div>
      </form>
    </div>
  );
}
