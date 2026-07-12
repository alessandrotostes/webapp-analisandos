
import { useState } from 'react';
import type { Patient, Session, RateReadjustment } from '../../types';
import { Button } from '../ui/Button';
import { Edit2 } from 'lucide-react';

interface PatientDashboardProps {
  hideValues?: boolean;
  selectedPatient: Patient;
  onBack: () => void;
  patientDashboardSessions: Session[];
  loadingDashboardSessions: boolean;
  handleQuickUpdatePatientStatus: (status: 'active' | 'paused' | 'ended') => void;
  generalPhoneText: string;
  setGeneralPhoneText: (txt: string) => void;
  generalEmailText: string;
  setGeneralEmailText: (txt: string) => void;
  generalDefaultRate: number;
  setGeneralDefaultRate: (rate: number) => void;
  generalNotesText: string;
  setGeneralNotesText: (txt: string) => void;
  handleSaveGeneralPatientDetails: () => void;
  savingNotes: boolean;
  handleOpenSessionModal: (session?: Session) => void;
  handleDeleteSession: (id: string) => void;
  formatCurrency: (val: number) => string;
  handleUpdatePatientReadjustments: (readjustments: RateReadjustment[]) => Promise<void>;
  handleToggleSessionPaymentStatus: (session: Session) => Promise<void>;
  handleToggleSessionCancellation: (session: Session) => Promise<void>;
  handleToggleSessionCharge: (session: Session) => Promise<void>;
  handleUpdateSessionValue: (sessionId: string, value: number) => Promise<void>;
  handleUpdateSessionNotes: (sessionId: string, notes: string) => Promise<void>;
  handleUpdateSessionDate: (sessionId: string, date: string) => Promise<void>;
  handleUpdateSessionModality: (sessionId: string, modality: string) => Promise<void>;
  handleUpdateSessionPatientType: (sessionId: string, patientType: string) => Promise<void>;
  generalOriginText: 'particular' | 'social_clinic' | 'zenklub' | 'integrando_ser' | 'training_student';
  setGeneralOriginText: (origin: 'particular' | 'social_clinic' | 'zenklub' | 'integrando_ser' | 'training_student') => void;
  showConfirm: (
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: {
      title?: string;
      confirmText?: string;
      cancelText?: string;
      isAlert?: boolean;
      onCancel?: () => void;
    }
  ) => void;
}

