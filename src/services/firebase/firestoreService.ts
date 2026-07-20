import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  startAfter
} from 'firebase/firestore';
import type {
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../../config/firebase-config';
import type { Invoice, RentLog, Session, Patient } from '../../types';

// ==========================================
// SERVIÇO GERAL DE SEED (CARGA INICIAL)
// ==========================================

export async function isDatabaseSeeded(): Promise<boolean> {
  const invoicesRef = collection(db, 'invoices');
  const q = query(invoicesRef, limit(1));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

export async function seedCollectionInBatches<T extends DocumentData>(
  collectionName: string,
  dataList: T[]
): Promise<void> {
  if (dataList.length === 0) return;

  const BATCH_LIMIT = 450;
  let batch = writeBatch(db);
  let count = 0;

  for (const item of dataList) {
    const docRef = doc(collection(db, collectionName));
    batch.set(docRef, item);
    count++;

    if (count >= BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }
}

// ==========================================
// SERVIÇOS DE PACIENTES (PATIENTS - CRUD)
// ==========================================

export async function getPatients(): Promise<Patient[]> {
  const patientsRef = collection(db, 'patients');
  const q = query(patientsRef, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...(docSnapshot.data() as Omit<Patient, 'id'>)
  }));
}

export async function addPatient(patient: Patient): Promise<string> {
  const patientsRef = collection(db, 'patients');
  const docRef = await addDoc(patientsRef, patient);
  return docRef.id;
}

export async function updatePatient(id: string, updates: Partial<Patient>): Promise<void> {
  const docRef = doc(db, 'patients', id);
  await updateDoc(docRef, updates as DocumentData);
}

export async function deletePatient(id: string): Promise<void> {
  const docRef = doc(db, 'patients', id);
  await deleteDoc(docRef);
}

// Propaga a alteração de nome do paciente para sessões e faturas relacionadas
export async function updatePatientNameInRelatedDocs(
  oldName: string,
  newName: string
): Promise<void> {
  if (oldName === newName) return;

  const BATCH_LIMIT = 450;
  let batch = writeBatch(db);
  let count = 0;

  // Atualiza sessões com o nome antigo
  const sessionsRef = collection(db, 'sessions');
  const sessionsQuery = query(sessionsRef, where('patientName', '==', oldName));
  const sessionsSnapshot = await getDocs(sessionsQuery);

  for (const docSnapshot of sessionsSnapshot.docs) {
    batch.update(docSnapshot.ref, { patientName: newName });
    count++;
    if (count >= BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }

  // Atualiza faturas com o nome antigo
  const invoicesRef = collection(db, 'invoices');
  const invoicesQuery = query(invoicesRef, where('patientName', '==', oldName));
  const invoicesSnapshot = await getDocs(invoicesQuery);

  for (const docSnapshot of invoicesSnapshot.docs) {
    batch.update(docSnapshot.ref, { patientName: newName });
    count++;
    if (count >= BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }
}

// ==========================================
// SERVIÇOS DE FATURAS (INVOICES - CRUD)
// ==========================================

export interface GetInvoicesParams {
  year?: number;
  month?: string;
  patientName?: string | string[];
  pageSize?: number;
  lastVisible?: QueryDocumentSnapshot<DocumentData>;
}

export async function getInvoices({
  year,
  month,
  patientName,
  pageSize = 20,
  lastVisible
}: GetInvoicesParams = {}) {
  const invoicesRef = collection(db, 'invoices');
  const constraints: any[] = [];

  const isSearch = !!patientName;

  if (year && !isSearch) constraints.push(where('year', '==', year));
  if (month && !isSearch) constraints.push(where('month', '==', month));
  
  if (patientName) {
    if (Array.isArray(patientName)) {
      if (patientName.length > 0) {
        constraints.push(where('patientName', 'in', patientName));
      } else {
        constraints.push(where('patientName', '==', '__non_existent__'));
      }
    } else {
      constraints.push(where('patientName', '==', patientName));
    }
  }

  // Se for busca por paciente, fazemos ordenação na memória para evitar a exigência de índices compostos dinâmicos no Firestore
  if (!isSearch) {
    constraints.push(orderBy('year', 'desc'));
    constraints.push(orderBy('invoiceNumber', 'asc'));
    if (lastVisible) {
      constraints.push(startAfter(lastVisible));
    }
    constraints.push(limit(pageSize));
  } else {
    // Busca traz todos os registros correspondentes para filtrar na memória sem paginação
    constraints.push(limit(500));
  }

  const q = query(invoicesRef, ...constraints);
  const snapshot = await getDocs(q);

  let data = snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...(docSnapshot.data() as Omit<Invoice, 'id'>)
  }));

  if (isSearch) {
    // Ordena por ano descendente, e depois por número de fatura crescente
    data.sort((a, b) => {
      if (b.year !== a.year) {
        return b.year - a.year;
      }
      return a.invoiceNumber - b.invoiceNumber;
    });
  }

  return {
    data,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    empty: snapshot.empty
  };
}

