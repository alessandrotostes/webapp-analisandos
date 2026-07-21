import { useState, useEffect, useCallback } from 'react';
import {
  getPatients,
  addPatient,
  updatePatient,
  deletePatient,
  updatePatientNameInRelatedDocs,
  getInvoices,
  addInvoice,
  updateInvoice,
  deleteInvoice,
  getSessions,
  addSession,
  updateSession,
  deleteSession,
  getUpcomingSessions
} from './services/firebase/firestoreService';
import { Button } from './components/ui/Button';
import type { Invoice, Session, Patient, RateReadjustment } from './types';
import { LayoutDashboard, Users, Banknote, Landmark, Plus, Eye, EyeOff, LogOut } from 'lucide-react';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from './config/firebase-config';
import { enviarTransacaoParaGastos } from './services/integrationService';

// Importações dos Componentes Refatorados (Modulares e Responsivos)
import { PatientModal } from './components/modals/PatientModal';
import { SessionModal } from './components/modals/SessionModal';
import { InvoiceModal } from './components/modals/InvoiceModal';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { PatientsTab } from './components/patients/PatientsTab';
import { PatientDashboard } from './components/patients/PatientDashboard';
import { InvoicesTab } from './components/invoices/InvoicesTab';
import { TransfersTab } from './components/transfers/TransfersTab';
import { ConfirmModal } from './components/ui/ConfirmModal';



