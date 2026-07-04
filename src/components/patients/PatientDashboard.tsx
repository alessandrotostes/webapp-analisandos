
import { useState } from 'react';
import type { Patient, Session, RateReadjustment } from '../../types';
import { Button } from '../ui/Button';

interface PatientDashboardProps {
  selectedPatient: Patient;
  onBack: () => void;
  patientDashboardSessions: Session[];
  loadingDashboardSessions: boolean;
  handleQuickUpdatePatientStatus: (status: 'active' | 'paused' | 'ended') => void;
  generalPhoneText: string;
  setGeneralPhoneText: (txt: string) => void;
  generalEmailText: string;
  setGeneralEmailText: (txt: string) => void;
  generalNotesText: string;
  setGeneralNotesText: (txt: string) => void;
  handleSaveGeneralPatientDetails: () => void;
  savingNotes: boolean;
  selectedSessionForNotes: Session | null;
  setSelectedSessionForNotes: (s: Session | null) => void;
  sessionNotesText: string;
  setSessionNotesText: (txt: string) => void;
  handleSaveSessionNotes: () => void;
  handleOpenSessionModal: (session?: Session) => void;
  handleDeleteSession: (id: string) => void;
  formatCurrency: (val: number) => string;
  handleUpdatePatientReadjustments: (readjustments: RateReadjustment[]) => Promise<void>;
  handleToggleSessionPaymentStatus: (session: Session) => Promise<void>;
}