export async function addInvoice(invoice: Invoice): Promise<string> {
  const invoicesRef = collection(db, 'invoices');
  const docRef = await addDoc(invoicesRef, invoice);
  return docRef.id;
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<void> {
  const docRef = doc(db, 'invoices', id);
  await updateDoc(docRef, updates as DocumentData);
}

export async function deleteInvoice(id: string): Promise<void> {
  const docRef = doc(db, 'invoices', id);
  await deleteDoc(docRef);
}

// ==========================================
// SERVIÇOS DE SESSÕES (SESSIONS - CRUD)
// ==========================================

export interface GetSessionsParams {
  patientName?: string | string[];
  modality?: string;
  pageSize?: number;
  lastVisible?: QueryDocumentSnapshot<DocumentData>;
}

export async function getSessions({
  patientName,
  modality,
  pageSize = 30,
  lastVisible
}: GetSessionsParams = {}) {
  const sessionsRef = collection(db, 'sessions');
  const constraints: any[] = [];

  const isSearch = !!patientName;

  if (patientName) {
    if (Array.isArray(patientName)) {
      if (patientName.length > 0) {
        constraints.push(where('patientName', 'in', patientName));
      } else {
        constraints.push(where('patientName', '==', '__non_existent__'));
      }
    } else {
      constraints.push(where('patientName', '==', patientName));
    }
  }
  if (modality) constraints.push(where('modality', '==', modality));

  if (!isSearch) {
    constraints.push(orderBy('date', 'desc'));
    if (lastVisible) {
      constraints.push(startAfter(lastVisible));
    }
    constraints.push(limit(pageSize));
  } else {
    // Se for busca, traz tudo correspondente sem limite estrito para que apareça tudo na tela
    constraints.push(limit(1000));
  }

  const q = query(sessionsRef, ...constraints);
  const snapshot = await getDocs(q);

  let data = snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...(docSnapshot.data() as Omit<Session, 'id'>)
  }));

  if (isSearch) {
    // Ordena por data decrescente
    data.sort((a, b) => b.date.localeCompare(a.date));
  }

  return {
    data,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    empty: snapshot.empty
  };
}

export async function addSession(session: Session): Promise<string> {
  const sessionsRef = collection(db, 'sessions');
  const docRef = await addDoc(sessionsRef, session);
  return docRef.id;
}

export async function updateSession(id: string, updates: Partial<Session>): Promise<void> {
  const docRef = doc(db, 'sessions', id);
  await updateDoc(docRef, updates as DocumentData);
}

export async function deleteSession(id: string): Promise<void> {
  const docRef = doc(db, 'sessions', id);
  await deleteDoc(docRef);
}

// ==========================================
// SERVIÇOS DE ALUGUEL (RENT LOGS)
// ==========================================

export async function getRentLogs() {
  const rentLogsRef = collection(db, 'rent_logs');
  const q = query(rentLogsRef, orderBy('valuePaid', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...(docSnapshot.data() as Omit<RentLog, 'id'>)
  }));
}

export async function getUpcomingSessions(todayStr: string, nextWeekStr: string): Promise<Session[]> {
  const sessionsRef = collection(db, 'sessions');
  const q = query(
    sessionsRef,
    where('date', '>=', todayStr),
    where('date', '<=', nextWeekStr),
    orderBy('date', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...(docSnapshot.data() as Omit<Session, 'id'>)
  }));
}
