
import { useState, useEffect } from 'react';
import type { Patient, Session, RateReadjustment, PatientSupervision } from '../../types';
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
  handleSavePatientFicha?: (fichaData: { name: string; initialRate: number; firstSessionDate: string; packageSize?: number }) => Promise<void>;
  savingNotes: boolean;
  handleOpenSessionModal: (session?: Session) => void;
  handleDeleteSession: (id: string) => void;
  formatCurrency: (val: number) => string;
  handleUpdatePatientReadjustments: (readjustments: RateReadjustment[]) => Promise<void>;
  handleUpdatePatientSupervisions?: (supervisions: PatientSupervision[]) => Promise<void>;
  handleToggleSessionPaymentStatus: (session: Session) => Promise<void>;
  handleToggleSessionCancellation: (session: Session) => Promise<void>;
  handleToggleSessionCharge: (session: Session) => Promise<void>;
  handleUpdateSessionValue: (sessionId: string, value: number) => Promise<void>;
  handleUpdateSessionNotes: (sessionId: string, notes: string) => Promise<void>;
  handleUpdateSessionDate: (sessionId: string, date: string) => Promise<void>;
  handleUpdateSessionModality: (sessionId: string, modality: string) => Promise<void>;
  handleUpdateSessionPatientType: (sessionId: string, patientType: string) => Promise<void>;
  generalOriginText: 'particular' | 'social_clinic' | 'zenklub' | 'integrando_ser' | 'training_student' | 'supervision';
  setGeneralOriginText: (origin: 'particular' | 'social_clinic' | 'zenklub' | 'integrando_ser' | 'training_student' | 'supervision') => void;
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
  handleSavePatientFicha,
  savingNotes,
  handleOpenSessionModal,
  handleDeleteSession,
  formatCurrency,
  handleUpdatePatientReadjustments,
  handleUpdatePatientSupervisions,
  handleToggleSessionPaymentStatus,
  handleToggleSessionCancellation,
  handleToggleSessionCharge,
  handleUpdateSessionValue,
  handleUpdateSessionNotes,
  handleUpdateSessionDate,
  handleUpdateSessionModality,
  handleUpdateSessionPatientType,
  showConfirm
}: PatientDashboardProps) {
  const [newReadjustmentDate, setNewReadjustmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [newReadjustmentValue, setNewReadjustmentValue] = useState<number | string>('');
  const [newSupervisionDate, setNewSupervisionDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSupervisionsModal, setShowSupervisionsModal] = useState(false);
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
  const [savingSessionNotes, setSavingSessionNotes] = useState(false);
  const [savingReadjustment, setSavingReadjustment] = useState(false);
  const [savingSupervision, setSavingSupervision] = useState(false);

  const [sessionFilter, setSessionFilter] = useState<'all' | 'notes' | 'cancelled'>('all');

  const earliestValidSession = [...patientDashboardSessions]
    .filter(s => s.date && (!s.isCancelled || s.isCharged))
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const autoFirstSessionDate = selectedPatient.firstSessionDate || earliestValidSession?.date || '';
  const autoInitialRate = selectedPatient.initialRate !== undefined
    ? selectedPatient.initialRate
    : (earliestValidSession?.sessionValue !== undefined && earliestValidSession.sessionValue > 0
      ? earliestValidSession.sessionValue
      : selectedPatient.defaultRate);

  const [fichaName, setFichaName] = useState(selectedPatient.name || '');
  const [fichaInitialRate, setFichaInitialRate] = useState<number>(autoInitialRate || 0);
  const [fichaFirstSessionDate, setFichaFirstSessionDate] = useState(autoFirstSessionDate);
  const [fichaPackageSize, setFichaPackageSize] = useState<number>(selectedPatient.packageSize || 4);

  useEffect(() => {
    setFichaName(selectedPatient.name || '');
    setFichaInitialRate(autoInitialRate || 0);
    setFichaFirstSessionDate(autoFirstSessionDate);
    setFichaPackageSize(selectedPatient.packageSize || 4);
  }, [selectedPatient.id, selectedPatient.name, selectedPatient.packageSize, autoInitialRate, autoFirstSessionDate]);

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

  const sortedSupervisions = [...(selectedPatient.supervisions || [])].sort(
    (a, b) => b.date.localeCompare(a.date)
  );
  const lastTwoSupervisions = sortedSupervisions.slice(0, 2);

  const handleAddSupervision = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newSupervisionDate || savingSupervision) {
      if (!newSupervisionDate) {
        showConfirm("Por favor, selecione a data da supervisão.", () => {}, { isAlert: true, title: 'Aviso' });
      }
      return;
    }

    setSavingSupervision(true);
    const newEntry: PatientSupervision = {
      id: Date.now().toString(),
      date: newSupervisionDate
    };

    const updatedList = [...(selectedPatient.supervisions || []), newEntry];

    try {
      await handleUpdatePatientSupervisions?.(updatedList);
      showConfirm("Supervisão adicionada com sucesso!", () => {}, { isAlert: true, title: 'Sucesso' });
    } catch {
      // erro tratado no pai
    } finally {
      setSavingSupervision(false);
    }
  };

  const handleDeleteSupervision = (id: string) => {
    showConfirm(
      "Deseja realmente excluir este registro de supervisão?",
      async () => {
        const updatedList = (selectedPatient.supervisions || []).filter(s => s.id !== id);
        try {
          await handleUpdatePatientSupervisions?.(updatedList);
        } catch {
          // erro tratado no pai
        }
      }
    );
  };

  const handleAddReadjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReadjustmentDate || !newReadjustmentValue || savingReadjustment) {
      if (!newReadjustmentDate || !newReadjustmentValue) {
        showConfirm("Por favor, preencha a data e o valor do reajuste.", () => {}, { isAlert: true, title: 'Aviso' });
      }
      return;
    }

    setSavingReadjustment(true);
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
    } catch {
      // erro tratado no pai
    } finally {
      setSavingReadjustment(false);
    }
  };

  const handleDeleteReadjustment = (id: string) => {
    showConfirm(
      "Deseja realmente excluir este registro de reajuste?",
      async () => {
        const updatedList = (selectedPatient.rateReadjustments || []).filter(r => r.id !== id);
        try {
          await handleUpdatePatientReadjustments(updatedList);
        } catch {
          // erro tratado no pai
        }
      }
    );
  };

  const renderSessionList = (sessionsList: Session[]) => {
    // Aplica o filtro de visualização do histórico
    const filteredSessions = sessionsList.filter((s) => {
      if (sessionFilter === 'notes') {
        const hasNotes = !!(s.notes && s.notes.trim());
        const hasPaymentText = !!(s.paymentInfo && isNaN(Number(s.paymentInfo.trim())) && s.paymentInfo.trim());
        return hasNotes || hasPaymentText;
      }
      if (sessionFilter === 'cancelled') {
        return !!s.isCancelled;
      }
      return true;
    });

    // Cálculo do ciclo de pacote:
    // Se a sessão já possui packageSessionIndex e packageTotalSessions gravados, usa esses valores.
    // Para sessões antigas que não possuem esses campos, calcula sequencialmente.
    const packageSize = selectedPatient.packageSize || 4;
    const sortedValidSessions = [...sessionsList]
      .filter(s => (!s.isCancelled || s.isCharged) && s.date)
      .sort((a, b) => a.date.localeCompare(b.date));

    let packageCounter = 0;
    const packageSessionInfoMap = new Map<string, { current: number; total: number; isLast: boolean }>();
    sortedValidSessions.forEach(s => {
      if (s.packageSessionIndex !== undefined && s.packageTotalSessions !== undefined) {
        const current = s.packageSessionIndex;
        const total = s.packageTotalSessions;
        if (s.id) {
          packageSessionInfoMap.set(s.id, { current, total, isLast: current === total });
        }
      } else if (s.isPackage) {
        const currentNum = (packageCounter % packageSize) + 1;
        packageCounter++;
        const isLast = currentNum === packageSize;
        if (s.id) {
          packageSessionInfoMap.set(s.id, { current: currentNum, total: packageSize, isLast });
        }
      }
    });

    if (filteredSessions.length === 0) {
      return (
        <div style={{ minHeight: '924px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontStyle: 'italic', gap: '0.5rem' }}>
          <span>Nenhuma sessão encontrada para o filtro selecionado.</span>
          <Button variant="secondary" onClick={() => setSessionFilter('all')} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
            Limpar filtro
          </Button>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1, height: '924px', minHeight: '924px', maxHeight: '924px', paddingRight: '0.25rem' }}>
        {filteredSessions.map((s) => {
          const pkgInfo = s.id ? packageSessionInfoMap.get(s.id) : null;
          return (
            <div
              key={s.id}
              style={{
                padding: '0.85rem 1rem',
                minHeight: '144px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
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
                          padding: '0.1rem 1.4rem 0.1rem 0.35rem',
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
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>{(s.modality || '').toLowerCase().includes('presencial') ? '🏢' : '🌐'}</span>
                        <span>{s.modality.replace('_', ' ')}</span>
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
                          padding: '0.1rem 1.4rem 0.1rem 0.35rem',
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
                        <option value="integrando_ser">Integrando Ser</option>
                        <option value="training_student">Aluno</option>
                        <option value="supervision">Supervisão</option>
                        {tempSessionPatientType === 'zenklub' && <option value="zenklub">Zenklub</option>}
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
                        {((s.patientType || (['particular', 'social_clinic', 'zenklub', 'integrando_ser', 'training_student', 'supervision'].includes(s.modality) ? s.modality : selectedPatient.origin)) || '').replace('_', ' ').replace('training student', 'Aluno').replace('social clinic', 'Clínica Social').replace('supervision', 'Supervisão')}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (s.id) {
                            setEditingSessionPatientTypeId(s.id);
                            const curType = s.patientType || (['particular', 'social_clinic', 'zenklub', 'integrando_ser', 'training_student', 'supervision'].includes(s.modality) ? s.modality : selectedPatient.origin) || 'particular';
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.duration.toFixed(1)}h de sessão</span>
                  {s.paymentInfo && isNaN(Number(s.paymentInfo.trim())) && (
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        fontWeight: 'bold',
                      }}
                    >
                      {s.paymentInfo}
                    </div>
                  )}
                  {s.notes && (
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        fontWeight: 'bold',
                      }}
                    >
                      {s.notes}
                    </div>
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
                      {s.isPackage ? (
                        pkgInfo ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span>📦 Pacote ({pkgInfo.current}/{pkgInfo.total})</span>
                          </span>
                        ) : '📦 Pacote'
                      ) : s.isPaid ? (
                        '🟢 Pago'
                      ) : (
                        pkgInfo ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span>🔴 Não Pago (Sessão {pkgInfo.current}/{pkgInfo.total})</span>
                          </span>
                        ) : (
                          '🔴 Não Pago'
                        )
                      )}
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
                      disabled={savingSessionNotes}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      Fechar
                    </Button>
                    <Button
                      variant="success"
                      onClick={async () => {
                        if (s.id && !savingSessionNotes) {
                          setSavingSessionNotes(true);
                          try {
                            await handleUpdateSessionNotes(s.id, tempNotesText);
                            setExpandedNotesSessionId(null);
                          } finally {
                            setSavingSessionNotes(false);
                          }
                        }
                      }}
                      disabled={savingSessionNotes}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      {savingSessionNotes ? 'Salvando...' : '💾 Salvar Notas'}
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
              Origem: <span style={{ textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{{
                particular: 'Particular',
                social_clinic: 'Clínica Social',
                integrando_ser: 'Integrando Ser',
                training_student: 'Aluno em Formação',
                supervision: 'Supervisão',
                zenklub: 'Zenklub'
              }[selectedPatient.origin] || selectedPatient.origin.replace('_', ' ')}</span>
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
            fontSize: '0.85rem',
            padding: '0.45rem 2.6rem 0.45rem 1rem',
            cursor: 'pointer',
            border: '1px solid var(--border-color)',
            outline: 'none',
            textAlign: 'center',
            fontWeight: '600',
            fontFamily: 'inherit',
            minWidth: '245px',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${selectedPatient.status === 'active' ? '%2310b981' : (selectedPatient.status === 'paused' ? '%23f59e0b' : '%23ef4444')}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'calc(100% - 1.15rem) center',
            backgroundSize: '1.05rem'
          }}
        >
          <option value="active" style={{ color: 'black' }}>🟢 Em Acompanhamento</option>
          <option value="paused" style={{ color: 'black' }}>🟡 Pausado</option>
          <option value="ended" style={{ color: 'black' }}>🔴 Encerrado</option>
        </select>
      </div>

      {/* Layout Principal em 2 Colunas: Esquerda (Histórico de sessões) | Direita (Sessões Pendentes/Pagas + Reajustes + Ficha) */}
      <div className="patient-dashboard-columns" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* COLUNA ESQUERDA: Histórico de Sessões */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Histórico de Sessões</h3>
            <Button variant="success" onClick={() => handleOpenSessionModal()} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
              + Registrar Sessão
            </Button>
          </div>

          {/* Filtros do Histórico: Todas | Com Anotações | Faltas / Canceladas */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '0.2rem' }}>Filtrar:</span>
            <button
              type="button"
              onClick={() => setSessionFilter('all')}
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.2rem 0.55rem',
                borderRadius: '999px',
                cursor: 'pointer',
                border: sessionFilter === 'all' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: sessionFilter === 'all' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: sessionFilter === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                transition: 'var(--transition-smooth)'
              }}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setSessionFilter('notes')}
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.2rem 0.55rem',
                borderRadius: '999px',
                cursor: 'pointer',
                border: sessionFilter === 'notes' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: sessionFilter === 'notes' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: sessionFilter === 'notes' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                transition: 'var(--transition-smooth)'
              }}
            >
              📝 Com Anotações
            </button>
            <button
              type="button"
              onClick={() => setSessionFilter('cancelled')}
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.2rem 0.55rem',
                borderRadius: '999px',
                cursor: 'pointer',
                border: sessionFilter === 'cancelled' ? '1px solid var(--accent-danger)' : '1px solid var(--border-color)',
                background: sessionFilter === 'cancelled' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                color: sessionFilter === 'cancelled' ? 'var(--accent-danger)' : 'var(--text-secondary)',
                transition: 'var(--transition-smooth)'
              }}
            >
              ⚠️ Faltas / Canceladas
            </button>
          </div>

          {loadingDashboardSessions ? (
            <div style={{ minHeight: '924px' }}>
              <p style={{ color: 'var(--text-muted)' }}>Carregando sessões...</p>
            </div>
          ) : patientDashboardSessions.length === 0 ? (
            <div style={{ minHeight: '924px' }}>
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>Nenhum atendimento registrado para este paciente.</p>
            </div>
          ) : (
            renderSessionList(patientDashboardSessions)
          )}
        </div>

        {/* COLUNA DIREITA: 1. Sessões Pendentes/Pagas até Hoje -> 2. Reajuste de Valor -> 3. Ficha do Analisando */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* 1. Card: Sessões Pendentes até Hoje (ou Pagas do Mês Atual se tudo estiver pago) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.15rem', minHeight: 'auto' }}>
            {(() => {
              const currentMonthPrefix = todayStr.slice(0, 7);
              const validUpToToday = patientDashboardSessions.filter(
                s => s.date && s.date <= todayStr && (!s.isCancelled || s.isCharged)
              );
              const pendingUpToToday = validUpToToday
                .filter(s => !s.isPaid && !s.isPackage)
                .sort((a, b) => a.date.localeCompare(b.date));

              const hasPending = pendingUpToToday.length > 0;
              const paidCurrentMonthUpToToday = validUpToToday
                .filter(s => s.date.startsWith(currentMonthPrefix) && (s.isPaid || s.isPackage))
                .sort((a, b) => b.date.localeCompare(a.date));

              const displayList = hasPending ? pendingUpToToday : paidCurrentMonthUpToToday;

              const packageSize = selectedPatient.packageSize || 4;
              const sortedValidSessions = [...patientDashboardSessions]
                .filter(s => (!s.isCancelled || s.isCharged) && s.date)
                .sort((a, b) => a.date.localeCompare(b.date));

              let packageCounter = 0;
              const packageSessionInfoMap = new Map<string, { current: number; total: number; isLast: boolean }>();
              sortedValidSessions.forEach(s => {
                if (s.packageSessionIndex !== undefined && s.packageTotalSessions !== undefined) {
                  const current = s.packageSessionIndex;
                  const total = s.packageTotalSessions;
                  if (s.id) {
                    packageSessionInfoMap.set(s.id, { current, total, isLast: current === total });
                  }
                } else if (s.isPackage) {
                  const currentNum = (packageCounter % packageSize) + 1;
                  packageCounter++;
                  const isLast = currentNum === packageSize;
                  if (s.id) {
                    packageSessionInfoMap.set(s.id, { current: currentNum, total: packageSize, isLast });
                  }
                }
              });

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>
                      {hasPending ? 'Sessões Pendentes (Até Hoje)' : 'Sessões Pagas no Mês (Até Hoje)'}
                    </h3>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '6px',
                      background: hasPending ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                      color: hasPending ? 'var(--accent-danger)' : 'var(--accent-success)',
                      border: `1px solid ${hasPending ? 'var(--accent-danger)' : 'var(--accent-success)'}`
                    }}>
                      {hasPending ? `${pendingUpToToday.length} pendente(s)` : 'Em dia'}
                    </span>
                  </div>

                  {loadingDashboardSessions ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Carregando sessões...</p>
                  ) : displayList.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem', padding: '0.5rem 0', margin: 0 }}>
                      Nenhuma sessão pendente ou paga registrada até a data atual neste mês.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '210px', paddingRight: '0.25rem' }}>
                      {displayList.map((s) => {
                        const pkgInfo = s.id ? packageSessionInfoMap.get(s.id) : null;
                        return (
                          <div
                            key={s.id}
                            style={{
                              padding: '0.65rem 0.85rem',
                              borderRadius: '10px',
                              border: `1px solid ${hasPending ? 'rgba(239, 68, 68, 0.35)' : 'var(--border-color)'}`,
                              background: 'var(--bg-main)',
                              transition: 'var(--transition-smooth)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '0.5rem',
                              flexWrap: 'wrap'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <strong style={{ fontSize: '0.85rem', color: hasPending ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                                {formatDate(s.date)}
                              </strong>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span>{(s.modality || '').toLowerCase().includes('presencial') ? '🏢' : '🌐'}</span>
                                <span>{s.modality.replace('_', ' ')}</span>
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(s.sessionValue !== undefined ? s.sessionValue : selectedPatient.defaultRate)}</strong>
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
                                  padding: '0.2rem 0.45rem',
                                  borderRadius: '6px',
                                  fontSize: '0.7rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  transition: 'var(--transition-smooth)'
                                }}
                                title="Clique para alternar: Não Pago → Pago → Pacote"
                              >
                                {s.isPackage ? (
                                  pkgInfo ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <span>📦 Pacote ({pkgInfo.current}/{pkgInfo.total})</span>
                                    </span>
                                  ) : '📦 Pacote'
                                ) : s.isPaid ? (
                                  '🟢 Pago'
                                ) : (
                                  pkgInfo ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <span>🔴 Não Pago (Sessão {pkgInfo.current}/{pkgInfo.total})</span>
                                    </span>
                                  ) : (
                                    '🔴 Não Pago'
                                  )
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* 2. Card Simplificado: Reajustes de Valor da Sessão */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.15rem', minHeight: 'auto' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.45rem', margin: 0 }}>
              Reajuste de Valor da Sessão
            </h3>

            {/* Formulário Simples para Adicionar Reajuste */}
            <form onSubmit={handleAddReadjustment} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="filter-group" style={{ flex: '1 1 130px' }}>
                <label className="filter-label">Data</label>
                <input
                  type="date"
                  className="filter-input"
                  value={newReadjustmentDate}
                  onChange={(e) => setNewReadjustmentDate(e.target.value)}
                  required
                />
              </div>
              <div className="filter-group" style={{ flex: '1 1 120px' }}>
                <label className="filter-label">Valor do Reajuste (R$)</label>
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
              <Button type="submit" variant="success" disabled={savingReadjustment} style={{ padding: '0.55rem 0.9rem' }}>
                {savingReadjustment ? 'Adicionando...' : '+ Adicionar'}
              </Button>
            </form>

            {/* Lista em Ordem Decrescente (Último reajuste primeiro, mais antigos abaixo) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '190px', paddingRight: '0.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
              {sortedReadjustments.length === 0 ? (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.35rem 0' }}>
                  Nenhum reajuste registrado.
                </span>
              ) : (
                sortedReadjustments.map((r, index) => (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: index === 0 ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: index === 0 ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-color)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>
                        📅 {formatDate(r.date)}
                      </span>
                      <strong style={{ color: index === 0 ? 'var(--accent-primary)' : 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {formatCurrency(r.value)}
                      </strong>
                      {index === 0 && (
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-primary)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>
                          Último
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteReadjustment(r.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-danger)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        padding: '0.15rem',
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

          {/* 3. Card Simplificado: Ficha do Analisando */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.15rem', minHeight: 'auto' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.45rem', margin: 0 }}>
              Ficha do Analisando
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="filter-group">
                <label className="filter-label">Nome Completo</label>
                <input
                  type="text"
                  className="filter-input"
                  value={fichaName}
                  onChange={(e) => setFichaName(e.target.value)}
                  placeholder="Nome completo do analisando"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                <div className="filter-group">
                  <label className="filter-label">Valor da Sessão Inicial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="filter-input"
                    value={fichaInitialRate !== undefined ? fichaInitialRate : ''}
                    onChange={(e) => setFichaInitialRate(Number(e.target.value))}
                    placeholder="Ex: 150.00"
                  />
                </div>

                <div className="filter-group">
                  <label className="filter-label">Primeira Sessão do Paciente</label>
                  <input
                    type="date"
                    className="filter-input"
                    value={fichaFirstSessionDate}
                    onChange={(e) => setFichaFirstSessionDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => handleSavePatientFicha?.({
                name: fichaName,
                initialRate: fichaInitialRate,
                firstSessionDate: fichaFirstSessionDate,
                packageSize: fichaPackageSize
              })}
              disabled={savingNotes}
              style={{ marginTop: '0.15rem' }}
            >
              {savingNotes ? 'Salvando...' : '💾 Salvar Ficha'}
            </Button>
          </div>

          {/* 4. Card: Supervisão (Exibe apenas as 2 últimas; clique abre todas) */}
          <div
            className="card"
            onClick={() => setShowSupervisionsModal(true)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              padding: '1.15rem',
              minHeight: 'auto',
              cursor: 'pointer'
            }}
            title="Clique no card para ver todas as supervisões deste analisando"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.45rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>
                Supervisão
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: '600' }}>
                Ver todas ({sortedSupervisions.length})
              </span>
            </div>

            <form
              onSubmit={handleAddSupervision}
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end', flexWrap: 'wrap' }}
            >
              <div className="filter-group" style={{ flex: '1 1 160px' }}>
                <label className="filter-label">Data da Última Supervisão</label>
                <input
                  type="date"
                  className="filter-input"
                  value={newSupervisionDate}
                  onChange={(e) => setNewSupervisionDate(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="success" disabled={savingSupervision} style={{ padding: '0.55rem 0.9rem' }}>
                {savingSupervision ? 'Adicionando...' : '+ Adicionar'}
              </Button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
              {lastTwoSupervisions.length === 0 ? (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.25rem 0' }}>
                  Nenhuma supervisão registrada.
                </span>
              ) : (
                lastTwoSupervisions.map((sup, index) => (
                  <div
                    key={sup.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: index === 0 ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: index === 0 ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-color)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <strong style={{ color: index === 0 ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                        📅 {formatDate(sup.date)}
                      </strong>
                      {index === 0 && (
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-primary)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>
                          Última
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSupervision(sup.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-danger)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        padding: '0.15rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px'
                      }}
                      title="Excluir Supervisão"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
              {sortedSupervisions.length > 2 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textAlign: 'center', marginTop: '0.2rem', fontWeight: '600' }}>
                  Clique para ver todas as {sortedSupervisions.length} supervisões →
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal com Todas as Supervisões do Analisando */}
      {showSupervisionsModal && (
        <div className="modal-overlay" onClick={() => setShowSupervisionsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>
                Histórico de Supervisões - {hideValues ? 'Analisando Oculto' : selectedPatient.name}
              </h3>
              <button
                onClick={() => setShowSupervisionsModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {sortedSupervisions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
                Nenhuma supervisão registrada para este analisando.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '360px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {sortedSupervisions.map((sup, index) => (
                  <div
                    key={sup.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: index === 0 ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: index === 0 ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-color)',
                      fontSize: '0.9rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <strong style={{ color: index === 0 ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                        📅 {formatDate(sup.date)}
                      </strong>
                      {index === 0 && (
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-primary)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>
                          Última
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSupervision(sup.id)}
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
                        borderRadius: '4px'
                      }}
                      title="Excluir Supervisão"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <Button variant="secondary" onClick={() => setShowSupervisionsModal(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