export function PatientDashboard({
  hideValues,
  selectedPatient,
  onBack,
  patientDashboardSessions,
  loadingDashboardSessions,
  handleQuickUpdatePatientStatus,
  generalPhoneText,
  setGeneralPhoneText,
  generalEmailText,
  setGeneralEmailText,
  generalDefaultRate,
  setGeneralDefaultRate,
  generalNotesText,
  setGeneralNotesText,
  handleSaveGeneralPatientDetails,
  savingNotes,
  handleOpenSessionModal,
  handleDeleteSession,
  formatCurrency,
  handleUpdatePatientReadjustments,
  handleToggleSessionPaymentStatus,
  handleToggleSessionCancellation,
  handleToggleSessionCharge,
  handleUpdateSessionValue,
  handleUpdateSessionNotes,
  handleUpdateSessionDate,
  handleUpdateSessionModality,
  handleUpdateSessionPatientType,
  generalOriginText,
  setGeneralOriginText,
  showConfirm
}: PatientDashboardProps) {
  const [newReadjustmentDate, setNewReadjustmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [newReadjustmentValue, setNewReadjustmentValue] = useState<number | string>('');
  const [editingSessionValueId, setEditingSessionValueId] = useState<string | null>(null);
  const [tempSessionValue, setTempSessionValue] = useState<string>('');
  const [editingSessionDateId, setEditingSessionDateId] = useState<string | null>(null);
  const [tempSessionDate, setTempSessionDate] = useState<string>('');
  const [editingSessionModalityId, setEditingSessionModalityId] = useState<string | null>(null);
  const [tempSessionModality, setTempSessionModality] = useState<string>('');
  const [editingSessionPatientTypeId, setEditingSessionPatientTypeId] = useState<string | null>(null);
  const [tempSessionPatientType, setTempSessionPatientType] = useState<string>('');
  const [expandedNotesSessionId, setExpandedNotesSessionId] = useState<string | null>(null);
  const [tempNotesText, setTempNotesText] = useState<string>('');

  const getTodayStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const todayStr = getTodayStr();

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

  const getUpcomingSessionsOfCurrentMonth = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const currentMonthPrefix = `${yyyy}-${mm}`;

    return patientDashboardSessions
      .filter(s => s.date.startsWith(currentMonthPrefix) && s.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const handleAddReadjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReadjustmentDate || !newReadjustmentValue) {
      showConfirm("Por favor, preencha a data e o valor do reajuste.", () => {}, { isAlert: true, title: 'Aviso' });
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
      showConfirm("Reajuste adicionado com sucesso!", () => {}, { isAlert: true, title: 'Sucesso' });
    } catch (err) {
      // erro tratado no pai
    }
  };

  const handleDeleteReadjustment = (id: string) => {
    showConfirm(
      "Deseja realmente excluir este registro de reajuste?",
      async () => {
        const updatedList = (selectedPatient.rateReadjustments || []).filter(r => r.id !== id);
        try {
          await handleUpdatePatientReadjustments(updatedList);
        } catch (err) {
          // erro tratado no pai
        }
      }
    );
  };

  const renderSessionList = (sessionsList: Session[]) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1, maxHeight: '480px', paddingRight: '0.25rem' }}>
        {sessionsList.map((s) => {
          return (
            <div
              key={s.id}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-main)',
                transition: 'var(--transition-smooth)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', alignItems: 'center' }}>
                {editingSessionDateId === s.id ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="date"
                      value={tempSessionDate}
                      onChange={(e) => setTempSessionDate(e.target.value)}
                      style={{
                        fontSize: '0.8rem',
                        padding: '0.1rem 0.25rem',
                        border: '1px solid var(--accent-primary)',
                        borderRadius: '4px',
                        background: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (s.id) {
                          await handleUpdateSessionDate(s.id, tempSessionDate);
                          setEditingSessionDateId(null);
                        }
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem' }}
                      title="Salvar"
                    >
                      ✔️
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSessionDateId(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem' }}
                      title="Cancelar"
                    >
                      ❌
                    </button>
                  </div>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{formatDate(s.date)}</strong>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (s.id) {
                          setEditingSessionDateId(s.id);
                          setTempSessionDate(s.date);
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        padding: '0.1rem',
                        opacity: 0.6,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                      title="Editar Data"
                    >
                      <Edit2 size={12} />
                    </button>
                  </span>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                  {editingSessionModalityId === s.id ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={tempSessionModality}
                        onChange={(e) => setTempSessionModality(e.target.value)}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.1rem 0.25rem',
                          border: '1px solid var(--accent-primary)',
                          borderRadius: '4px',
                          background: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                      >
                        <option value="online">Online</option>
                        <option value="presencial">Presencial</option>
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          if (s.id) {
                            await handleUpdateSessionModality(s.id, tempSessionModality);
                            setEditingSessionModalityId(null);
                          }
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem' }}
                        title="Salvar"
                      >
                        ✔️
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSessionModalityId(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem' }}
                        title="Cancelar"
                      >
                        ❌
                      </button>
                    </div>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                        {s.modality.replace('_', ' ')}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (s.id) {
                            setEditingSessionModalityId(s.id);
                            setTempSessionModality(s.modality === 'presencial' || s.modality === 'online' ? s.modality : 'online');
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          padding: '0.1rem',
                          opacity: 0.6,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                        title="Editar Formato"
                      >
                        <Edit2 size={10} />
                      </button>
                    </span>
                  )}

                  {editingSessionPatientTypeId === s.id ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={tempSessionPatientType}
                        onChange={(e) => setTempSessionPatientType(e.target.value)}
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.1rem 0.25rem',
                          border: '1px solid var(--accent-primary)',
                          borderRadius: '4px',
                          background: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                      >
                        <option value="particular">Particular</option>
                        <option value="social_clinic">Clínica Social</option>
                        <option value="training_student">Aluno</option>
                        <option value="integrando_ser">Integrando Ser</option>
                        <option value="zenklub">Zenklub</option>
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          if (s.id) {
                            await handleUpdateSessionPatientType(s.id, tempSessionPatientType);
                            setEditingSessionPatientTypeId(null);
                          }
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem' }}
                        title="Salvar"
                      >
                        ✔️
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSessionPatientTypeId(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem' }}
                        title="Cancelar"
                      >
                        ❌
                      </button>
                    </div>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                        {((s.patientType || (['particular', 'social_clinic', 'zenklub', 'integrando_ser', 'training_student'].includes(s.modality) ? s.modality : selectedPatient.origin)) || '').replace('_', ' ').replace('training student', 'Aluno').replace('social clinic', 'Clínica Social')}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (s.id) {
                            setEditingSessionPatientTypeId(s.id);
                            const curType = s.patientType || (['particular', 'social_clinic', 'zenklub', 'integrando_ser', 'training_student'].includes(s.modality) ? s.modality : selectedPatient.origin) || 'particular';
                            setTempSessionPatientType(curType);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          padding: '0.1rem',
                          opacity: 0.6,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                        title="Editar Tipo de Paciente"
                      >
                        <Edit2 size={10} />
                      </button>
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.duration.toFixed(1)}h de sessão</span>
                  {s.paymentInfo && isNaN(Number(s.paymentInfo.trim())) && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Obs: {s.paymentInfo}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (s.id) {
                        if (expandedNotesSessionId === s.id) {
                          setExpandedNotesSessionId(null);
                        } else {
                          setExpandedNotesSessionId(s.id);
                          setTempNotesText(s.notes || '');
                        }
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      color: s.notes ? 'var(--accent-success)' : 'var(--text-muted)',
                      fontWeight: s.notes ? '600' : 'normal',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                    title={s.notes ? `Evolução:\n${s.notes}\n\n(Clique para editar)` : "Clique para adicionar notas de evolução"}
                  >
                    {s.notes ? '📝 Com evolução' : '➕ Add Evolução'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSessionModal(s);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      transition: 'var(--transition-smooth)'
                    }}
                    title="Editar Atendimento Completo"
                  >
                    ✏️
                  </button>
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

              {/* Linha: Controles de Cancelamento, Cobrança e Pagamento */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                
                {/* Cancelar / Status da Sessão */}
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSessionCancellation(s);
                    }}
                    style={{
                      background: s.isCancelled ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${s.isCancelled ? 'var(--accent-danger)' : 'var(--border-color)'}`,
                      color: s.isCancelled ? 'var(--accent-danger)' : 'var(--text-secondary)',
                      padding: '0.2rem 0.4rem',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'var(--transition-smooth)'
                    }}
                    title="Clique para alternar entre Normal e Cancelada"
                  >
                    {s.isCancelled ? '❌ Cancelada' : '🗓️ Atendida'}
                  </button>

                  {/* Se cancelada, exibe opção de Cobrada / Não Cobrada */}
                  {s.isCancelled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSessionCharge(s);
                      }}
                      style={{
                        background: s.isCharged ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${s.isCharged ? '#f59e0b' : 'var(--border-color)'}`,
                        color: s.isCharged ? '#f59e0b' : 'var(--text-muted)',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                      title="Clique para alternar cobrança da sessão cancelada"
                    >
                      {s.isCharged ? '💰 Cobrada' : '💸 Não Cobrada'}
                    </button>
                  )}
                </div>

                {/* Valor e Pagamento */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    Valor:{' '}
                    {s.isCancelled && !s.isCharged ? (
                      <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(0)}</strong>
                    ) : editingSessionValueId === s.id ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          step="0.01"
                          value={tempSessionValue}
                          onChange={(e) => setTempSessionValue(e.target.value)}
                          style={{
                            width: '65px',
                            fontSize: '0.75rem',
                            padding: '0.1rem 0.25rem',
                            border: '1px solid var(--accent-primary)',
                            borderRadius: '4px',
                            background: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (s.id) {
                              await handleUpdateSessionValue(s.id, Number(tempSessionValue));
                              setEditingSessionValueId(null);
                            }
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem' }}
                          title="Salvar"
                        >
                          ✔️
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSessionValueId(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem' }}
                          title="Cancelar"
                        >
                          ❌
                        </button>
                      </div>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {formatCurrency(s.sessionValue !== undefined ? s.sessionValue : selectedPatient.defaultRate)}
                        </strong>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (s.id) {
                              setEditingSessionValueId(s.id);
                              setTempSessionValue((s.sessionValue !== undefined ? s.sessionValue : selectedPatient.defaultRate).toString());
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            padding: '0.1rem',
                            opacity: 0.6,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                          title="Editar Valor"
                        >
                          <Edit2 size={12} />
                        </button>
                      </span>
                    )}
                  </span>
                  
                  {/* Apenas exibe status de pagamento se for Atendida OR se for Cancelada + Cobrada */}
                  {(!s.isCancelled || s.isCharged) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSessionPaymentStatus(s);
                      }}
                      style={{
                        background: s.isPackage ? 'rgba(139, 92, 246, 0.12)' : (s.isPaid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'),
                        border: `1px solid ${s.isPackage ? '#8b5cf6' : (s.isPaid ? 'var(--accent-success)' : 'var(--accent-danger)')}`,
                        color: s.isPackage ? '#8b5cf6' : (s.isPaid ? 'var(--accent-success)' : 'var(--accent-danger)'),
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
                      title="Clique para alternar: Não Pago → Pago → Pacote"
                    >
                      {s.isPackage ? '📦 Pacote' : (s.isPaid ? '🟢 Pago' : '🔴 Não Pago')}
                    </button>
                  )}
                </div>
              </div>

              {/* Gaveta de Notas/Evolução expandida */}
              {expandedNotesSessionId === s.id && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                    Evolução Clínica / Anotações da Sessão
                  </label>
                  <textarea
                    value={tempNotesText}
                    onChange={(e) => setTempNotesText(e.target.value)}
                    placeholder="Digite aqui as observações ou evolução clínica deste atendimento..."
                    rows={3}
                    style={{
                      width: '100%',
                      fontSize: '0.8rem',
                      padding: '0.4rem 0.5rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <Button
                      variant="secondary"
                      onClick={() => setExpandedNotesSessionId(null)}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      Fechar
                    </Button>
                    <Button
                      variant="success"
                      onClick={async () => {
                        if (s.id) {
                          await handleUpdateSessionNotes(s.id, tempNotesText);
                          setExpandedNotesSessionId(null);
                        }
                      }}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      💾 Salvar Notas
                    </Button>
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>
    );
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
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Prontuário: {hideValues ? 'Analisando Oculto' : selectedPatient.name}</h2>
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
                ⏱️ <strong>Horas Feitas:</strong> {patientDashboardSessions.reduce((sum, s) => sum + ((s.isCancelled || s.date > todayStr) ? 0 : (s.duration || 1.0)), 0).toFixed(1)}h
              </span>
              <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                📅 <strong>Total de Sessões:</strong> {patientDashboardSessions.filter(s => !s.isCancelled && s.date <= todayStr).length}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
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
            renderSessionList(patientDashboardSessions)
          )}
        </div>

        {/* Card: Próximas Sessões do Mês Vigente */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>Próximas Sessões deste Mês</h3>
          
          {loadingDashboardSessions ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando sessões...</p>
          ) : (() => {
            const upcomingSessions = getUpcomingSessionsOfCurrentMonth();
            return upcomingSessions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>Nenhuma sessão agendada para o restante do mês vigente.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1, maxHeight: '480px', paddingRight: '0.25rem' }}>
                {upcomingSessions.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-main)',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{formatDate(s.date)}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                        {s.modality.replace('_', ' ')}
                      </span>
                    </div>
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
                          background: s.isPackage ? 'rgba(139, 92, 246, 0.12)' : (s.isPaid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'),
                          border: `1px solid ${s.isPackage ? '#8b5cf6' : (s.isPaid ? 'var(--accent-success)' : 'var(--accent-danger)')}`,
                          color: s.isPackage ? '#8b5cf6' : (s.isPaid ? 'var(--accent-success)' : 'var(--accent-danger)'),
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
                        title="Clique para alternar: Não Pago → Pago → Pacote"
                      >
                        {s.isPackage ? '📦 Pacote' : (s.isPaid ? '🟢 Pago' : '🔴 Não Pago')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Seção Inferior: Ficha Cadastral & Histórico de Reajustes (na parte de baixo da pagina) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '1.5rem' }}>
        
        {/* Card: Ficha do Analisando */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', minHeight: 'auto' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem', margin: 0 }}>Ficha do Analisando</h3>
          
          <div className="responsive-form-grid">
            <div className="filter-group">
              <label className="filter-label" style={{ fontSize: '0.7rem' }}>Telefone</label>
              <input
                type="text"
                className="filter-input"
                value={generalPhoneText}
                onChange={(e) => setGeneralPhoneText(e.target.value)}
                placeholder="Ex: (11) 99999-9999"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label" style={{ fontSize: '0.7rem' }}>Origem</label>
              <select
                className="filter-select"
                value={generalOriginText}
                onChange={(e) => setGeneralOriginText(e.target.value as any)}
                style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
              >
                <option value="particular">Particular</option>
                <option value="social_clinic">Clínica Social</option>
                <option value="zenklub">Zenklub</option>
                <option value="integrando_ser">Integrando Ser</option>
                <option value="training_student">Aluno em Formação</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label" style={{ fontSize: '0.7rem' }}>Valor da Sessão (R$)</label>
              <input
                type="number"
                step="0.01"
                className="filter-input"
                value={generalDefaultRate !== undefined ? generalDefaultRate : ''}
                onChange={(e) => setGeneralDefaultRate(Number(e.target.value))}
                placeholder="Ex: 82.00"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label" style={{ fontSize: '0.7rem' }}>E-mail</label>
              <input
                type="email"
                className="filter-input"
                value={generalEmailText}
                onChange={(e) => setGeneralEmailText(e.target.value)}
                placeholder="Ex: paciente@email.com"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <label className="filter-label" style={{ fontSize: '0.7rem' }}>Notas</label>
            <textarea
              className="filter-input"
              value={generalNotesText}
              onChange={(e) => setGeneralNotesText(e.target.value)}
              placeholder="Histórico do paciente, queixas principais..."
              rows={2}
              style={{ resize: 'vertical', minHeight: '60px', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
            />
          </div>

          <Button variant="primary" onClick={handleSaveGeneralPatientDetails} disabled={savingNotes} style={{ marginTop: '0.1rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
            {savingNotes ? 'Salvando...' : '💾 Salvar Ficha'}
          </Button>

          {selectedPatient.notes && (
            <div style={{
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.4',
              whiteSpace: 'pre-wrap',
              marginTop: '0.4rem',
              boxShadow: 'var(--shadow-glow)'
            }}>
              <strong style={{ display: 'block', marginBottom: '0.15rem', color: 'var(--accent-primary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Notas Salvas:
              </strong>
              {selectedPatient.notes}
            </div>
          )}
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