export function PatientDashboard({
  selectedPatient,
  onBack,
  patientDashboardSessions,
  loadingDashboardSessions,
  handleQuickUpdatePatientStatus,
  generalPhoneText,
  setGeneralPhoneText,
  generalEmailText,
  setGeneralEmailText,
  generalNotesText,
  setGeneralNotesText,
  handleSaveGeneralPatientDetails,
  savingNotes,
  selectedSessionForNotes,
  setSelectedSessionForNotes,
  sessionNotesText,
  setSessionNotesText,
  handleSaveSessionNotes,
  handleOpenSessionModal,
  handleDeleteSession,
  formatCurrency,
  handleUpdatePatientReadjustments,
  handleToggleSessionPaymentStatus
}: PatientDashboardProps) {
  const [newReadjustmentDate, setNewReadjustmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [newReadjustmentValue, setNewReadjustmentValue] = useState<number | string>('');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const sortedReadjustments = [...(selectedPatient.rateReadjustments || [])].sort(
    (a, b) => b.date.localeCompare(a.date)
  );
  const lastReadjustment = sortedReadjustments[0] || null;

  const handleAddReadjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReadjustmentDate || !newReadjustmentValue) {
      alert("Por favor, preencha a data e o valor do reajuste.");
      return;
    }

    const newReadjustment: RateReadjustment = {
      id: Date.now().toString(),
      date: newReadjustmentDate,
      value: Number(newReadjustmentValue)
    };

    const updatedList = [...(selectedPatient.rateReadjustments || []), newReadjustment];

    try {
      await handleUpdatePatientReadjustments(updatedList);
      setNewReadjustmentValue('');
      alert("Reajuste adicionado com sucesso!");
    } catch (err) {
      // erro tratado no pai
    }
  };

  const handleDeleteReadjustment = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este registro de reajuste?")) return;
    const updatedList = (selectedPatient.rateReadjustments || []).filter(r => r.id !== id);
    try {
      await handleUpdatePatientReadjustments(updatedList);
    } catch (err) {
      // erro tratado no pai
    }
  };

  return (
    <div>
      {/* Header do Prontuário */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={onBack}>
            ← Voltar para Lista
          </Button>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Prontuário: {selectedPatient.name}</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
              Origem: <span style={{ textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{selectedPatient.origin.replace('_', ' ')}</span>
              {' • '} Formato: <span style={{ textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{selectedPatient.format}</span>
              {' • '} Valor Padrão: <span style={{ color: 'var(--accent-success)', fontWeight: 'bold' }}>{formatCurrency(selectedPatient.defaultRate)}</span>
              {lastReadjustment && (
                <>
                  {' • '} Último Reajuste: <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{formatCurrency(lastReadjustment.value)}</span> em {formatDate(lastReadjustment.date)}
                </>
              )}
            </span>
            
            {/* Indicadores de Horas e Sessões Acumuladas */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                ⏱️ <strong>Horas Feitas:</strong> {patientDashboardSessions.reduce((sum, s) => sum + (s.duration || 1.0), 0).toFixed(1)}h
              </span>
              <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                📅 <strong>Total de Sessões:</strong> {patientDashboardSessions.length}
              </span>
            </div>
          </div>
        </div>
        <select
          className={`badge ${selectedPatient.status === 'active' ? 'badge-paid' : 'badge-pending'}`}
          value={selectedPatient.status}
          onChange={(e) => handleQuickUpdatePatientStatus(e.target.value as any)}
          style={{
            fontSize: '0.9rem',
            padding: '0.4rem 2rem 0.4rem 1rem',
            cursor: 'pointer',
            border: '1px solid var(--border-color)',
            outline: 'none',
            textAlign: 'center',
            fontWeight: '600',
            fontFamily: 'inherit'
          }}
        >
          <option value="active" style={{ color: 'black' }}>🟢 Em Acompanhamento</option>
          <option value="paused" style={{ color: 'black' }}>🟡 Pausado</option>
          <option value="ended" style={{ color: 'black' }}>🔴 Encerrado</option>
        </select>
      </div>

      {/* Seção Superior: Histórico de Sessões & Evolução do Atendimento (O mais importante primeiro) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Card: Histórico de Sessões */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Histórico de Sessões</h3>
            <Button variant="success" onClick={() => handleOpenSessionModal()} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
              + Registrar Sessão
            </Button>
          </div>

          {loadingDashboardSessions ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando sessões...</p>
          ) : patientDashboardSessions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>Nenhum atendimento registrado para este paciente.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1, maxHeight: '480px', paddingRight: '0.25rem' }}>
              {patientDashboardSessions.map((s) => {
                const isSelected = selectedSessionForNotes?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedSessionForNotes(s);
                      setSessionNotesText(s.notes || '');
                    }}
                    style={{
                      cursor: 'pointer',
                      padding: '1rem',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(56, 189, 248, 0.05)' : 'var(--bg-main)',
                      boxShadow: isSelected ? 'var(--shadow-glow)' : 'none',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <strong style={{ fontSize: '0.9rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{s.date}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>{s.modality.replace('_', ' ')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.duration.toFixed(1)}h de sessão</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {s.notes ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-success)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: '500' }}>
                            📝 Com evolução
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sem anotações</span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (s.id) handleDeleteSession(s.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-danger)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            padding: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            transition: 'var(--transition-smooth)'
                          }}
                          title="Excluir Sessão"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Linha adicionada: valor cobrado e status de pagamento (manual e clicável) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Valor: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(s.sessionValue !== undefined ? s.sessionValue : selectedPatient.defaultRate)}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSessionPaymentStatus(s);
                        }}
                        style={{
                          background: s.isPaid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          border: `1px solid ${s.isPaid ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
                          color: s.isPaid ? 'var(--accent-success)' : 'var(--accent-danger)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          transition: 'var(--transition-smooth)'
                        }}
                        title="Clique para alternar o status de pagamento"
                      >
                        {s.isPaid ? '🟢 Pago' : '🔴 Não Pago'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card: Evolução do Atendimento */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>Evolução do Atendimento</h3>
          
          {selectedSessionForNotes ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <div style={{ background: 'var(--bg-main)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Atendimento Selecionado</span>
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{selectedSessionForNotes.date}</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                  Modalidade: <span style={{ textTransform: 'uppercase' }}>{selectedSessionForNotes.modality.replace('_', ' ')}</span> | Valor: {formatCurrency(selectedSessionForNotes.sessionValue !== undefined ? selectedSessionForNotes.sessionValue : selectedPatient.defaultRate)} | Pagamento: <strong style={{ color: selectedSessionForNotes.isPaid ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{selectedSessionForNotes.isPaid ? 'Pago' : 'Não Pago'}</strong>
                </span>
              </div>

              <div className="filter-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label className="filter-label">Notas Clínicas (Evolução Contínua)</label>
                <textarea
                  className="filter-input"
                  value={sessionNotesText}
                  onChange={(e) => setSessionNotesText(e.target.value)}
                  placeholder="Anote aqui a evolução clínica do analisando nesta sessão específica, temas trazidos, manifestações inconscientes observadas, sonhos relatados, etc..."
                  rows={15}
                  style={{ resize: 'none', flex: 1, minHeight: '300px', fontSize: '0.9rem', lineHeight: '1.6' }}
                />
              </div>

              <Button variant="success" onClick={handleSaveSessionNotes} disabled={savingNotes} style={{ width: '100%' }}>
                {savingNotes ? 'Salvando...' : '💾 Salvar Evolução da Sessão'}
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: '300px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '2rem' }}>
              <div>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>📝</span>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', margin: 0 }}>Nenhum Atendimento Selecionado</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Selecione um atendimento no histórico ao lado para visualizar ou escrever as notas de evolução clínica correspondentes.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Seção Inferior: Ficha Cadastral & Histórico de Reajustes (na parte de baixo da pagina) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Card: Ficha do Analisando */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>Ficha do Analisando</h3>
          
          <div className="filter-group">
            <label className="filter-label">Telefone de Contato</label>
            <input
              type="text"
              className="filter-input"
              value={generalPhoneText}
              onChange={(e) => setGeneralPhoneText(e.target.value)}
              placeholder="Ex: (11) 99999-9999"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">E-mail</label>
            <input
              type="email"
              className="filter-input"
              value={generalEmailText}
              onChange={(e) => setGeneralEmailText(e.target.value)}
              placeholder="Ex: paciente@email.com"
            />
          </div>

          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <label className="filter-label">Histórico Clínico / Anamnese / Notas Gerais</label>
            <textarea
              className="filter-input"
              value={generalNotesText}
              onChange={(e) => setGeneralNotesText(e.target.value)}
              placeholder="Histórico do paciente, queixas principais, objetivos analíticos..."
              rows={10}
              style={{ resize: 'vertical', minHeight: '200px', flex: 1 }}
            />
          </div>

          <Button variant="primary" onClick={handleSaveGeneralPatientDetails} disabled={savingNotes} style={{ marginTop: '0.5rem' }}>
            {savingNotes ? 'Salvando...' : '💾 Salvar Ficha Clínico-Cadastral'}
          </Button>
        </div>

        {/* Card: Histórico de Reajustes de Valor */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>
            Reajustes de Valor da Sessão
          </h3>

          {/* Destaque do Último Reajuste */}
          {lastReadjustment ? (
            <div style={{
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid var(--accent-primary)',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center',
              boxShadow: 'var(--shadow-glow)'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem', fontWeight: '600' }}>
                Último Reajuste (Destaque)
              </span>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--accent-primary)' }}>
                {formatCurrency(lastReadjustment.value)}
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                em {formatDate(lastReadjustment.date)}
              </span>
            </div>
          ) : (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed var(--border-color)',
              borderRadius: '12px',
              padding: '1.25rem 1rem',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Nenhum reajuste cadastrado manualmente ainda.
              </span>
            </div>
          )}

          {/* Formulário para Adicionar Reajuste */}
          <form onSubmit={handleAddReadjustment} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Registrar Novo Reajuste</strong>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="filter-group" style={{ flex: '1 1 120px' }}>
                <label className="filter-label">Data do Reajuste</label>
                <input
                  type="date"
                  className="filter-input"
                  value={newReadjustmentDate}
                  onChange={(e) => setNewReadjustmentDate(e.target.value)}
                  required
                />
              </div>
              <div className="filter-group" style={{ flex: '1 1 120px' }}>
                <label className="filter-label">Novo Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className="filter-input"
                  value={newReadjustmentValue}
                  onChange={(e) => setNewReadjustmentValue(e.target.value)}
                  placeholder="Ex: 180"
                  required
                />
              </div>
            </div>
            <Button type="submit" variant="success" style={{ width: '100%', marginTop: '0.25rem' }}>
              ➕ Adicionar ao Histórico
            </Button>
          </form>

          {/* Lista Histórica de Reajustes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <strong style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Histórico Completo</strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '180px', paddingRight: '0.25rem' }}>
              {sortedReadjustments.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                  Nenhum reajuste no histórico.
                </span>
              ) : (
                sortedReadjustments.map(r => (
                  <div key={r.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem'
                  }}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(r.value)}</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({formatDate(r.date)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteReadjustment(r.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-danger)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: '0.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        transition: 'var(--transition-smooth)'
                      }}
                      title="Excluir Reajuste"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
