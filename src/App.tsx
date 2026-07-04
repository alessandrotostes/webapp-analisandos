import { useState, useEffect, useCallback } from 'react';
import {
  isDatabaseSeeded,
  getPatients,
  addPatient,
  updatePatient,
  deletePatient,
  getInvoices,
  addInvoice,
  updateInvoice,
  deleteInvoice,
  getSessions,
  addSession,
  updateSession,
  deleteSession,
  getRentLogs,
  getUpcomingSessions
} from './services/firebase/firestoreService';
import { Button } from './components/ui/Button';
import type { Invoice, RentLog, Session, Patient, RateReadjustment } from './types';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from './config/firebase-config';

// Importações dos Componentes Refatorados (Modulares e Responsivos)
import { PatientModal } from './components/modals/PatientModal';
import { SessionModal } from './components/modals/SessionModal';
import { InvoiceModal } from './components/modals/InvoiceModal';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { PatientsTab } from './components/patients/PatientsTab';
import { PatientDashboard } from './components/patients/PatientDashboard';
import { SessionsTab } from './components/sessions/SessionsTab';
import { InvoicesTab } from './components/invoices/InvoicesTab';
import { RentTab } from './components/rent/RentTab';
import { TransfersTab } from './components/transfers/TransfersTab';

// Utilitário para formatar moeda brasileira
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val);
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'sessions' | 'invoices' | 'rent' | 'transfers'>(() => {
    return (localStorage.getItem('active_tab') as any) || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('active_tab', activeTab);
  }, [activeTab]);
  const [databaseSeeded, setDatabaseSeeded] = useState<boolean | null>(null);

  // States de Autenticação e Google Agenda
  const [user, setUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(localStorage.getItem('google_access_token'));
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Monitoramento de estado de login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
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
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        localStorage.setItem('google_access_token', token);
        setGoogleAccessToken(token);
      }
      alert(`Olá, ${result.user.displayName}! Login efetuado e Google Agenda conectado com sucesso!`);
    } catch (err: any) {
      setErrorMsg("Erro ao fazer login com o Google: " + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('google_access_token');
      setGoogleAccessToken(null);
      alert("Logout efetuado com sucesso.");
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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rentLogs, setRentLogs] = useState<RentLog[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);

  // Loading & Errors
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingUpcomingSessions, setLoadingUpcomingSessions] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingRent, setLoadingRent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination for Invoices/Sessions
  const [invoicePageSize] = useState(15);
  const [lastInvoiceDoc, setLastInvoiceDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreInvoices, setHasMoreInvoices] = useState(true);

  const [sessionPageSize] = useState(20);
  const [lastSessionDoc, setLastSessionDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreSessions, setHasMoreSessions] = useState(true);

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
  const [sessionFilters, setSessionFilters] = useState({ patientName: '', modality: '' });

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
    modality: 'particular',
    sessionValue: 150,
    isPaid: false
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
  const [selectedSessionForNotes, setSelectedSessionForNotes] = useState<Session | null>(null);
  const [sessionNotesText, setSessionNotesText] = useState('');
  const [generalNotesText, setGeneralNotesText] = useState('');
  const [generalPhoneText, setGeneralPhoneText] = useState('');
  const [generalEmailText, setGeneralEmailText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // States para Repasses & Supervisão e Abas de Pacientes
  const [patientStatusFilterTab, setPatientStatusFilterTab] = useState<'active' | 'paused' | 'ended'>('active');

  const [allSessionsForSelectedMonth, setAllSessionsForSelectedMonth] = useState<Session[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [numSupervisions, setNumSupervisions] = useState(2);
  const [costPerSupervision, setCostPerSupervision] = useState(180);

  const loadAllSessionsForSelectedMonth = useCallback(async () => {
    try {
      const monthNum = selectedMonth ? {
        'JANEIRO': '01', 'FEVEREIRO': '02', 'MARÇO': '03', 'ABRIL': '04',
        'MAIO': '05', 'JUNHO': '06', 'JULHO': '07', 'AGOSTO': '08',
        'SETEMBRO': '09', 'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12'
      }[selectedMonth] : null;

      // Busca todas as sessões para filtro local (limite de 2000)
      const result = await getSessions({
        pageSize: 2000
      });
      
      setAllSessions(result.data);

      const filtered = result.data.filter(s => {
        const [yearStr, monthStr] = s.date.split('-');
        const yearMatches = Number(yearStr) === selectedYear;
        const monthMatches = monthNum ? monthStr === monthNum : true;
        return yearMatches && monthMatches;
      });

      setAllSessionsForSelectedMonth(filtered);
    } catch (err: any) {
      console.error("Erro ao carregar sessões para repasses:", err);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (databaseSeeded) {
      loadAllSessionsForSelectedMonth();
    }
  }, [selectedYear, selectedMonth, databaseSeeded, loadAllSessionsForSelectedMonth]);

  const loadPatientDashboardSessions = useCallback(async (patientName: string) => {
    setLoadingDashboardSessions(true);
    try {
      const result = await getSessions({
        patientName,
        pageSize: 100
      });
      setPatientDashboardSessions(result.data);
      if (result.data.length > 0) {
        setSelectedSessionForNotes(result.data[0]);
        setSessionNotesText(result.data[0].notes || '');
      } else {
        setSelectedSessionForNotes(null);
        setSessionNotesText('');
      }
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
    } else {
      setPatientDashboardSessions([]);
      setSelectedSessionForNotes(null);
      setSessionNotesText('');
    }
  }, [selectedPatientForDashboard, loadPatientDashboardSessions]);

  const handleSaveSessionNotes = async () => {
    if (!selectedSessionForNotes?.id) return;
    setSavingNotes(true);
    try {
      await updateSession(selectedSessionForNotes.id, {
        notes: sessionNotesText
      });
      setPatientDashboardSessions(prev =>
        prev.map(s => s.id === selectedSessionForNotes.id ? { ...s, notes: sessionNotesText } : s)
      );
      setSelectedSessionForNotes(prev => prev ? { ...prev, notes: sessionNotesText } : null);
      alert("Anotações de evolução salvas com sucesso!");
    } catch (err: any) {
      setErrorMsg("Erro ao salvar anotações: " + err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveGeneralPatientDetails = async () => {
    if (!selectedPatientForDashboard?.id) return;
    setSavingNotes(true);
    try {
      const updates = {
        notes: generalNotesText,
        phone: generalPhoneText,
        email: generalEmailText
      };
      await updatePatient(selectedPatientForDashboard.id, updates);
      setSelectedPatientForDashboard(prev => prev ? { ...prev, ...updates } : null);
      loadPatientsData();
      alert("Ficha do analisando atualizada com sucesso!");
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

  const loadSessionsData = useCallback(async (isLoadMore = false, startAfterDoc?: QueryDocumentSnapshot<DocumentData> | null) => {
    setLoadingSessions(true);
    try {
      const searchName = sessionFilters.patientName.trim();
      let patientQuery: string | string[] | undefined = undefined;

      if (searchName) {
        const matchingNames = patients
          .filter(p => p.name.toLowerCase().includes(searchName.toLowerCase()))
          .map(p => p.name);
        patientQuery = matchingNames;
      }

      const hasFilter = !!searchName || !!sessionFilters.modality;

      const result = await getSessions({
        patientName: patientQuery,
        modality: sessionFilters.modality || undefined,
        pageSize: hasFilter ? 1000 : sessionPageSize,
        lastVisible: isLoadMore ? (startAfterDoc || undefined) : undefined
      });

      if (isLoadMore) {
        setSessions((prev) => [...prev, ...result.data]);
      } else {
        setSessions(result.data);
      }

      setLastSessionDoc(result.lastDoc);
      setHasMoreSessions(hasFilter ? false : result.data.length === sessionPageSize);
    } catch (err: any) {
      setErrorMsg("Erro ao buscar sessões: " + err.message);
    } finally {
      setLoadingSessions(false);
    }
  }, [sessionFilters.patientName, sessionFilters.modality, patients, sessionPageSize]);

  const loadRentData = useCallback(async () => {
    setLoadingRent(true);
    try {
      const data = await getRentLogs();
      setRentLogs(data);
    } catch (err: any) {
      setErrorMsg("Erro ao buscar logs de aluguel: " + err.message);
    } finally {
      setLoadingRent(false);
    }
  }, []);

  // Verifica se o DB já possui dados no carregamento inicial
  useEffect(() => {
    isDatabaseSeeded()
      .then((seeded) => {
        setDatabaseSeeded(seeded);
      })
      .catch((err) => {
        console.error("Erro na verificação de seed:", err);
        setDatabaseSeeded(false);
      });
  }, []);

  // Inicializa dados e escuta mudanças no seed
  useEffect(() => {
    if (databaseSeeded) {
      loadPatientsData();
      loadRentData();
      loadUpcomingSessionsData();
    }
  }, [databaseSeeded, loadPatientsData, loadRentData, loadUpcomingSessionsData]);

  // Recarrega dados com alterações nos filtros
  useEffect(() => {
    if (databaseSeeded) {
      loadInvoicesData(false, null);
    }
  }, [selectedYear, selectedMonth, invoiceFilters.patientName, databaseSeeded, loadInvoicesData]);

  useEffect(() => {
    if (databaseSeeded) {
      loadSessionsData(false, null);
    }
  }, [sessionFilters.patientName, sessionFilters.modality, databaseSeeded, loadSessionsData]);

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
        await updatePatient(editingPatient.id, patientForm);
      } else {
        await addPatient(patientForm as Patient);
      }
      setShowPatientModal(false);
      loadPatientsData();
    } catch (err: any) {
      setErrorMsg("Erro ao salvar analisando: " + err.message);
    }
  };

  const handleDeletePatient = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este analisando? Todos os atendimentos futuros precisarão ser gerenciados manualmente.")) return;
    try {
      await deletePatient(id);
      loadPatientsData();
    } catch (err: any) {
      setErrorMsg("Erro ao excluir analisando: " + err.message);
    }
  };

  // ==========================================
  // OPERAÇÕES CRUD - SESSIONS (SESSÕES)
  // ==========================================

  const handleOpenSessionModal = (session?: Session) => {
    if (session) {
      setEditingSession(session);
      setSessionForm({
        patientName: session.patientName,
        date: session.date,
        paymentInfo: session.paymentInfo || '',
        duration: session.duration,
        modality: session.modality,
        sessionValue: session.sessionValue !== undefined ? session.sessionValue : 0,
        isPaid: session.isPaid !== undefined ? session.isPaid : false
      });
    } else {
      const firstPat = patients[0];
      setEditingSession(null);
      setSessionForm({
        patientName: firstPat?.name || '',
        date: new Date().toISOString().split('T')[0],
        paymentInfo: '',
        duration: 1.0,
        modality: firstPat?.origin || 'particular',
        sessionValue: firstPat?.defaultRate || 150,
        isPaid: false
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
      modality: matched ? matched.origin : 'particular',
      sessionValue: matched ? matched.defaultRate : 150
    }));
  };

  const [syncingGoogleCalendar, setSyncingGoogleCalendar] = useState(false);

  const handleSyncFromGoogleCalendar = async () => {
    if (!googleAccessToken) {
      alert("Por favor, faça login com o Google para conectar sua agenda.");
      return;
    }
    
    setSyncingGoogleCalendar(true);
    try {
      const monthNumMap: Record<string, string> = {
        'JANEIRO': '01', 'FEVEREIRO': '02', 'MARÇO': '03', 'ABRIL': '04',
        'MAIO': '05', 'JUNHO': '06', 'JULHO': '07', 'AGOSTO': '08',
        'SETEMBRO': '09', 'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12'
      };
      
      let timeMin = `${selectedYear}-01-01T00:00:00Z`;
      let timeMax = `${selectedYear}-12-31T23:59:59Z`;
      
      if (selectedMonth) {
        const mNum = monthNumMap[selectedMonth];
        timeMin = `${selectedYear}-${mNum}-01T00:00:00Z`;
        const lastDay = new Date(selectedYear, Number(mNum), 0).getDate();
        timeMax = `${selectedYear}-${mNum}-${lastDay}T23:59:59Z`;
      }
      
      // showDeleted=true para detectar eventos cancelados no Google
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&showDeleted=true`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Token expirado. Por favor, saia e faça login novamente.");
        }
        throw new Error("Falha ao buscar eventos do Google Agenda.");
      }
      
      const calendarData = await response.json();
      const events = calendarData.items || [];
      
      // Busca todas as sessões existentes para comparação
      const existingSessionsResult = await getSessions({ pageSize: 1000 });
      const existingSessions = existingSessionsResult.data;
      
      let importedCount = 0;
      let updatedCount = 0;
      let removedCount = 0;
      
      for (const ev of events) {
        const summary = ev.summary || '';
        const eventId = ev.id;
        
        // ── EVENTO CANCELADO? Remove a sessão vinculada ──
        if (ev.status === 'cancelled') {
          const linkedSession = existingSessions.find(s => s.googleEventId === eventId);
          if (linkedSession?.id) {
            await deleteSession(linkedSession.id);
            removedCount++;
          }
          continue;
        }
        
        // ── Filtro: apenas eventos com prefixo "Sessão:" ──
        if (!summary.toLowerCase().startsWith('sessão:') && !summary.toLowerCase().startsWith('sessao:')) {
          continue;
        }
        
        const rawPatientName = summary.replace(/^[Ss]ess[ãa]o:\s*/, '').trim();
        const matchedPatient = patients.find(p => 
          p.name.toLowerCase() === rawPatientName.toLowerCase() ||
          p.name.toLowerCase().includes(rawPatientName.toLowerCase())
        );
        
        if (!matchedPatient) continue;
        
        const eventDateStr = ev.start?.dateTime ? ev.start.dateTime.split('T')[0] : ev.start?.date;
        if (!eventDateStr) continue;
        
        const duration = ev.end && ev.start && ev.start.dateTime && ev.end.dateTime
          ? (new Date(ev.end.dateTime).getTime() - new Date(ev.start.dateTime).getTime()) / (1000 * 60 * 60)
          : 1.0;
        const roundedDuration = Number(duration.toFixed(1));
        
        // ── ATUALIZAÇÃO: sessão já vinculada pelo googleEventId ──
        const linkedSession = existingSessions.find(s => s.googleEventId === eventId);
        if (linkedSession?.id) {
          // Verifica se houve mudança na data ou duração
          const dateChanged = linkedSession.date !== eventDateStr;
          const durationChanged = linkedSession.duration !== roundedDuration;
          const nameChanged = linkedSession.patientName !== matchedPatient.name;
          
          if (dateChanged || durationChanged || nameChanged) {
            await updateSession(linkedSession.id, {
              date: eventDateStr,
              duration: roundedDuration,
              patientName: matchedPatient.name
            });
            updatedCount++;
          }
          continue;
        }
        
        // ── DUPLICATA POR PACIENTE+DATA: já existe mas sem vínculo, vincula e atualiza ──
        const existsByDateAndPatient = existingSessions.find(s => 
          s.patientName === matchedPatient.name && s.date === eventDateStr && !s.googleEventId
        );
        if (existsByDateAndPatient?.id) {
          await updateSession(existsByDateAndPatient.id, { 
            googleEventId: eventId,
            duration: roundedDuration
          });
          updatedCount++;
          continue;
        }
        
        // ── CRIAÇÃO: evento novo, não existe no app ──
        const alreadyExistsByDate = existingSessions.some(s => 
          s.patientName === matchedPatient.name && s.date === eventDateStr
        );
        if (!alreadyExistsByDate) {
          const newSession: Session = {
            patientName: matchedPatient.name,
            date: eventDateStr,
            duration: roundedDuration,
            modality: matchedPatient.origin,
            paymentInfo: String(matchedPatient.defaultRate),
            googleEventId: eventId
          };
          
          await addSession(newSession);
          importedCount++;
        }
      }
      
      // Mensagem de resumo
      const parts: string[] = [];
      if (importedCount > 0) parts.push(`${importedCount} novo(s) importado(s)`);
      if (updatedCount > 0) parts.push(`${updatedCount} atualizado(s)`);
      if (removedCount > 0) parts.push(`${removedCount} removido(s)`);
      
      if (parts.length > 0) {
        loadSessionsData(false);
        loadAllSessionsForSelectedMonth();
        loadUpcomingSessionsData();
        alert(`Sincronização concluída!\n${parts.join('\n')}`);
      } else {
        alert("Sincronização concluída. Tudo já está atualizado.");
      }
    } catch (err: any) {
      setErrorMsg("Erro ao sincronizar com Google Agenda: " + err.message);
    } finally {
      setSyncingGoogleCalendar(false);
    }
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionForm.patientName) return;

    try {
      if (editingSession?.id) {
        // EDIÇÃO: atualiza no Firestore e sincroniza com Google Calendar
        await updateSession(editingSession.id, sessionForm as Session);

        // Se a sessão tem um eventId vinculado, atualiza o evento no Google
        if (googleAccessToken && editingSession.googleEventId) {
          await updateGoogleCalendarEvent(editingSession.googleEventId, sessionForm as Session);
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
      }
      setShowSessionModal(false);
      loadSessionsData(false);
      loadAllSessionsForSelectedMonth();
      loadUpcomingSessionsData();
      if (selectedPatientForDashboard) {
        loadPatientDashboardSessions(selectedPatientForDashboard.name);
      }
    } catch (err: any) {
      setErrorMsg("Erro ao salvar sessão: " + err.message);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm("Deseja excluir este registro de sessão?")) return;
    try {
      // Busca a sessão para verificar se tem eventId vinculado ao Google
      const sessionToDelete = sessions.find(s => s.id === id);
      if (sessionToDelete?.googleEventId && googleAccessToken) {
        await deleteGoogleCalendarEvent(sessionToDelete.googleEventId);
      }

      await deleteSession(id);
      loadSessionsData(false);
      loadAllSessionsForSelectedMonth();
      loadUpcomingSessionsData();
      if (selectedPatientForDashboard) {
        loadPatientDashboardSessions(selectedPatientForDashboard.name);
      }
    } catch (err: any) {
      setErrorMsg("Erro ao excluir sessão: " + err.message);
    }
  };

  const handleToggleSessionPaymentStatus = async (session: Session) => {
    if (!session.id) return;
    try {
      const newStatus = !session.isPaid;
      await updateSession(session.id, { isPaid: newStatus });
      
      // Atualiza o estado das sessões no dashboard
      setPatientDashboardSessions(prev =>
        prev.map(s => s.id === session.id ? { ...s, isPaid: newStatus } : s)
      );

      // Atualiza a sessão selecionada para anotações se for a mesma
      if (selectedSessionForNotes?.id === session.id) {
        setSelectedSessionForNotes(prev => prev ? { ...prev, isPaid: newStatus } : null);
      }

      loadSessionsData(false);
      loadAllSessionsForSelectedMonth();
      loadUpcomingSessionsData();
    } catch (err: any) {
      setErrorMsg("Erro ao alterar status de pagamento da sessão: " + err.message);
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
        pendingValue: invoice.pendingValue,
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

      if (editingInvoice?.id) {
        await updateInvoice(editingInvoice.id, completeForm);
      } else {
        await addInvoice(completeForm as Invoice);
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
    } catch (err: any) {
      setErrorMsg("Erro ao atualizar pagamento da fatura: " + err.message);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!window.confirm("Deseja excluir esta fatura?")) return;
    try {
      await deleteInvoice(id);
      loadInvoicesData(false);
    } catch (err: any) {
      setErrorMsg("Erro ao excluir fatura: " + err.message);
    }
  };

  // ==========================================
  // METRICAS FINANCEIRAS
  // ==========================================
  
  // Encontra a data da última sessão de um paciente
  const getPatientLastSessionDate = (patientName: string) => {
    const pSessions = allSessions.filter(s => s.patientName === patientName);
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

  // Faturamento Geral (Incluso ativos, e inativos até o mês da última sessão)
  const totalMetrics = invoices
    .filter(inv => isInvoiceValidForPatientStatus(inv))
    .reduce(
      (acc, curr) => {
        acc.faturado += curr.value;
        acc.recebido += curr.paidValue;
        acc.pendente += curr.pendingValue;
        return acc;
      },
      { faturado: 0, recebido: 0, pendente: 0 }
    );

  // Custo de Consultório
  const rentTotalPaid = rentLogs.reduce((sum, log) => sum + log.valuePaid, 0);

  // Cálculos para Repasse Integrando Ser (Engloba pausados/encerrados)
  const integrandoPatients = patients.filter(p => p.origin === 'integrando_ser');
  const integrandoRows = integrandoPatients.map(p => {
    const pSessions = allSessionsForSelectedMonth.filter(s => s.patientName === p.name);
    const sessionsCount = pSessions.length;
    const rate = p.defaultRate;
    const gross = sessionsCount * rate;
    const repasse = gross * 0.25;
    return {
      name: p.name,
      sessionsCount,
      rate,
      gross,
      repasse
    };
  }).filter(r => r.sessionsCount > 0); // Exibe apenas se teve sessão no mês
  
  const integrandoTotalSessions = integrandoRows.reduce((sum, r) => sum + r.sessionsCount, 0);
  const integrandoTotalGross = integrandoRows.reduce((sum, r) => sum + r.gross, 0);
  const integrandoTotalRepasse = integrandoRows.reduce((sum, r) => sum + r.repasse, 0);

  // Cálculos para Repasse Consultório (Presencial - Engloba pausados/encerrados)
  const presencialPatients = patients.filter(p => p.format === 'presencial');
  const presencialRows = presencialPatients.map(p => {
    const pSessions = allSessionsForSelectedMonth.filter(s => s.patientName === p.name);
    const sessionsCount = pSessions.length;
    const rate = p.defaultRate;
    const gross = sessionsCount * rate;
    const rent = sessionsCount * 30.00;
    const netRate = rate - 30.00;
    const netTotal = sessionsCount * netRate;
    return {
      name: p.name,
      sessionsCount,
      rate,
      gross,
      rent,
      netRate,
      netTotal
    };
  }).filter(r => r.sessionsCount > 0); // Exibe apenas se teve sessão no mês
  
  const presencialTotalSessions = presencialRows.reduce((sum, r) => sum + r.sessionsCount, 0);
  const presencialTotalRent = presencialRows.reduce((sum, r) => sum + r.rent, 0);
  const presencialTotalNet = presencialRows.reduce((sum, r) => sum + r.netTotal, 0);

  // Metas de Supervisão
  const supervisionTarget = numSupervisions * costPerSupervision;
  const privateActivePatients = patients.filter(p => p.origin === 'particular' && p.status === 'active');
  const privateSessions = allSessionsForSelectedMonth.filter(s => {
    const p = patients.find(pat => pat.name === s.patientName);
    return p?.origin === 'particular' && p?.status === 'active';
  });
  const privateSessionsCount = privateSessions.length;
  const suggestedSavePerSession = privateSessionsCount > 0 ? (supervisionTarget / privateSessionsCount) : 0;
  const suggestedSavePerPatientMonthly = privateActivePatients.length > 0 ? (supervisionTarget / privateActivePatients.length) : 0;
  const suggestedSavePerSessionAssumingFour = privateActivePatients.length > 0 ? (supervisionTarget / privateActivePatients.length / 4) : 0;

  // Faturamento Zenklub de acordo com ciclo de faturamento (24 do mês anterior a 23 do atual)
  const getZenklubTotalFaturado = () => {
    const monthNumMap: Record<string, number> = {
      'JANEIRO': 1, 'FEVEREIRO': 2, 'MARÇO': 3, 'ABRIL': 4,
      'MAIO': 5, 'JUNHO': 6, 'JULHO': 7, 'AGOSTO': 8,
      'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12
    };
    const currMonthIndex = monthNumMap[selectedMonth] || 1;
    let prevMonthIndex = currMonthIndex - 1;
    let prevYear = selectedYear;
    if (prevMonthIndex === 0) {
      prevMonthIndex = 12;
      prevYear = selectedYear - 1;
    }
    const prevMonthStr = String(prevMonthIndex).padStart(2, '0');
    const currMonthStr = String(currMonthIndex).padStart(2, '0');
    
    const startStr = `${prevYear}-${prevMonthStr}-24`;
    const endStr = `${selectedYear}-${currMonthStr}-23`;

    const zenklubPatients = patients.filter(p => p.origin === 'zenklub');
    const zenklubPatientNames = new Set(zenklubPatients.map(p => p.name));

    const zenklubCycleSessions = allSessions.filter(s => {
      return zenklubPatientNames.has(s.patientName) && s.date >= startStr && s.date <= endStr;
    });

    return zenklubCycleSessions.reduce((sum, s) => {
      const p = patients.find(pat => pat.name === s.patientName);
      const rate = p ? p.defaultRate : (Number(s.paymentInfo) || 0);
      return sum + rate;
    }, 0);
  };
  const zenklubTotalFaturado = getZenklubTotalFaturado();

  // Saldo a receber de segunda a sexta da semana atual
  const getWeekSessionsToReceive = () => {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    const diffToMonday = day === 0 ? -6 : 1 - day;
    monday.setDate(today.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayStr}`;
    };

    const monStr = formatDate(monday);
    const friStr = formatDate(friday);

    const weekSess = allSessions.filter(s => s.date >= monStr && s.date <= friStr);

    return weekSess.map(s => {
      const p = patients.find(pat => pat.name === s.patientName);
      const rate = p ? p.defaultRate : (Number(s.paymentInfo) || 150);
      return {
        id: s.id,
        patientName: s.patientName,
        date: s.date,
        value: rate
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
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
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🧠</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, background: 'var(--accent-primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Analisandos Core</h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Prontuário e Controle Clínico-Financeiro Psicanalítico</p>
          </div>
          
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
            Efetue login com sua conta do Google para acessar seus analisandos, histórico financeiro e ativar a sincronização automática de atendimentos no Google Agenda.
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
            <h1 className="header-title">Analisandos Core</h1>
            <p className="header-subtitle">Prontuário e Controle Clínico-Financeiro Psicanalítico</p>
          </div>
          {databaseSeeded && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.5rem', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'white', marginRight: '0.25rem' }}>Período:</span>
                <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} style={{ minWidth: '90px', background: 'transparent', border: 'none', color: 'white', padding: '0.25rem' }}>
                  <option value="2025" style={{ color: 'black' }}>2025</option>
                  <option value="2026" style={{ color: 'black' }}>2026</option>
                </select>
                <select className="filter-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ minWidth: '120px', background: 'transparent', border: 'none', color: 'white', padding: '0.25rem' }}>
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
              <Button variant="primary" onClick={() => handleOpenPatientModal()}>
                + Novo Analisando
              </Button>
              <Button variant="success" onClick={() => handleOpenSessionModal()}>
                + Registrar Sessão
              </Button>
              {user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.08)', padding: '0.25rem 0.75rem 0.25rem 0.25rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)' }} />
                  ) : (
                    <span style={{ fontSize: '1.2rem', padding: '0.2rem' }}>👤</span>
                  )}
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'white', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.displayName?.split(' ')[0]}
                  </span>
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
                      borderRadius: '10px'
                    }}
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="container">
        {/* Aviso de Carga Inicial (Seed) */}
        {databaseSeeded === false && (
          <div className="card" style={{ borderLeft: '5px solid var(--accent-warning)', marginBottom: '2rem' }}>
            <h3 style={{ color: 'var(--accent-warning)', marginBottom: '0.5rem' }}>⚠️ Banco de dados em branco</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              Para popular o seu banco de dados Cloud Firestore no Firebase com o histórico completo das planilhas
              (61 pacientes, faturas, aluguel de consultório e 1074 sessões), execute o seguinte comando na pasta raiz do projeto:
            </p>
            <pre style={{
              background: 'var(--bg-main)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginTop: '0.75rem',
              border: '1px solid var(--border-color)',
              color: 'var(--accent-primary)',
              fontFamily: 'monospace'
            }}>
              yarn seed
            </pre>
            <Button
              variant="secondary"
              onClick={() => {
                isDatabaseSeeded().then((seeded) => {
                  setDatabaseSeeded(seeded);
                  if (seeded) {
                    loadPatientsData();
                    loadInvoicesData();
                    loadSessionsData();
                    loadRentData();
                  }
                });
              }}
              style={{ marginTop: '1rem' }}
            >
              Confirmar Sincronização
            </Button>
          </div>
        )}

        {/* Sistema de Abas (Tabs) */}
        {databaseSeeded === true && (
          <>
            <nav className="tab-navigation">
              <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                📊 Dashboard
              </button>
              <button className={`tab-btn ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>
                👥 Analisandos ({patients.length})
              </button>
              <button className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>
                🗓️ Sessões
              </button>
              <button className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>
                💰 Faturamento
              </button>
              <button className={`tab-btn ${activeTab === 'rent' ? 'active' : ''}`} onClick={() => setActiveTab('rent')}>
                🏢 Aluguel
              </button>
              <button className={`tab-btn ${activeTab === 'transfers' ? 'active' : ''}`} onClick={() => setActiveTab('transfers')}>
                💸 Repasses
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
                totalMetrics={totalMetrics}
                rentTotalPaid={rentTotalPaid}
                patients={patients}
                upcomingSessions={upcomingSessions}
                loadingUpcomingSessions={loadingUpcomingSessions}
                loadingSessions={loadingSessions}
                zenklubTotalFaturado={zenklubTotalFaturado}
                weekSessionsToReceive={weekSessionsToReceive}
                weekSessionsTotal={weekSessionsTotal}
                formatCurrency={formatCurrency}
              />
            )}

            {/* ABA 2: PACIENTES (CRUD) */}
            {activeTab === 'patients' && (
              selectedPatientForDashboard ? (
                <PatientDashboard
                  selectedPatient={selectedPatientForDashboard}
                  onBack={() => setSelectedPatientForDashboard(null)}
                  patientDashboardSessions={patientDashboardSessions}
                  loadingDashboardSessions={loadingDashboardSessions}
                  handleQuickUpdatePatientStatus={handleQuickUpdatePatientStatus}
                  generalPhoneText={generalPhoneText}
                  setGeneralPhoneText={setGeneralPhoneText}
                  generalEmailText={generalEmailText}
                  setGeneralEmailText={setGeneralEmailText}
                  generalNotesText={generalNotesText}
                  setGeneralNotesText={setGeneralNotesText}
                  handleSaveGeneralPatientDetails={handleSaveGeneralPatientDetails}
                  savingNotes={savingNotes}
                  selectedSessionForNotes={selectedSessionForNotes}
                  setSelectedSessionForNotes={setSelectedSessionForNotes}
                  sessionNotesText={sessionNotesText}
                  setSessionNotesText={setSessionNotesText}
                  handleSaveSessionNotes={handleSaveSessionNotes}
                  handleOpenSessionModal={handleOpenSessionModal}
                  handleDeleteSession={handleDeleteSession}
                  formatCurrency={formatCurrency}
                  handleUpdatePatientReadjustments={handleUpdatePatientReadjustments}
                  handleToggleSessionPaymentStatus={handleToggleSessionPaymentStatus}
                />
              ) : (
                <PatientsTab
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

            {/* ABA 3: SESSÕES */}
            {activeTab === 'sessions' && (
              <SessionsTab
                selectedMonth={selectedMonth}
                googleAccessToken={googleAccessToken}
                handleSyncFromGoogleCalendar={handleSyncFromGoogleCalendar}
                syncingGoogleCalendar={syncingGoogleCalendar}
                handleOpenSessionModal={handleOpenSessionModal}
                sessionFilters={sessionFilters}
                setSessionFilters={setSessionFilters}
                sessions={sessions}
                loadingSessions={loadingSessions}
                handleDeleteSession={handleDeleteSession}
                hasMoreSessions={hasMoreSessions}
                loadSessionsData={loadSessionsData}
                lastSessionDoc={lastSessionDoc}
              />
            )}

            {/* ABA 4: FATURAMENTO */}
            {activeTab === 'invoices' && (
              <InvoicesTab
                handleOpenInvoiceModal={handleOpenInvoiceModal}
                invoiceFilters={invoiceFilters}
                setInvoiceFilters={setInvoiceFilters}
                totalMetrics={totalMetrics}
                invoices={invoices}
                sessions={allSessions}
                loadingInvoices={loadingInvoices}
                handleQuickPayInvoice={handleQuickPayInvoice}
                handleDeleteInvoice={handleDeleteInvoice}
                hasMoreInvoices={hasMoreInvoices}
                loadInvoicesData={loadInvoicesData}
                lastInvoiceDoc={lastInvoiceDoc}
                formatCurrency={formatCurrency}
              />
            )}

            {/* ABA 5: ALUGUEL */}
            {activeTab === 'rent' && (
              <RentTab
                rentLogs={rentLogs}
                loadingRent={loadingRent}
                formatCurrency={formatCurrency}
              />
            )}

            {/* ABA 6: REPASSES & SUPERVISÃO */}
            {activeTab === 'transfers' && (
              <TransfersTab
                selectedMonth={selectedMonth}
                integrandoTotalRepasse={integrandoTotalRepasse}
                integrandoTotalSessions={integrandoTotalSessions}
                integrandoTotalGross={integrandoTotalGross}
                integrandoRows={integrandoRows}
                presencialTotalRent={presencialTotalRent}
                presencialTotalSessions={presencialTotalSessions}
                presencialTotalNet={presencialTotalNet}
                presencialRows={presencialRows}
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
              />
            )}
          </>
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
    </div>
  );
}