export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'sessions' | 'invoices' | 'transfers'>(() => {
    return (localStorage.getItem('active_tab') as any) || 'dashboard';
  });

  const [hideValues, setHideValues] = useState<boolean>(() => {
    return localStorage.getItem('hide_values') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('hide_values', String(hideValues));
  }, [hideValues]);

  const formatCurrency = (val: number) => {
    if (hideValues) {
      return 'R$ ••••';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  useEffect(() => {
    localStorage.setItem('active_tab', activeTab);
  }, [activeTab]);

  // States de Autenticação e Google Agenda
  const [user, setUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(localStorage.getItem('google_access_token'));
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Monitoramento de estado de login
  useEffect(() => {
    // Garante a persistência no PWA/Mobile
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      if (usr && usr.email !== 'tauanapavanelli@gmail.com') {
        signOut(auth);
        setUser(null);
        localStorage.removeItem('google_access_token');
        setGoogleAccessToken(null);
        setCheckingAuth(false);
        return;
      }
      
      setUser(usr);
      setCheckingAuth(false);
      if (!usr) {
        localStorage.removeItem('google_access_token');
        setGoogleAccessToken(null);
      }
    });
    return unsubscribe;
  }, []);

  const handleLoginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');

    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, provider);
      
      if (result.user.email !== 'tauanapavanelli@gmail.com') {
        await signOut(auth);
        setErrorMsg("Acesso negado. Usuário não autorizado.");
        return;
      }

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        localStorage.setItem('google_access_token', token);
        setGoogleAccessToken(token);
      }
    } catch (err: any) {
      setErrorMsg("Erro ao fazer login com o Google: " + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('google_access_token');
      setGoogleAccessToken(null);
      showConfirm(
        "Logout efetuado com sucesso.",
        () => {},
        { isAlert: true, title: 'Logout' }
      );
    } catch (err: any) {
      setErrorMsg("Erro ao efetuar logout: " + err.message);
    }
  };

  // ==========================================
  // GOOGLE CALENDAR — SYNC OUTGOING (Webapp → Google)
  // ==========================================

  /** Cria um evento no Google Calendar e retorna o eventId para vínculo */
  const createGoogleCalendarEvent = async (session: Omit<Session, 'id'> | Session): Promise<string | null> => {
    if (!googleAccessToken) return null;

    try {
      const defaultTime = "14:00:00";
      const startDateTime = `${session.date}T${defaultTime}`;
      const durationHours = session.duration || 1.0;

      const startMs = new Date(startDateTime).getTime();
      const endMs = startMs + durationHours * 60 * 60 * 1000;
      const endDateTime = new Date(endMs).toISOString().replace(/\.\d+Z$/, "");

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: `Sessão: ${session.patientName}`,
          description: `Atendimento registrado via Analisandos Core.\nModalidade: ${session.modality?.toUpperCase() || 'N/A'}\nStatus de pagamento: ${session.paymentInfo || 'Registrado'}`,
          start: { dateTime: startDateTime, timeZone: 'America/Sao_Paulo' },
          end: { dateTime: endDateTime, timeZone: 'America/Sao_Paulo' }
        })
      });

      if (response.ok) {
        const eventData = await response.json();
        console.log("Evento criado no Google Agenda:", eventData.id);
        return eventData.id as string;
      } else {
        if (response.status === 401) {
          setErrorMsg("Sua conexão com o Google Agenda expirou. Faça login novamente.");
          localStorage.removeItem('google_access_token');
          setGoogleAccessToken(null);
        }
        return null;
      }
    } catch (err) {
      console.error("Erro ao criar evento no Google Agenda:", err);
      return null;
    }
  };

  /** Atualiza um evento existente no Google Calendar (data, duração, nome) */
  const updateGoogleCalendarEvent = async (eventId: string, session: Partial<Session>): Promise<boolean> => {
    if (!googleAccessToken || !eventId) return false;

    try {
      const patchBody: any = {};

      if (session.patientName) {
        patchBody.summary = `Sessão: ${session.patientName}`;
      }

      if (session.date) {
        const defaultTime = "14:00:00";
        const startDateTime = `${session.date}T${defaultTime}`;
        const durationHours = session.duration || 1.0;
        const startMs = new Date(startDateTime).getTime();
        const endMs = startMs + durationHours * 60 * 60 * 1000;
        const endDateTime = new Date(endMs).toISOString().replace(/\.\d+Z$/, "");

        patchBody.start = { dateTime: startDateTime, timeZone: 'America/Sao_Paulo' };
        patchBody.end = { dateTime: endDateTime, timeZone: 'America/Sao_Paulo' };
      }

      if (session.modality || session.paymentInfo) {
        patchBody.description = `Atendimento registrado via Analisandos Core.\nModalidade: ${(session.modality || '').toUpperCase()}\nStatus de pagamento: ${session.paymentInfo || 'Registrado'}`;
      }

      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patchBody)
      });

      if (response.ok) {
        console.log("Evento atualizado no Google Agenda:", eventId);
        return true;
      } else {
        if (response.status === 401) {
          setErrorMsg("Sua conexão com o Google Agenda expirou. Faça login novamente.");
          localStorage.removeItem('google_access_token');
          setGoogleAccessToken(null);
        }
        return false;
      }
    } catch (err) {
      console.error("Erro ao atualizar evento no Google Agenda:", err);
      return false;
    }
  };

  /** Remove um evento do Google Calendar */
  const deleteGoogleCalendarEvent = async (eventId: string): Promise<boolean> => {
    if (!googleAccessToken || !eventId) return false;

    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`
        }
      });

      if (response.ok || response.status === 204) {
        console.log("Evento removido do Google Agenda:", eventId);
        return true;
      } else {
        if (response.status === 401) {
          setErrorMsg("Sua conexão com o Google Agenda expirou. Faça login novamente.");
          localStorage.removeItem('google_access_token');
          setGoogleAccessToken(null);
        }
        return false;
      }
    } catch (err) {
      console.error("Erro ao remover evento do Google Agenda:", err);
      return false;
    }
  };

  // States de Dados
  const [patients, setPatients] = useState<Patient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);

  // Loading & Errors
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingUpcomingSessions, setLoadingUpcomingSessions] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Custom Confirmation / Alert Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isAlert?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirm = useCallback((
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: {
      title?: string;
      confirmText?: string;
      cancelText?: string;
      isAlert?: boolean;
      onCancel?: () => void;
    }
  ) => {
    setConfirmModal({
      isOpen: true,
      title: options?.title || (options?.isAlert ? 'Aviso' : 'Confirmação'),
      message,
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      isAlert: options?.isAlert,
      onConfirm: async () => {
        await onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        if (options?.onCancel) options.onCancel();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, []);

  // Pagination for Invoices/Sessions
  const [invoicePageSize] = useState(15);
  const [lastInvoiceDoc, setLastInvoiceDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreInvoices, setHasMoreInvoices] = useState(true);

        // Obter data atual do sistema para inicialização dinâmica
  const initDate = new Date();
  const currentYear = initDate.getFullYear();
  const currentMonthName = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ][initDate.getMonth()];

  // Filtros
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthName);
  const [invoiceFilters, setInvoiceFilters] = useState({ patientName: '' });
  
  // Modais de Criação / Edição
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientForm, setPatientForm] = useState<Omit<Patient, 'id'>>({
    name: '',
    origin: 'particular',
    format: 'online',
    defaultRate: 150,
    status: 'active',
    phone: '',
    email: '',
    notes: ''
  });

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionForm, setSessionForm] = useState<Omit<Session, 'id'>>({
    patientName: '',
    date: new Date().toISOString().split('T')[0],
    paymentInfo: '',
    duration: 1.0,
    modality: 'online',
    patientType: 'particular',
    sessionValue: 150,
    isPaid: false,
    isPackage: false
  });

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<Omit<Invoice, 'id'>>({
    year: currentYear,
    month: currentMonthName,
    invoiceNumber: 1,
    date: new Date().toISOString().split('T')[0],
    patientName: '',
    value: 150,
    paidValue: 0,
    pendingValue: 150,
    notes: ''
  });

  // States do Prontuário / Dashboard do Paciente
  const [selectedPatientForDashboard, setSelectedPatientForDashboard] = useState<Patient | null>(() => {
    const saved = localStorage.getItem('selected_patient_dashboard');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    if (selectedPatientForDashboard) {
      localStorage.setItem('selected_patient_dashboard', JSON.stringify(selectedPatientForDashboard));
    } else {
      localStorage.removeItem('selected_patient_dashboard');
    }
  }, [selectedPatientForDashboard]);
  const [patientDashboardSessions, setPatientDashboardSessions] = useState<Session[]>([]);
  const [loadingDashboardSessions, setLoadingDashboardSessions] = useState(false);
  const [generalNotesText, setGeneralNotesText] = useState('');
  const [generalPhoneText, setGeneralPhoneText] = useState('');
  const [generalEmailText, setGeneralEmailText] = useState('');
  const [generalOriginText, setGeneralOriginText] = useState<'particular' | 'social_clinic' | 'zenklub' | 'integrando_ser' | 'training_student'>('particular');
  const [generalDefaultRate, setGeneralDefaultRate] = useState<number>(0);
  const [savingNotes, setSavingNotes] = useState(false);

  // States para Repasses & Supervisão e Abas de Pacientes
  const [patientStatusFilterTab, setPatientStatusFilterTab] = useState<'active' | 'paused' | 'ended'>('active');

  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [numSupervisions, setNumSupervisions] = useState(2);
  const [costPerSupervision, setCostPerSupervision] = useState(180);

  const loadAllSessionsForSelectedMonth = useCallback(async () => {
    setLoadingSessions(true);
    try {
      // Busca todas as sessões para filtro local (limite de 2000)
      const result = await getSessions({
        pageSize: 2000
      });

      setAllSessions(result.data);

      const invoicesResult = await getInvoices({
        year: selectedYear,
        pageSize: 2000
      });
      setAllInvoices(invoicesResult.data);
    } catch (err: any) {
      console.error("Erro ao carregar dados globais (sessões e faturas):", err);
    } finally {
      setLoadingSessions(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (user) {
      loadAllSessionsForSelectedMonth();
    }
  }, [user, loadAllSessionsForSelectedMonth]);

  const loadPatientDashboardSessions = useCallback(async (patientName: string) => {
    setLoadingDashboardSessions(true);
    try {
      const result = await getSessions({
        patientName,
        pageSize: 100
      });
      setPatientDashboardSessions(result.data);
    } catch (err: any) {
      setErrorMsg("Erro ao buscar histórico de sessões do prontuário: " + err.message);
    } finally {
      setLoadingDashboardSessions(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPatientForDashboard) {
      loadPatientDashboardSessions(selectedPatientForDashboard.name);
      setGeneralNotesText(selectedPatientForDashboard.notes || '');
      setGeneralPhoneText(selectedPatientForDashboard.phone || '');
      setGeneralEmailText(selectedPatientForDashboard.email || '');
      setGeneralOriginText(selectedPatientForDashboard.origin || 'particular');
      setGeneralDefaultRate(selectedPatientForDashboard.defaultRate || 0);
    } else {
      setPatientDashboardSessions([]);
    }
  }, [selectedPatientForDashboard, loadPatientDashboardSessions]);



  const handleSaveGeneralPatientDetails = async () => {
    if (!selectedPatientForDashboard?.id) return;
    setSavingNotes(true);
    try {
      const updates = {
        notes: generalNotesText,
        phone: generalPhoneText,
        email: generalEmailText,
        origin: generalOriginText,
        defaultRate: generalDefaultRate
      };
      await updatePatient(selectedPatientForDashboard.id, updates);
      setSelectedPatientForDashboard(prev => prev ? { ...prev, ...updates } : null);
      loadPatientsData();
      showConfirm(
        "Ficha do analisando atualizada com sucesso!",
        () => {},
        { isAlert: true, title: 'Sucesso' }
      );
    } catch (err: any) {
      setErrorMsg("Erro ao atualizar ficha do analisando: " + err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleQuickUpdatePatientStatus = async (status: 'active' | 'paused' | 'ended') => {
    if (!selectedPatientForDashboard?.id) return;
    try {
      await updatePatient(selectedPatientForDashboard.id, { status });
      setSelectedPatientForDashboard(prev => prev ? { ...prev, status } : null);
      loadPatientsData();
    } catch (err: any) {
      setErrorMsg("Erro ao atualizar status do analisando: " + err.message);
    }
  };

  const handleUpdatePatientReadjustments = async (readjustments: RateReadjustment[]) => {
    if (!selectedPatientForDashboard?.id) return;
    try {
      await updatePatient(selectedPatientForDashboard.id, { rateReadjustments: readjustments });
      setSelectedPatientForDashboard(prev => prev ? { ...prev, rateReadjustments: readjustments } : null);
      loadPatientsData();
    } catch (err: any) {
      setErrorMsg("Erro ao atualizar histórico de reajustes: " + err.message);
      throw err;
    }
  };

  // ==========================================
  // FUNÇÕES DE DISPARO DE DADOS
  // ==========================================

  const loadUpcomingSessionsData = useCallback(async () => {
    setLoadingUpcomingSessions(true);
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const future = new Date();
      future.setDate(today.getDate() + 7);
      const fYear = future.getFullYear();
      const fMonth = String(future.getMonth() + 1).padStart(2, '0');
      const fDay = String(future.getDate()).padStart(2, '0');
      const futureStr = `${fYear}-${fMonth}-${fDay}`;

      const data = await getUpcomingSessions(todayStr, futureStr);
      setUpcomingSessions(data);
    } catch (err: any) {
      console.error("Erro ao carregar próximas sessões:", err);
    } finally {
      setLoadingUpcomingSessions(false);
    }
  }, []);

  const loadPatientsData = useCallback(async () => {
    setLoadingPatients(true);
    try {
      const data = await getPatients();
      setPatients(data);
    } catch (err: any) {
      setErrorMsg("Erro ao buscar analisandos: " + err.message);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  const loadInvoicesData = useCallback(async (isLoadMore = false, startAfterDoc?: QueryDocumentSnapshot<DocumentData> | null) => {
    setLoadingInvoices(true);
    const limitSize = selectedMonth ? 100 : invoicePageSize;
    try {
      const searchName = invoiceFilters.patientName.trim();
      let patientQuery: string | string[] | undefined = undefined;

      if (searchName) {
        // Encontra pacientes correspondentes localmente
        const matchingNames = patients
          .filter(p => p.name.toLowerCase().includes(searchName.toLowerCase()))
          .map(p => p.name);
        patientQuery = matchingNames;
      }

      const result = await getInvoices({
        year: selectedYear,
        month: selectedMonth || undefined,
        patientName: patientQuery,
        pageSize: searchName ? 500 : limitSize,
        lastVisible: isLoadMore ? (startAfterDoc || undefined) : undefined
      });

      if (isLoadMore) {
        setInvoices((prev) => [...prev, ...result.data]);
      } else {
        setInvoices(result.data);
      }

      setLastInvoiceDoc(result.lastDoc);
      setHasMoreInvoices(searchName ? false : result.data.length === limitSize);
    } catch (err: any) {
      setErrorMsg("Erro ao buscar faturas: " + err.message);
    } finally {
      setLoadingInvoices(false);
    }
  }, [selectedYear, selectedMonth, invoiceFilters.patientName, patients, invoicePageSize]);

  
  // Inicializa dados
  useEffect(() => {
    if (user) {
      loadPatientsData();
      loadUpcomingSessionsData();
    }
  }, [user, loadPatientsData, loadUpcomingSessionsData]);

  // Recarrega dados com alterações nos filtros
  useEffect(() => {
    if (user) {
      loadInvoicesData(false, null);
    }
  }, [user, selectedYear, selectedMonth, invoiceFilters.patientName, loadInvoicesData]);



  // ==========================================
  // OPERAÇÕES CRUD - PATIENTS (ANALISANDOS)
  // ==========================================

  const handleOpenPatientModal = (patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
      setPatientForm({
        name: patient.name,
        origin: patient.origin,
        format: patient.format,
        defaultRate: patient.defaultRate,
        status: patient.status,
        phone: patient.phone || '',
        email: patient.email || '',
        notes: patient.notes || ''
      });
    } else {
      setEditingPatient(null);
      setPatientForm({
        name: '',
        origin: 'particular',
        format: 'online',
        defaultRate: 150,
        status: 'active',
        phone: '',
        email: '',
        notes: ''
      });
    }
    setShowPatientModal(true);
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientForm.name) return;

    try {
      if (editingPatient?.id) {
        // Bug fix: se o nome mudou, propagar para sessões e faturas
        const oldName = editingPatient.name;
        const newName = patientForm.name;
        if (oldName !== newName) {
          await updatePatientNameInRelatedDocs(oldName, newName);
        }
        await updatePatient(editingPatient.id, patientForm);
        // Atualiza também o selectedPatientForDashboard se era o paciente editado
        if (selectedPatientForDashboard?.id === editingPatient.id) {
          setSelectedPatientForDashboard(prev => prev ? { ...prev, ...patientForm, id: prev.id } : null);
        }
      } else {
        await addPatient(patientForm as Patient);
      }
      setShowPatientModal(false);
      // Bug fix: recarregar todos os dados dependentes (faturas, sessões) para atualizar dashboard e aba Faturamento
      loadPatientsData();
      loadInvoicesData(false, null);
      loadAllSessionsForSelectedMonth();
    } catch (err: any) {
      setErrorMsg("Erro ao salvar analisando: " + err.message);
    }
  };

  const handleDeletePatient = (id: string) => {
    showConfirm(
      "Deseja realmente excluir este analisando? Todos os atendimentos futuros precisarão ser gerenciados manualmente.",
      async () => {
        try {
          await deletePatient(id);
          loadPatientsData();
        } catch (err: any) {
          setErrorMsg("Erro ao excluir analisando: " + err.message);
        }
      }
    );
  };

  // ==========================================
  // OPERAÇÕES CRUD - SESSIONS (SESSÕES)
  // ==========================================

  const handleOpenSessionModal = (session?: Session) => {
    if (session) {
      setEditingSession(session);
      const matchedPatient = patients.find(p => p.name === session.patientName);
      setSessionForm({
        patientName: session.patientName,
        date: session.date,
        paymentInfo: session.paymentInfo || '',
        duration: session.duration,
        modality: (session.modality === 'presencial' || session.modality === 'online') ? session.modality : (matchedPatient?.format || 'online'),
        patientType: session.patientType || (['particular', 'social_clinic', 'zenklub', 'integrando_ser', 'training_student'].includes(session.modality) ? session.modality : (matchedPatient?.origin || 'particular')),
        sessionValue: session.sessionValue !== undefined ? session.sessionValue : 0,
        isPaid: session.isPaid !== undefined ? session.isPaid : false,
        isPackage: session.isPackage !== undefined ? session.isPackage : false
      });
    } else {
      const firstPat = selectedPatientForDashboard || patients[0];
      setEditingSession(null);
      setSessionForm({
        patientName: firstPat?.name || '',
        date: new Date().toISOString().split('T')[0],
        paymentInfo: '',
        duration: 1.0,
        modality: firstPat?.format || 'online',
        patientType: firstPat?.origin || 'particular',
        sessionValue: firstPat?.defaultRate || 150,
        isPaid: false,
        isPackage: false
      });
    }
    setShowSessionModal(true);
  };

  // Autopreenchimento de modalidade e valor padrão baseado no paciente escolhido
  const handleSessionPatientChange = (name: string) => {
    const matched = patients.find(p => p.name === name);
    setSessionForm(prev => ({
      ...prev,
      patientName: name,
      modality: matched ? matched.format : 'online',
      patientType: matched ? matched.origin : 'particular',
      sessionValue: matched ? matched.defaultRate : 150
    }));
  };

  const syncInvoiceWithSessions = async (patientName: string, dateStr: string) => {
    try {
      if (!patientName || !dateStr) return;
      const [sessionYearStr, sessionMonthStr] = dateStr.split('-');
      const sessionYear = Number(sessionYearStr);
      const sessionMonthNum = Number(sessionMonthStr);
      const monthNames = [
        '', 'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
        'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
      ];
      const sessionMonthName = monthNames[sessionMonthNum] || '';

      if (!sessionMonthName) return;

      const invoiceResult = await getInvoices({
        year: sessionYear,
        month: sessionMonthName,
        patientName,
        pageSize: 100
      });

      if (invoiceResult.data.length > 0) {
        const sessionsResult = await getSessions({
          patientName,
          pageSize: 1000
        });

        const monthPrefix = `${sessionYearStr}-${sessionMonthStr}`;
        const sessionsOfMonth = sessionsResult.data.filter(s =>
          s.date.startsWith(monthPrefix) && (!s.isCancelled || s.isCharged)
        );

        const totalPaidFromSessions = sessionsOfMonth
          .filter(s => s.isPaid === true)
          .reduce((sum, s) => {
            const patient = patients.find(p => p.name === s.patientName);
            const rate = patient ? patient.defaultRate : 150;
            const value = s.sessionValue !== undefined ? s.sessionValue : rate;
            return sum + value;
          }, 0);

        for (const inv of invoiceResult.data) {
          if (inv.id) {
            const newPaidValue = Math.min(totalPaidFromSessions, inv.value);
            await updateInvoice(inv.id, {
              paidValue: newPaidValue,
              pendingValue: Math.max(0, inv.value - newPaidValue)
            });
          }
        }
      }
    } catch (err) {
      console.error("Erro ao sincronizar fatura com sessões:", err);
    }
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionForm.patientName) return;

    try {
      if (editingSession?.id) {
        const oldSession = allSessions.find(s => s.id === editingSession.id) || editingSession;
        // EDIÇÃO: atualiza no Firestore e sincroniza com Google Calendar
        await updateSession(editingSession.id, sessionForm as Session);

        // Se a sessão tem um eventId vinculado, atualiza o evento no Google
        if (googleAccessToken && editingSession.googleEventId) {
          await updateGoogleCalendarEvent(editingSession.googleEventId, sessionForm as Session);
        }
        
        await syncInvoiceWithSessions(sessionForm.patientName, sessionForm.date);
        if (oldSession.date.substring(0, 7) !== sessionForm.date.substring(0, 7)) {
          await syncInvoiceWithSessions(oldSession.patientName, oldSession.date);
        }
      } else {
        // CRIAÇÃO: salva no Firestore e cria evento no Google Calendar
        const newSessionData = sessionForm as Session;
        const firestoreId = await addSession(newSessionData);

        if (googleAccessToken) {
          const eventId = await createGoogleCalendarEvent(newSessionData);
          if (eventId && firestoreId) {
            // Vincula o eventId do Google ao registro no Firestore
            await updateSession(firestoreId, { googleEventId: eventId });
          }
        }
        await syncInvoiceWithSessions(newSessionData.patientName, newSessionData.date);
      }
      setShowSessionModal(false);
            loadAllSessionsForSelectedMonth();
      loadUpcomingSessionsData();
      loadInvoicesData(false);
      if (selectedPatientForDashboard) {
        loadPatientDashboardSessions(selectedPatientForDashboard.name);
      }
    } catch (err: any) {
      setErrorMsg("Erro ao salvar sessão: " + err.message);
    }
  };

  const handleDeleteSession = (id: string) => {
    showConfirm(
      "Deseja excluir este registro de sessão?",
      async () => {
        try {
          // Busca a sessão para verificar se tem eventId vinculado ao Google
          const sessionToDelete = allSessions.find(s => s.id === id);
          if (sessionToDelete?.googleEventId && googleAccessToken) {
            await deleteGoogleCalendarEvent(sessionToDelete.googleEventId);
          }

          await deleteSession(id);
          if (sessionToDelete) {
            await syncInvoiceWithSessions(sessionToDelete.patientName, sessionToDelete.date);
          }
                    loadAllSessionsForSelectedMonth();
          loadUpcomingSessionsData();
          loadInvoicesData(false);
          if (selectedPatientForDashboard) {
            loadPatientDashboardSessions(selectedPatientForDashboard.name);
          }
        } catch (err: any) {
          setErrorMsg("Erro ao excluir sessão: " + err.message);
        }
      }
    );
  };

  const handleToggleSessionPaymentStatus = async (session: Session) => {
    if (!session.id) return;
    try {
      // Ciclo: Não Pago → Pago → Pacote → Não Pago
      let newIsPaid: boolean;
      let newIsPackage: boolean;

      if (!session.isPaid && !session.isPackage) {
        // Não Pago → Pago
        newIsPaid = true;
        newIsPackage = false;
      } else if (session.isPaid && !session.isPackage) {
        // Pago → Pacote
        newIsPaid = false;
        newIsPackage = true;
      } else {
        // Pacote → Não Pago
        newIsPaid = false;
        newIsPackage = false;
      }

      await updateSession(session.id, { isPaid: newIsPaid, isPackage: newIsPackage });

      // Atualiza o estado das sessões no dashboard (otimista)
      setPatientDashboardSessions(prev =>
        prev.map(s => s.id === session.id ? { ...s, isPaid: newIsPaid, isPackage: newIsPackage } : s)
      );

      // Sincronizar o paidValue da fatura correspondente
      await syncInvoiceWithSessions(session.patientName, session.date);

            loadAllSessionsForSelectedMonth();
      loadUpcomingSessionsData();
      loadInvoicesData(false);
    } catch (err: any) {
      setErrorMsg("Erro ao alterar status de pagamento da sessão: " + err.message);
    }
  };

  const handleToggleSessionCancellation = async (session: Session) => {
    if (!session.id) return;
    try {
      const newCancelled = !session.isCancelled;
      const updates: Partial<Session> = {
        isCancelled: newCancelled,
        isCharged: false
      };

      await updateSession(session.id, updates);

      setPatientDashboardSessions(prev =>
        prev.map(s => s.id === session.id ? { ...s, isCancelled: newCancelled, isCharged: false } : s)
      );

      await syncInvoiceWithSessions(session.patientName, session.date);
            loadAllSessionsForSelectedMonth();
      loadUpcomingSessionsData();
      loadInvoicesData(false);
    } catch (err: any) {
      setErrorMsg("Erro ao alterar status de cancelamento da sessão: " + err.message);
    }
  };

  const handleToggleSessionCharge = async (session: Session) => {
    if (!session.id) return;
    try {
      const newCharged = !session.isCharged;
      const updates: Partial<Session> = {
        isCharged: newCharged
      };

      await updateSession(session.id, updates);

      setPatientDashboardSessions(prev =>
        prev.map(s => s.id === session.id ? { ...s, ...updates } : s)
      );

      await syncInvoiceWithSessions(session.patientName, session.date);
            loadAllSessionsForSelectedMonth();
      loadUpcomingSessionsData();
      loadInvoicesData(false);
    } catch (err: any) {
      setErrorMsg("Erro ao alterar status de cobrança da sessão: " + err.message);
    }
  };

  const handleUpdateSessionValue = async (sessionId: string, value: number) => {
    try {
      await updateSession(sessionId, { sessionValue: value });

      setPatientDashboardSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, sessionValue: value } : s)
      );

      const session = patientDashboardSessions.find(s => s.id === sessionId);
      if (session) {
        await syncInvoiceWithSessions(session.patientName, session.date);
      }
            loadAllSessionsForSelectedMonth();
      loadUpcomingSessionsData();
      loadInvoicesData(false);
    } catch (err: any) {
      setErrorMsg("Erro ao atualizar valor da sessão: " + err.message);
    }
  };

  const handleUpdateSessionNotes = async (sessionId: string, notes: string) => {
    try {
      await updateSession(sessionId, { notes });

      setPatientDashboardSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, notes } : s)
      );

            loadAllSessionsForSelectedMonth();
      loadUpcomingSessionsData();
    } catch (err: any) {
      setErrorMsg("Erro ao atualizar anotações da sessão: " + err.message);
    }
  };

  const handleUpdateSessionDate = async (sessionId: string, date: string) => {
    try {
      await updateSession(sessionId, { date });

      setPatientDashboardSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, date } : s)
      );

      const session = patientDashboardSessions.find(s => s.id === sessionId);
      if (session) {
        await syncInvoiceWithSessions(session.patientName, date);
        if (session.date.substring(0, 7) !== date.substring(0, 7)) {
          await syncInvoiceWithSessions(session.patientName, session.date);
        }
      }
            loadAllSessionsForSelectedMonth();
      loadUpcomingSessionsData();
      loadInvoicesData(false);
    } catch (err: any) {
      setErrorMsg("Erro ao atualizar data da sessão: " + err.message);
    }
  };

  const handleUpdateSessionModality = async (sessionId: string, modality: string) => {
    try {
      await updateSession(sessionId, { modality });

      setPatientDashboardSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, modality } : s)
      );

      const session = patientDashboardSessions.find(s => s.id === sessionId);
      if (session) {
        await syncInvoiceWithSessions(session.patientName, session.date);
      }
            loadAllSessionsForSelectedMonth();
      loadUpcomingSessionsData();
      loadInvoicesData(false);
    } catch (err: any) {
      setErrorMsg("Erro ao atualizar modalidade da sessão: " + err.message);
    }
  };

  const handleUpdateSessionPatientType = async (sessionId: string, patientType: string) => {
    try {
      await updateSession(sessionId, { patientType });

      setPatientDashboardSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, patientType } : s)
      );

      const session = patientDashboardSessions.find(s => s.id === sessionId);
      if (session) {
        await syncInvoiceWithSessions(session.patientName, session.date);
      }
            loadAllSessionsForSelectedMonth();
      loadUpcomingSessionsData();
      loadInvoicesData(false);
    } catch (err: any) {
      setErrorMsg("Erro ao atualizar tipo de paciente da sessão: " + err.message);
    }
  };

  const handleToggleSessionRentCancelled = async (sessionId: string, currentVal: boolean) => {
    try {
      const newVal = !currentVal;
      await updateSession(sessionId, { isRentCancelled: newVal });

      setAllSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, isRentCancelled: newVal } : s)
      );

      setPatientDashboardSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, isRentCancelled: newVal } : s)
      );

            loadAllSessionsForSelectedMonth();
      loadUpcomingSessionsData();
    } catch (err: any) {
      setErrorMsg("Erro ao alterar cancelamento do aluguel da sessão: " + err.message);
    }
  };

  const handleToggleSessionRentPaid = async (sessionId: string, currentVal: boolean) => {
    try {
      const newVal = !currentVal;
      await updateSession(sessionId, { isRentPaid: newVal });

      setAllSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, isRentPaid: newVal } : s)
      );

      setPatientDashboardSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, isRentPaid: newVal } : s)
      );

            loadAllSessionsForSelectedMonth();
      loadUpcomingSessionsData();

      // INTEGRAÇÃO: Se o aluguel foi marcado como pago, envia o gasto para o controle-de-gastos
      if (newVal) {
        const session = allSessions.find(s => s.id === sessionId);
        if (session) {
          enviarTransacaoParaGastos({
            tipo: 'gasto',
            descricao: `Aluguel Consultório - ${session.patientName}`,
            valor: 30.00,
            categoria: 'Aluguel Consultório',
            metodoPagamento: 'Dinheiro',
            pago: true,
            data: session.date
          });
        }
      }
    } catch (err: any) {
      setErrorMsg("Erro ao alterar status de pagamento do aluguel da sessão: " + err.message);
    }
  };

  // ==========================================
  // OPERAÇÕES CRUD - INVOICES (FATURAMENTO)
  // ==========================================

  const handleOpenInvoiceModal = (invoice?: Invoice) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setInvoiceForm({
        year: invoice.year,
        month: invoice.month,
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date || '',
        patientName: invoice.patientName,
        value: invoice.value,
        paidValue: invoice.paidValue,
        pendingValue: Math.max(0, invoice.value - invoice.paidValue),
        notes: invoice.notes || ''
      });
    } else {
      setEditingInvoice(null);
      setInvoiceForm({
        year: selectedYear,
        month: selectedMonth || 'JANEIRO',
        invoiceNumber: invoices.length > 0 ? Math.max(...invoices.map(inv => inv.invoiceNumber)) + 1 : 1,
        date: new Date().toISOString().split('T')[0],
        patientName: patients[0]?.name || '',
        value: patients[0]?.defaultRate || 150,
        paidValue: 0,
        pendingValue: patients[0]?.defaultRate || 150,
        notes: ''
      });
    }
    setShowInvoiceModal(true);
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.patientName) return;

    try {
      const val = Number(invoiceForm.value);
      const paid = Number(invoiceForm.paidValue);
      const completeForm = {
        ...invoiceForm,
        value: val,
        paidValue: paid,
        pendingValue: Math.max(0, val - paid)
      };

      const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return undefined;
        return dateStr.includes('/') ? dateStr.split('/').reverse().join('-') : dateStr;
      };

      if (editingInvoice?.id) {
        await updateInvoice(editingInvoice.id, completeForm);
        
        // INTEGRAÇÃO: Se o valor pago aumentou, envia a diferença como ganho
        const oldPaid = editingInvoice.paidValue || 0;
        const diff = paid - oldPaid;
        if (diff > 0) {
          enviarTransacaoParaGastos({
            tipo: 'ganho',
            descricao: `Fatura Clínica - ${completeForm.patientName} (${completeForm.month})`,
            valor: diff,
            data: formatDate(completeForm.date)
          });
        }
      } else {
        await addInvoice(completeForm as Invoice);
        
        // INTEGRAÇÃO: Se a nova fatura foi cadastrada com algum valor já pago
        if (paid > 0) {
          enviarTransacaoParaGastos({
            tipo: 'ganho',
            descricao: `Fatura Clínica - ${completeForm.patientName} (${completeForm.month})`,
            valor: paid,
            data: formatDate(completeForm.date)
          });
        }
      }
      setShowInvoiceModal(false);
      loadInvoicesData(false);
    } catch (err: any) {
      setErrorMsg("Erro ao salvar fatura: " + err.message);
    }
  };

  const handleQuickPayInvoice = async (invoice: Invoice) => {
    if (!invoice.id) return;
    try {
      await updateInvoice(invoice.id, {
        paidValue: invoice.value,
        pendingValue: 0
      });
      loadInvoicesData(false);

      // INTEGRAÇÃO: Envia o valor pendente que foi quitado como ganho
      const diff = invoice.value - (invoice.paidValue || 0);
      const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return undefined;
        return dateStr.includes('/') ? dateStr.split('/').reverse().join('-') : dateStr;
      };

      if (diff > 0) {
        enviarTransacaoParaGastos({
          tipo: 'ganho',
          descricao: `Fatura Clínica - ${invoice.patientName} (${invoice.month})`,
          valor: diff,
          data: formatDate(invoice.date)
        });
      }
    } catch (err: any) {
      setErrorMsg("Erro ao atualizar pagamento da fatura: " + err.message);
    }
  };

  const handleDeleteInvoice = (id: string) => {
    showConfirm(
      "Deseja excluir esta fatura?",
      async () => {
        try {
          await deleteInvoice(id);
          loadInvoicesData(false);
        } catch (err: any) {
          setErrorMsg("Erro ao excluir fatura: " + err.message);
        }
      }
    );
  };

  // ==========================================
  // METRICAS FINANCEIRAS
  // ==========================================

  // Encontra a data da última sessão de um paciente
  const getPatientLastSessionDate = (patientName: string) => {
    const pSessions = allSessions.filter(s => s.patientName === patientName && (!s.isCancelled || s.isCharged));
    if (pSessions.length === 0) return null;
    const sorted = pSessions.map(s => s.date).sort();
    return sorted[sorted.length - 1]; // YYYY-MM-DD
  };

  const getMonthIndex = (mName: string): number => {
    const months: Record<string, number> = {
      'JANEIRO': 0, 'FEVEREIRO': 1, 'MARÇO': 2, 'ABRIL': 3,
      'MAIO': 4, 'JUNHO': 5, 'JULHO': 6, 'AGOSTO': 7,
      'SETEMBRO': 8, 'OUTUBRO': 9, 'NOVEMBRO': 10, 'DEZEMBRO': 11
    };
    return months[mName] ?? 0;
  };

  // Verifica se a fatura deve ser contabilizada com base no status/última sessão
  const isInvoiceValidForPatientStatus = (inv: Invoice) => {
    const p = patients.find(pat => pat.name === inv.patientName);
    if (!p) return true;
    if (p.status === 'active') return true;

    const lastSessionDate = getPatientLastSessionDate(p.name);
    if (!lastSessionDate) return true;

    const [lastYearStr, lastMonthStr] = lastSessionDate.split('-');
    const lastYear = Number(lastYearStr);
    const lastMonthIdx = Number(lastMonthStr) - 1;

    const invMonthIdx = getMonthIndex(inv.month);
    const invYear = inv.year;

    if (invYear < lastYear) return true;
    if (invYear > lastYear) return false;
    return invMonthIdx <= lastMonthIdx;
  };

  // Faturamento Zenklub de acordo com ciclo de faturamento (24 do mês anterior a 23 do atual) - Para exibição no Dashboard do mês selecionado
  const getZenklubSumForDashboard = (year: number, monthName: string) => {
    const monthNumMap: Record<string, number> = {
      'JANEIRO': 1, 'FEVEREIRO': 2, 'MARÇO': 3, 'ABRIL': 4,
      'MAIO': 5, 'JUNHO': 6, 'JULHO': 7, 'AGOSTO': 8,
      'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12
    };
    const M = monthNumMap[monthName] || 1;

    // Ciclo do dashboard do mês M: de 24 do mês M-1 a 23 do mês M
    let endMonthIndex = M;
    let endYear = year;

    let startMonthIndex = M - 1;
    let startYear = year;
    if (startMonthIndex === 0) {
      startMonthIndex = 12;
      startYear = year - 1;
    }

    const startStr = `${startYear}-${String(startMonthIndex).padStart(2, '0')}-24`;
    const endStr = `${endYear}-${String(endMonthIndex).padStart(2, '0')}-23`;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const zenklubPatients = patients.filter(p => p.origin === 'zenklub');
    const zenklubPatientNames = new Set(zenklubPatients.map(p => p.name));

    const zenklubCycleSessions = allSessions.filter(s => {
      const isZenklub = s.patientType === 'zenklub' || (s.patientType === undefined && (zenklubPatientNames.has(s.patientName) || s.modality === 'zenklub'));
      return isZenklub && s.date >= startStr && s.date <= endStr && s.date <= todayStr;
    });

    return zenklubCycleSessions.reduce((sum, s) => {
      const p = patients.find(pat => pat.name === s.patientName);
      const rate = p ? p.defaultRate : (Number(s.paymentInfo) || 0);
      const value = s.sessionValue !== undefined ? s.sessionValue : rate;
      return sum + value;
    }, 0);
  };

  // Faturamento Zenklub de acordo com ciclo de faturamento (24 do mês M-2 a 23 do mês M-1) - Para inclusão na Fatura virtual paga no dia 6 do mês M
  const getZenklubSumForInvoice = (year: number, monthName: string) => {
    const monthNumMap: Record<string, number> = {
      'JANEIRO': 1, 'FEVEREIRO': 2, 'MARÇO': 3, 'ABRIL': 4,
      'MAIO': 5, 'JUNHO': 6, 'JULHO': 7, 'AGOSTO': 8,
      'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12
    };
    const M = monthNumMap[monthName] || 1;

    // Ciclo da fatura do mês M: de 24 do mês M-2 a 23 do mês M-1
    let endMonthIndex = M - 1;
    let endYear = year;
    if (endMonthIndex === 0) {
      endMonthIndex = 12;
      endYear = year - 1;
    }

    let startMonthIndex = M - 2;
    let startYear = year;
    if (startMonthIndex === 0) {
      startMonthIndex = 12;
      startYear = year - 1;
    } else if (startMonthIndex === -1) {
      startMonthIndex = 11;
      startYear = year - 1;
    }

    const startStr = `${startYear}-${String(startMonthIndex).padStart(2, '0')}-24`;
    const endStr = `${endYear}-${String(endMonthIndex).padStart(2, '0')}-23`;

    const zenklubPatients = patients.filter(p => p.origin === 'zenklub');
    const zenklubPatientNames = new Set(zenklubPatients.map(p => p.name));

    const zenklubCycleSessions = allSessions.filter(s => {
      const isZenklub = s.patientType === 'zenklub' || (s.patientType === undefined && (zenklubPatientNames.has(s.patientName) || s.modality === 'zenklub'));
      return isZenklub && s.date >= startStr && s.date <= endStr;
    });

    return zenklubCycleSessions.reduce((sum, s) => {
      const p = patients.find(pat => pat.name === s.patientName);
      const rate = p ? p.defaultRate : (Number(s.paymentInfo) || 0);
      const value = s.sessionValue !== undefined ? s.sessionValue : rate;
      return sum + value;
    }, 0);
  };

  const getZenklubTotalFaturado = () => {
    if (!selectedMonth) return 0;
    return getZenklubSumForDashboard(selectedYear, selectedMonth);
  };

  const zenklubTotalFaturado = getZenklubTotalFaturado();

  const getZenklubCyclePeriodLabel = () => {
    if (!selectedMonth) return '';
    const monthNumMap: Record<string, number> = {
      'JANEIRO': 1, 'FEVEREIRO': 2, 'MARÇO': 3, 'ABRIL': 4,
      'MAIO': 5, 'JUNHO': 6, 'JULHO': 7, 'AGOSTO': 8,
      'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12
    };
    const M = monthNumMap[selectedMonth] || 1;

    // Ciclo do dashboard do mês M: de 24 do mês M-1 a 23 do mês M
    let endMonthIndex = M;
    let endYear = selectedYear;

    let startMonthIndex = M - 1;
    let startYear = selectedYear;
    if (startMonthIndex === 0) {
      startMonthIndex = 12;
      startYear = selectedYear - 1;
    }

    const startFormatted = `24/${String(startMonthIndex).padStart(2, '0')}/${startYear}`;
    const endFormatted = `23/${String(endMonthIndex).padStart(2, '0')}/${endYear}`;
    return `${startFormatted} a ${endFormatted}`;
  };

  const zenklubCyclePeriodLabel = getZenklubCyclePeriodLabel();

  const getZenklubSessionsForDetail = () => {
    if (!selectedMonth) return [];

    const monthNumMap: Record<string, number> = {
      'JANEIRO': 1, 'FEVEREIRO': 2, 'MARÇO': 3, 'ABRIL': 4,
      'MAIO': 5, 'JUNHO': 6, 'JULHO': 7, 'AGOSTO': 8,
      'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12
    };
    const M = monthNumMap[selectedMonth] || 1;

    // Ciclo do dashboard do mês M: de 24 do mês M-1 a 23 do mês M
    let endMonthIndex = M;
    let endYear = selectedYear;

    let startMonthIndex = M - 1;
    let startYear = selectedYear;
    if (startMonthIndex === 0) {
      startMonthIndex = 12;
      startYear = selectedYear - 1;
    }

    const startStr = `${startYear}-${String(startMonthIndex).padStart(2, '0')}-24`;
    const endStr = `${endYear}-${String(endMonthIndex).padStart(2, '0')}-23`;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const zenklubPatientsLocal = patients.filter(p => p.origin === 'zenklub');
    const zenklubPatientNamesLocal = new Set(zenklubPatientsLocal.map(p => p.name));

    const zenklubCycleSessions = allSessions.filter(s => {
      const isZenklub = s.patientType === 'zenklub' || (s.patientType === undefined && (zenklubPatientNamesLocal.has(s.patientName) || s.modality === 'zenklub'));
      return isZenklub && s.date >= startStr && s.date <= endStr && s.date <= todayStr;
    });

    return zenklubCycleSessions.map(s => {
      const p = patients.find(pat => pat.name === s.patientName);
      const rate = p ? p.defaultRate : (Number(s.paymentInfo) || 0);
      const value = s.sessionValue !== undefined ? s.sessionValue : rate;
      return {
        patientName: s.patientName,
        date: s.date,
        value
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  };

  const zenklubSessionsForDetail = getZenklubSessionsForDetail();

  // Filtrar as faturas do dashboard para não mostrar pacientes Zenklub individuais
  const zenklubPatients = patients.filter(p => p.origin === 'zenklub');
  const zenklubPatientNames = new Set(zenklubPatients.map(p => p.name));
  const filteredInvoices = invoices.filter(inv => !zenklubPatientNames.has(inv.patientName) && inv.patientName.toUpperCase() !== 'ZENKLUB');

  // Adicionar a fatura virtual do ZENKLUB se houver faturamento
  const displayInvoices: Invoice[] = [...filteredInvoices];
  const zenklubSum = selectedMonth ? getZenklubSumForInvoice(selectedYear, selectedMonth) : 0;

  if (selectedMonth && zenklubSum > 0) {
    const monthNumMap: Record<string, number> = {
      'JANEIRO': 1, 'FEVEREIRO': 2, 'MARÇO': 3, 'ABRIL': 4,
      'MAIO': 5, 'JUNHO': 6, 'JULHO': 7, 'AGOSTO': 8,
      'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12
    };
    const M = monthNumMap[selectedMonth] || 1;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const paymentDateStr = `${selectedYear}-${String(M).padStart(2, '0')}-06`;
    const isPaid = todayStr >= paymentDateStr;

    displayInvoices.push({
      id: 'virtual-zenklub-invoice',
      year: selectedYear,
      month: selectedMonth,
      invoiceNumber: 9999,
      date: paymentDateStr,
      patientName: 'ZENKLUB',
      value: zenklubSum,
      paidValue: isPaid ? zenklubSum : 0,
      pendingValue: isPaid ? 0 : zenklubSum,
      notes: 'Faturamento consolidado do ciclo Zenklub'
    });
  }

  // Faturamento Geral (Incluso ativos, e inativos até o mês da última sessão)
  const totalMetrics = displayInvoices
    .filter(inv => isInvoiceValidForPatientStatus(inv) && inv.id !== 'virtual-zenklub-invoice')
    .reduce(
      (acc, curr) => {
        acc.faturado += curr.value;
        acc.recebido += curr.paidValue;
        acc.pendente += Math.max(0, curr.value - curr.paidValue);
        return acc;
      },
      { faturado: 0, recebido: 0, pendente: 0 }
    );



  // Mês vigente e sessões correspondentes para aba de repasses
  const currentRepasseMonthName = (() => {
    const months = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];
    return selectedMonth || months[new Date().getMonth()];
  })();

  const monthNumForRepasse = {
    'JANEIRO': '01', 'FEVEREIRO': '02', 'MARÇO': '03', 'ABRIL': '04',
    'MAIO': '05', 'JUNHO': '06', 'JULHO': '07', 'AGOSTO': '08',
    'SETEMBRO': '09', 'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12'
  }[currentRepasseMonthName];

  const repasseSessions = allSessions.filter(s => {
    const [yearStr, monthStr] = s.date.split('-');
    return Number(yearStr) === selectedYear && monthStr === monthNumForRepasse;
  });

  // Cálculos para Repasse Integrando Ser (Engloba pausados/encerrados)
  const integrandoPatients = patients.filter(p => p.origin === 'integrando_ser');
  const integrandoRows = integrandoPatients.map(p => {
    const pSessions = repasseSessions.filter(s => s.patientName === p.name && (!s.isCancelled || s.isCharged));
    const sessions = pSessions.map(s => {
      const value = s.sessionValue !== undefined ? s.sessionValue : p.defaultRate;
      const discount = value * 0.25;
      return {
        date: s.date,
        value,
        discount
      };
    }).sort((a, b) => a.date.localeCompare(b.date));

    const sessionsCount = sessions.length;
    const gross = sessions.reduce((sum, s) => sum + s.value, 0);
    const repasse = sessions.reduce((sum, s) => sum + s.discount, 0);
    return {
      name: p.name,
      sessionsCount,
      gross,
      repasse,
      sessions
    };
  }).filter(r => r.sessionsCount > 0); // Exibe apenas se teve sessão no mês

  const integrandoTotalSessions = integrandoRows.reduce((sum, r) => sum + r.sessionsCount, 0);
  const integrandoTotalGross = integrandoRows.reduce((sum, r) => sum + r.gross, 0);
  const integrandoTotalRepasse = integrandoRows.reduce((sum, r) => sum + r.repasse, 0);

  // Cálculos para Repasse Consultório (Presencial - Engloba pausados/encerrados)
  const presencialPatients = patients.filter(p => p.format === 'presencial');
  const presencialRows = presencialPatients.map(p => {
    const pSessions = repasseSessions.filter(s => 
      s.patientName === p.name && 
      (!s.isCancelled || s.isCharged) && 
      (s.modality || '').toLowerCase() === 'presencial'
    );
    const sessions = pSessions.map(s => {
      const value = s.sessionValue !== undefined ? s.sessionValue : p.defaultRate;
      const discount = s.isRentCancelled ? 0.00 : 30.00;
      return {
        id: s.id,
        date: s.date,
        value,
        discount,
        isRentCancelled: s.isRentCancelled || false,
        isRentPaid: s.isRentPaid || false
      };
    }).sort((a, b) => a.date.localeCompare(b.date));

    const sessionsCount = sessions.length;
    const gross = sessions.reduce((sum, s) => sum + s.value, 0);
    const rent = sessions.reduce((sum, s) => sum + s.discount, 0);
    const netTotal = gross - rent;
    return {
      name: p.name,
      sessionsCount,
      gross,
      rent,
      netTotal,
      sessions
    };
  }).filter(r => r.sessionsCount > 0); // Exibe apenas se teve sessão no mês

  const presencialTotalSessions = presencialRows.reduce((sum, r) => sum + r.sessionsCount, 0);
  const presencialTotalRent = presencialRows.reduce((sum, r) => sum + r.rent, 0);
  const presencialTotalRentPaid = presencialRows.reduce((sum, r) => {
    const paidRentForPat = r.sessions
      .filter((s: any) => !s.isRentCancelled && s.isRentPaid)
      .reduce((sSum: number, s: any) => sSum + s.discount, 0);
    return sum + paidRentForPat;
  }, 0);
  const presencialTotalNet = presencialRows.reduce((sum, r) => sum + r.netTotal, 0);

  // Cálculos para Repasse Supervisão (Particular - Engloba pausados/encerrados)
  // Utilize apenas os pacientes particulares online para fazer o calculo do repasse para supervisao
  const privatePatientsForRows = patients.filter(p => p.origin === 'particular' && p.format === 'online');
  const privateRows = privatePatientsForRows.map(p => {
    const pSessions = repasseSessions.filter(s => s.patientName === p.name && (!s.isCancelled || s.isCharged));
    const sessionsCount = pSessions.length;
    const rate = p.defaultRate;
    const gross = sessionsCount * rate;
    return {
      name: p.name,
      sessionsCount,
      rate,
      gross
    };
  }).filter(r => r.sessionsCount > 0); // Exibe apenas se teve sessão no mês

  const privateTotalSessions = privateRows.reduce((sum, r) => sum + r.sessionsCount, 0);
  const privateTotalSupervision = privateTotalSessions > 0 ? 360.00 : 0.00;
  const privateTotalGross = privateRows.reduce((sum, r) => sum + r.gross, 0);
  const privateTotalNet = privateTotalGross - privateTotalSupervision;

  // Metas de Supervisão
  const supervisionTarget = 360.00;
  const privateActivePatients = patients.filter(p => p.origin === 'particular' && p.status === 'active' && p.format === 'online');
  const privateSessions = repasseSessions.filter(s => {
    const p = patients.find(pat => pat.name === s.patientName);
    return p?.origin === 'particular' && p?.status === 'active' && p?.format === 'online' && (!s.isCancelled || s.isCharged);
  });
  const privateSessionsCount = privateSessions.length;
  const suggestedSavePerSession = privateSessionsCount > 0 ? (supervisionTarget / privateSessionsCount) : 0;
  const suggestedSavePerPatientMonthly = privateActivePatients.length > 0 ? (supervisionTarget / privateActivePatients.length) : 0;
  const suggestedSavePerSessionAssumingFour = privateActivePatients.length > 0 ? (supervisionTarget / privateActivePatients.length / 4) : 0;

  // ==========================================
  // SALÁRIO LÍQUIDO & MÉTRICAS ANUAIS
  // ==========================================
  const monthsList = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];
  const salaryMonth = selectedMonth || monthsList[new Date().getMonth()];

  const salaryInvoices = displayInvoices.filter(inv => inv.year === selectedYear && inv.month === salaryMonth);
  const salaryMetrics = salaryInvoices.reduce(
    (acc, curr) => {
      acc.faturado += curr.value;
      acc.recebido += curr.paidValue;
      return acc;
    },
    { faturado: 0, recebido: 0 }
  );

  const salaryTotalRepasses = integrandoTotalRepasse + presencialTotalRent + privateTotalSupervision;
  const salarioLiquidoPrevisto = salaryMetrics.faturado - salaryTotalRepasses;
  const salarioLiquidoRecebido = salaryMetrics.recebido - salaryTotalRepasses;

  const calculateAnnualRepasses = () => {
    let totalIntegrandoRepasse = 0;
    let totalPresencialRent = 0;
    let totalPrivateSupervision = 0;

    const activeMonthIndex = monthsList.indexOf(salaryMonth);
    monthsList.slice(0, activeMonthIndex + 1).forEach((_, mIdx) => {
      const mNum = String(mIdx + 1).padStart(2, '0');
      const mSessions = allSessions.filter(s => {
        const [yearStr, monthStr] = s.date.split('-');
        return Number(yearStr) === selectedYear && monthStr === mNum;
      });

      // Integrando
      const integrandoPats = patients.filter(p => p.origin === 'integrando_ser');
      integrandoPats.forEach(p => {
        const count = mSessions.filter(s => s.patientName === p.name && (!s.isCancelled || s.isCharged)).length;
        totalIntegrandoRepasse += count * p.defaultRate * 0.25;
      });

      // Presencial (aluguel)
      const presencialPats = patients.filter(p => p.format === 'presencial');
      presencialPats.forEach(p => {
        const matchingSessions = mSessions.filter(s => 
          s.patientName === p.name && 
          (!s.isCancelled || s.isCharged) && 
          (s.modality || '').toLowerCase() === 'presencial'
        );
        matchingSessions.forEach(s => {
          if (!s.isRentCancelled) {
            totalPresencialRent += 30.00;
          }
        });
      });

      // Particular online (supervisão)
      const privatePats = patients.filter(p => p.origin === 'particular' && p.format === 'online');
      let hasPrivateOnline = false;
      privatePats.forEach(p => {
        const count = mSessions.filter(s => s.patientName === p.name && (!s.isCancelled || s.isCharged)).length;
        if (count > 0) hasPrivateOnline = true;
      });
      if (hasPrivateOnline) {
        totalPrivateSupervision += 360.00;
      }
    });

    return totalIntegrandoRepasse + totalPresencialRent + totalPrivateSupervision;
  };

  const annualRepasses = calculateAnnualRepasses();

  const getAnnualMetrics = () => {
    const activeMonthIndex = monthsList.indexOf(salaryMonth);
    const monthsToInclude = new Set(monthsList.slice(0, activeMonthIndex + 1));

    const yearInvoices = allInvoices.filter(inv => 
      inv.year === selectedYear && 
      monthsToInclude.has(inv.month) &&
      isInvoiceValidForPatientStatus(inv) &&
      !zenklubPatientNames.has(inv.patientName) && 
      inv.patientName.toUpperCase() !== 'ZENKLUB'
    );
    
    let zenklubAnnualSum = 0;
    monthsList.slice(0, activeMonthIndex + 1).forEach((mName) => {
      const zenklubInv = allInvoices.find(i => 
        i.year === selectedYear && 
        i.month === mName && 
        i.patientName.toUpperCase() === 'ZENKLUB'
      );
      if (zenklubInv) {
        zenklubAnnualSum += zenklubInv.paidValue;
      } else {
        const sum = getZenklubSumForInvoice(selectedYear, mName);
        const yyyy = new Date().getFullYear();
        const mm = String(new Date().getMonth() + 1).padStart(2, '0');
        const dd = String(new Date().getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const monthNumMap: Record<string, string> = {
          'JANEIRO': '01', 'FEVEREIRO': '02', 'MARÇO': '03', 'ABRIL': '04',
          'MAIO': '05', 'JUNHO': '06', 'JULHO': '07', 'AGOSTO': '08',
          'SETEMBRO': '09', 'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12'
        };
        const mNum = monthNumMap[mName] || '01';
        const paymentDateStr = `${selectedYear}-${mNum}-06`;
        const isPaid = todayStr >= paymentDateStr;
        if (isPaid && sum > 0) {
          zenklubAnnualSum += sum;
        }
      }
    });

    const nonZenklubPaid = yearInvoices.reduce((sum, inv) => sum + inv.paidValue, 0);

    return nonZenklubPaid + zenklubAnnualSum;
  };

  const annualBruto = getAnnualMetrics();
  const annualLiquido = annualBruto - annualRepasses;

  const getPreviousMonthName = (): string => {
    if (!selectedMonth) return '';
    const months = [
      'DEZEMBRO', 'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL',
      'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO'
    ];
    const monthNumMap: Record<string, number> = {
      'JANEIRO': 1, 'FEVEREIRO': 2, 'MARÇO': 3, 'ABRIL': 4,
      'MAIO': 5, 'JUNHO': 6, 'JULHO': 7, 'AGOSTO': 8,
      'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12
    };
    const M = monthNumMap[selectedMonth] || 1;
    return months[M - 1];
  };

  const previousMonthName = getPreviousMonthName();

  // Saldo a receber de segunda a sexta da semana atual
  const getWeekSessionsToReceive = () => {
    const today = new Date();
    const day = today.getDay();
    const saturdayStart = new Date(today);

    let diffToSaturday = 0;
    if (day === 6) {
      diffToSaturday = 0;
    } else if (day === 0) {
      diffToSaturday = -1;
    } else {
      diffToSaturday = -(day + 1);
    }

    saturdayStart.setDate(today.getDate() + diffToSaturday);
    saturdayStart.setHours(0, 0, 0, 0);

    const saturdayEnd = new Date(saturdayStart);
    saturdayEnd.setDate(saturdayStart.getDate() + 7);
    saturdayEnd.setHours(23, 59, 59, 999);

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayStr}`;
    };

    const startStr = formatDate(saturdayStart);
    const endStr = formatDate(saturdayEnd);

    const zenklubPatientsLocal = patients.filter(p => p.origin === 'zenklub');
    const zenklubPatientNamesLocal = new Set(zenklubPatientsLocal.map(p => p.name));

    const monthNumMap: Record<string, number> = {
      'JANEIRO': 1, 'FEVEREIRO': 2, 'MARÇO': 3, 'ABRIL': 4,
      'MAIO': 5, 'JUNHO': 6, 'JULHO': 7, 'AGOSTO': 8,
      'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12
    };

    const currentYear = today.getFullYear();
    const M = monthNumMap[selectedMonth] || 1;

    // Calcular prefixo do mês anterior
    let prevM = M - 1;
    let prevYear = currentYear;
    if (prevM === 0) {
      prevM = 12;
      prevYear = currentYear - 1;
    }
    const prevMonthPrefix = `${prevYear}-${String(prevM).padStart(2, '0')}`;
    const currentMonthPrefix = `${currentYear}-${String(M).padStart(2, '0')}`;

    // Filtrar sessões alvo
    const targetSessions = allSessions.filter(s => {
      // Excluir Zenklub
      const isZenklub = s.patientType === 'zenklub' || (s.patientType === undefined && zenklubPatientNamesLocal.has(s.patientName));
      if (isZenklub) return false;

      // Excluir sessões canceladas não cobradas
      if (s.isCancelled && !s.isCharged) return false;

      // Apenas sessões não pagas e não pacote
      if (s.isPaid === true) return false;
      if (s.isPackage) return false;

      // Mes anterior completo
      const isPrevMonth = s.date.startsWith(prevMonthPrefix);

      // Semana do mes vigente (sabado a sabado)
      const isWeekVigente = s.date >= startStr && s.date <= endStr && s.date.startsWith(currentMonthPrefix);

      return isPrevMonth || isWeekVigente;
    });

    const items: { id?: string; patientName: string; date: string; value: number; type: 'vigente' | 'anterior' }[] = [];

    targetSessions.forEach(s => {
      const p = patients.find(pat => pat.name === s.patientName);
      const rate = p ? p.defaultRate : (Number(s.paymentInfo) || 150);
      const value = s.sessionValue !== undefined ? s.sessionValue : rate;

      const sMonth = Number(s.date.split('-')[1]);
      const type: 'vigente' | 'anterior' = (sMonth === M) ? 'vigente' : 'anterior';

      items.push({
        id: s.id,
        patientName: s.patientName,
        date: s.date,
        value,
        type
      });
    });

    const sortedItems = items.sort((a, b) => a.date.localeCompare(b.date));
    return sortedItems;
  };

  const weekSessionsToReceive = getWeekSessionsToReceive();
  const weekSessionsTotal = weekSessionsToReceive.reduce((sum, s) => sum + s.value, 0);

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
        <p style={{ fontSize: '1.2rem', fontWeight: '600' }}>Carregando autenticação...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'radial-gradient(circle at top right, rgba(56, 189, 248, 0.08), transparent), var(--bg-main)', padding: '2rem' }}>
        <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: 'var(--shadow-glow)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
          <div>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔒</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, background: 'var(--accent-primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Sistema de Gestão</h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Acesso Restrito</p>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
            Efetue login com sua conta autorizada para acessar o sistema.
          </p>

          {errorMsg && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
              {errorMsg}
            </div>
          )}

          <Button variant="primary" onClick={handleLoginWithGoogle} style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '0.95rem' }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#ea4335" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.909c1.702-1.567 2.683-3.874 2.683-6.615z" />
              <path fill="#4285f4" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.909-2.258c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
              <path fill="#fbbc05" d="M3.964 10.707A5.386 5.386 0 0 1 3.68 9c0-.593.1-1.17.284-1.707V4.961H.957A8.997 8.997 0 0 0 0 9c0 1.41.328 2.747.957 3.961l3.007-2.254z" />
              <path fill="#34a853" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.894 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
            </svg>
            Entrar com o Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Barra Superior Premium */}
      <header className="header-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="header-title">Sistema de Gestão</h1>
            <p className="header-subtitle">Controle Clínico e Financeiro</p>
          </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', background: 'rgba(255,255,255,0.08)', padding: '0.25rem 0.5rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'white', marginRight: '0.25rem' }}>Período:</span>
                <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} style={{ minWidth: '90px', background: 'transparent', border: 'none', color: 'white', padding: '0.25rem', cursor: 'pointer', outline: 'none' }}>
                  <option value="2025" style={{ color: 'black' }}>2025</option>
                  <option value="2026" style={{ color: 'black' }}>2026</option>
                </select>
                <select className="filter-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ minWidth: '120px', background: 'transparent', border: 'none', color: 'white', padding: '0.25rem', cursor: 'pointer', outline: 'none' }}>
                  <option value="" style={{ color: 'black' }}>Ano Inteiro</option>
                  <option value="JANEIRO" style={{ color: 'black' }}>Janeiro</option>
                  <option value="FEVEREIRO" style={{ color: 'black' }}>Fevereiro</option>
                  <option value="MARÇO" style={{ color: 'black' }}>Março</option>
                  <option value="ABRIL" style={{ color: 'black' }}>Abril</option>
                  <option value="MAIO" style={{ color: 'black' }}>Maio</option>
                  <option value="JUNHO" style={{ color: 'black' }}>Junho</option>
                  <option value="JULHO" style={{ color: 'black' }}>Julho</option>
                  <option value="AGOSTO" style={{ color: 'black' }}>Agosto</option>
                  <option value="SETEMBRO" style={{ color: 'black' }}>Setembro</option>
                  <option value="OUTUBRO" style={{ color: 'black' }}>Outubro</option>
                  <option value="NOVEMBRO" style={{ color: 'black' }}>Novembro</option>
                  <option value="DEZEMBRO" style={{ color: 'black' }}>Dezembro</option>
                </select>
              </div>
              <Button variant="primary" onClick={() => handleOpenPatientModal()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Plus size={16} /> Novo Analisando
              </Button>
              <Button variant="success" onClick={() => handleOpenSessionModal()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Plus size={16} /> Registrar Sessão
              </Button>
              <button
                type="button"
                onClick={() => setHideValues(prev => !prev)}
                style={{
                  background: hideValues ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${hideValues ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'}`,
                  color: hideValues ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.8)',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'var(--transition-smooth)',
                  fontFamily: 'inherit'
                }}
                title={hideValues ? "Exibir valores financeiros" : "Ocultar valores financeiros"}
              >
                {hideValues ? <Eye size={14} /> : <EyeOff size={14} />}
                {hideValues ? 'Exibir Valores' : ''}
              </button>
              {user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.08)', padding: '0.25rem 0.75rem 0.25rem 0.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)' }} />
                  ) : (
                    <span style={{ fontSize: '1.2rem', padding: '0.2rem' }}>👤</span>
                  )}
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'white', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
                    {user.displayName?.split(' ')[0]}
                  </span>
                  {!googleAccessToken && (
                    <button
                      onClick={handleLoginWithGoogle}
                      style={{
                        background: 'rgba(56, 189, 248, 0.2)',
                        border: '1px solid var(--accent-primary)',
                        color: 'var(--accent-primary)',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        marginRight: '0.5rem'
                      }}
                      title="Seu token do Google Agenda expirou. Clique para reconectar."
                    >
                      Reconectar Agenda
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-danger)',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                  >
                    Sair <LogOut size={12} />
                  </button>
                </div>
              )}
            </div>
        </div>
      </header>

      <div className="container">
        {/* Sistema de Abas (Tabs) */}
            <nav className="tab-navigation">
              <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <LayoutDashboard size={16} /> Dashboard
              </button>
              <button className={`tab-btn ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={16} /> Analisandos ({patients.length})
              </button>
              <button className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Banknote size={16} /> Faturamento
              </button>
              <button className={`tab-btn ${activeTab === 'transfers' ? 'active' : ''}`} onClick={() => setActiveTab('transfers')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Landmark size={16} /> Repasses
              </button>
            </nav>

            {errorMsg && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{errorMsg}</span>
                <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
              </div>
            )}

            {/* ABA 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <DashboardTab
                hideValues={hideValues}
                totalMetrics={totalMetrics}
                rentTotalPaid={presencialTotalRentPaid}
                patients={patients}
                upcomingSessions={upcomingSessions}
                loadingUpcomingSessions={loadingUpcomingSessions}
                loadingSessions={loadingSessions}
                zenklubTotalFaturado={zenklubTotalFaturado}
                weekSessionsToReceive={weekSessionsToReceive}
                weekSessionsTotal={weekSessionsTotal}
                formatCurrency={formatCurrency}
                zenklubSessionsForDetail={zenklubSessionsForDetail}
                zenklubCyclePeriodLabel={zenklubCyclePeriodLabel}
                selectedMonth={selectedMonth}
                previousMonthName={previousMonthName}
                salarioLiquidoPrevisto={salarioLiquidoPrevisto}
                salarioLiquidoRecebido={salarioLiquidoRecebido}
                salaryTotalRepasses={salaryTotalRepasses}
                annualBruto={annualBruto}
                annualLiquido={annualLiquido}
                salaryMonth={salaryMonth}
                selectedYear={selectedYear}
                sessions={allSessions}
                displayInvoices={displayInvoices.filter(inv => inv.id !== 'virtual-zenklub-invoice')}
                onSelectPatientByName={(name) => {
                  const pat = patients.find(p => p.name === name);
                  if (pat) {
                    setSelectedPatientForDashboard(pat);
                    setActiveTab('patients');
                  }
                }}
              />
            )}

            {/* ABA 2: PACIENTES (CRUD) */}
            {activeTab === 'patients' && (
              selectedPatientForDashboard ? (
                <PatientDashboard
                  hideValues={hideValues}
                  selectedPatient={selectedPatientForDashboard}
                  onBack={() => setSelectedPatientForDashboard(null)}
                  patientDashboardSessions={patientDashboardSessions}
                  loadingDashboardSessions={loadingDashboardSessions}
                  handleQuickUpdatePatientStatus={handleQuickUpdatePatientStatus}
                  generalPhoneText={generalPhoneText}
                  setGeneralPhoneText={setGeneralPhoneText}
                  generalEmailText={generalEmailText}
                  setGeneralEmailText={setGeneralEmailText}
                  generalDefaultRate={generalDefaultRate}
                  setGeneralDefaultRate={setGeneralDefaultRate}
                  generalNotesText={generalNotesText}
                  setGeneralNotesText={setGeneralNotesText}
                  generalOriginText={generalOriginText}
                  setGeneralOriginText={setGeneralOriginText}
                  handleSaveGeneralPatientDetails={handleSaveGeneralPatientDetails}
                  savingNotes={savingNotes}
                  handleOpenSessionModal={handleOpenSessionModal}
                  handleDeleteSession={handleDeleteSession}
                  formatCurrency={formatCurrency}
                  handleUpdatePatientReadjustments={handleUpdatePatientReadjustments}
                  handleToggleSessionPaymentStatus={handleToggleSessionPaymentStatus}
                  handleToggleSessionCancellation={handleToggleSessionCancellation}
                  handleToggleSessionCharge={handleToggleSessionCharge}
                  handleUpdateSessionValue={handleUpdateSessionValue}
                  handleUpdateSessionNotes={handleUpdateSessionNotes}
                  handleUpdateSessionDate={handleUpdateSessionDate}
                  handleUpdateSessionModality={handleUpdateSessionModality}
                  handleUpdateSessionPatientType={handleUpdateSessionPatientType}
                  showConfirm={showConfirm}
                />
              ) : (
                <PatientsTab
                  hideValues={hideValues}
                  patients={patients}
                  loadingPatients={loadingPatients}
                  patientStatusFilterTab={patientStatusFilterTab}
                  setPatientStatusFilterTab={setPatientStatusFilterTab}
                  onSelectPatient={setSelectedPatientForDashboard}
                  onEditPatient={handleOpenPatientModal}
                  onDeletePatient={handleDeletePatient}
                  onAddPatient={() => handleOpenPatientModal()}
                  formatCurrency={formatCurrency}
                />
              )
            )}

            

            {/* ABA 4: FATURAMENTO */}
            {activeTab === 'invoices' && (
              <InvoicesTab
                hideValues={hideValues}
                handleOpenInvoiceModal={handleOpenInvoiceModal}
                invoiceFilters={invoiceFilters}
                setInvoiceFilters={setInvoiceFilters}
                totalMetrics={totalMetrics}
                invoices={displayInvoices.filter(inv => inv.id !== 'virtual-zenklub-invoice')}
                sessions={allSessions}
                patients={patients}
                loadingInvoices={loadingInvoices}
                handleQuickPayInvoice={handleQuickPayInvoice}
                handleDeleteInvoice={handleDeleteInvoice}
                hasMoreInvoices={hasMoreInvoices}
                loadInvoicesData={loadInvoicesData}
                lastInvoiceDoc={lastInvoiceDoc}
                formatCurrency={formatCurrency}
              />
            )}


            {/* ABA 6: REPASSES & SUPERVISÃO */}
            {activeTab === 'transfers' && (
              <TransfersTab
                hideValues={hideValues}
                selectedMonth={selectedMonth}
                integrandoTotalRepasse={integrandoTotalRepasse}
                integrandoTotalSessions={integrandoTotalSessions}
                integrandoTotalGross={integrandoTotalGross}
                integrandoRows={integrandoRows}
                presencialTotalRent={presencialTotalRent}
                presencialTotalSessions={presencialTotalSessions}
                presencialTotalNet={presencialTotalNet}
                presencialRows={presencialRows}
                privateRows={privateRows}
                privateTotalSessions={privateTotalSessions}
                privateTotalSupervision={privateTotalSupervision}
                privateTotalNet={privateTotalNet}
                numSupervisions={numSupervisions}
                setNumSupervisions={setNumSupervisions}
                costPerSupervision={costPerSupervision}
                setSessionCostPerSupervision={setCostPerSupervision}
                supervisionTarget={supervisionTarget}
                privateActivePatientsCount={privateActivePatients.length}
                privateSessionsCount={privateSessionsCount}
                suggestedSavePerSession={suggestedSavePerSession}
                suggestedSavePerPatientMonthly={suggestedSavePerPatientMonthly}
                suggestedSavePerSessionAssumingFour={suggestedSavePerSessionAssumingFour}
                formatCurrency={formatCurrency}
                onToggleRentCancelled={handleToggleSessionRentCancelled}
                onToggleRentPaid={handleToggleSessionRentPaid}
              />
            )}
      </div>

      {/* ==========================================
          SISTEMA DE MODAIS (COMPONENTES MODULARES)
          ========================================== */}
      <PatientModal
        isOpen={showPatientModal}
        onClose={() => setShowPatientModal(false)}
        onSubmit={handleSavePatient}
        patientForm={patientForm}
        setPatientForm={setPatientForm as any}
        isEditing={!!editingPatient}
      />

      <SessionModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onSubmit={handleSaveSession}
        sessionForm={sessionForm}
        setSessionForm={setSessionForm as any}
        patients={patients}
        isEditing={!!editingSession}
        onPatientChange={handleSessionPatientChange}
      />

      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        onSubmit={handleSaveInvoice}
        invoiceForm={invoiceForm}
        setInvoiceForm={setInvoiceForm as any}
        patients={patients}
        isEditing={!!editingInvoice}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        isAlert={confirmModal.isAlert}
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel || (() => setConfirmModal(prev => ({ ...prev, isOpen: false })))}
      />
    </div>
  );
}
