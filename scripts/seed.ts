import * as XLSX_RAW from 'xlsx';
const XLSX = (XLSX_RAW as any).default || XLSX_RAW;
import * as path from 'path';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  writeBatch,
  doc,
  getDocs,
  query,
  limit
} from 'firebase/firestore';

// Carrega as credenciais do Firebase a partir de process.env (injetado via --env-file=.env pelo Node)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Valida as credenciais básicas
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('YOUR_API_KEY')) {
  console.error("Erro: Credenciais do Firebase não configuradas no arquivo .env.");
  process.exit(1);
}

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Função utilitária para limpar nomes de pacientes
function canonicalPatientName(name: string): string {
  if (!name) return '';
  const cleaned = name.trim().replace(/^[0-9]+\.\s*/, '');
  const lower = cleaned.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (lower === 'eduardo barros' || lower === 'eduardo de barros') {
    return 'Eduardo Barros';
  }
  if (lower === 'elisete' || lower === 'elisete noleto') {
    return 'Elisete Noleto';
  }
  if (lower === 'fernanda' || lower === 'fernanda nather') {
    return 'Fernanda Nather';
  }
  if (lower === 'ismail' || lower === 'ismail ali') {
    return 'Ismail Ali';
  }
  if (lower === "laura d'angelo" || lower === "laura d'angelo" || lower === 'laura dangelo') {
    return "Laura D'Angelo";
  }
  if (lower === 'suelene' || lower === 'suelene dantas') {
    return 'Suelene Dantas';
  }
  if (lower === 'zenklub') {
    return 'Zenklub';
  }
  
  return cleaned;
}

// Função para formatar datas do Excel para string YYYY-MM-DD
function parseExcelDate(dateVal: any): string | null {
  if (!dateVal) return null;
  
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  
  if (typeof dateVal === 'number') {
    // Datas do Excel são serial numbers (dias desde 1/1/1900)
    const date = new Date((dateVal - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  const dateStr = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.substring(0, 10);
  }
  
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  
  return null;
}

// Função principal de carga (Seed)
async function runSeed() {
  console.log("Iniciando processo de carga (Seed)...");

  // 1. Checagem de segurança contra duplicidade
  const invoicesRef = collection(db, 'invoices');
  const checkQuery = query(invoicesRef, limit(1));
  const checkSnapshot = await getDocs(checkQuery);
  
  if (!checkSnapshot.empty) {
    console.log("Banco de dados já populado anteriormente. Cancelando operação de seed para evitar duplicação.");
    return;
  }

  // 2. Leitura do arquivo Excel
  const excelPath = path.resolve('Analisandos 2026.xlsx');
  console.log(`Lendo arquivo Excel de: ${excelPath}`);
  const workbook = XLSX.readFile(excelPath, { cellDates: true });

  const invoicesList: any[] = [];
  const rentLogsList: any[] = [];
  const sessionsList: any[] = [];
  const platformTxsList: any[] = [];

  // ==========================================
  // PARSE DE FATURAS (2025 E 2026)
  // ==========================================
  const faturaSheets = [
    { name: ' Faturas (2025)', year: 2025 },
    { name: ' Faturas (2026)', year: 2026 }
  ];

  for (const fSheet of faturaSheets) {
    const sheet = workbook.Sheets[fSheet.name];
    if (!sheet) continue;
    
    // Converte a planilha para matriz 2D
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    let currentMonth = '';

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length < 3) continue;

      const colA = row[0];
      if (colA === 'CONTROLADOR DE FATURAS') {
        // Encontra o mês na linha
        const foundMonth = row.find(x => x && x !== 'CONTROLADOR DE FATURAS');
        if (foundMonth) {
          currentMonth = String(foundMonth).trim().toUpperCase();
        }
      } else if (typeof colA === 'number' && row[2]) {
        const patient = canonicalPatientName(String(row[2]));
        if (patient && patient !== 'None' && patient !== 'Total') {
          const val = typeof row[3] === 'number' ? row[3] : 0;
          const paid = typeof row[4] === 'number' ? row[4] : 0;
          const pend = typeof row[5] === 'number' ? row[5] : 0;
          const dateStr = parseExcelDate(row[1]);

          invoicesList.push({
            year: fSheet.year,
            month: currentMonth,
            invoiceNumber: Math.round(colA),
            date: dateStr,
            patientName: patient,
            value: val,
            paidValue: paid,
            pendingValue: pend
          });
        }
      }
    }
  }

  // ==========================================
  // PARSE DE ALUGUEL DE CONSULTÓRIO
  // ==========================================
  const rentSheet = workbook.Sheets['Consultório (2026)'];
  if (rentSheet) {
    const rows = XLSX.utils.sheet_to_json<any[]>(rentSheet, { header: 1 });
    for (let r = 4; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length < 2) continue;

      const patientCol = row[0];
      const valueCol = row[1];

      if (patientCol && typeof valueCol === 'number' && patientCol !== 'Item' && patientCol !== 'Total') {
        const patientStr = String(patientCol).trim();
        let name = patientStr;
        let dateRef = '';

        // Separa "Paciente - Datas"
        const match = patientStr.match(/^([^-]+)(?:-\s*(.*))?$/);
        if (match) {
          name = match[1].trim();
          dateRef = match[2] ? match[2].trim() : '';
        }

        rentLogsList.push({
          patientName: canonicalPatientName(name),
          dateRef,
          valuePaid: valueCol,
          sessionsCount: Math.floor(valueCol / 30.0)
        });
      }
    }
  }

  // ==========================================
  // PARSE DE SESSÕES E PLATAFORMAS (INDIVIDUAIS)
  // ==========================================
  for (const sheetName of workbook.SheetNames) {
    if ([' Faturas (2025)', ' Faturas (2026)', 'Integrando Ser', 'Consultório (2026)'].includes(sheetName)) {
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const patientName = canonicalPatientName(sheetName);
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    if (rows.length === 0) continue;

    const row0 = rows[0];
    let maxCols = 0;
    for (const r of rows) {
      if (r && r.length > maxCols) {
        maxCols = r.length;
      }
    }
    const isZenklubSheet = patientName.toUpperCase() === 'ZENKLUB';

    for (let colIdx = 0; colIdx < maxCols; colIdx += 3) {
      const modVal = colIdx < row0.length ? row0[colIdx] : null;
      let modality = 'PARTICULAR';

      if (isZenklubSheet) {
        modality = 'ZENKLUB';
      } else if (modVal) {
        const modStr = String(modVal).toUpperCase();
        if (modStr.includes('CLINICA SOCIAL') || modStr.includes('CLÍNICA SOCIAL')) {
          modality = 'CLINICA SOCIAL';
        } else if (modStr.includes('PRESENCIAL')) {
          modality = 'PRESENCIAL';
        } else if (modStr.includes('ONLINE')) {
          modality = 'ONLINE';
        } else if (modStr.includes('INTEGRANDO SER')) {
          modality = 'INTEGRANDO SER';
        }
      }

      let emptyCount = 0;
      for (let rIdx = 2; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx];
        if (!row || row.length <= colIdx) continue;

        const dateVal = row[colIdx];
        if (dateVal === undefined || dateVal === null) {
          emptyCount++;
          if (emptyCount > 5) break;
          continue;
        }

        emptyCount = 0;
        const dateStr = parseExcelDate(dateVal);
        if (!dateStr) continue;

        if (isZenklubSheet) {
          const patVal = colIdx + 1 < row.length ? row[colIdx + 1] : null;
          const valVal = colIdx + 2 < row.length ? row[colIdx + 2] : null;

          const patStr = patVal ? canonicalPatientName(String(patVal)) : '';
          if (!patStr || ['total corporativo', 'total particular', 'total', 'corporativo', 'particular'].includes(patStr.toLowerCase())) {
            continue;
          }

          const val = typeof valVal === 'number' ? valVal : 0;

          sessionsList.push({
            patientName: patStr,
            date: dateStr,
            paymentInfo: `Zenklub: R$ ${val.toFixed(2)}`,
            duration: 1.0,
            modality: 'ZENKLUB'
          });

          platformTxsList.push({
            platform: 'zenklub',
            date: dateStr,
            patientName: patStr,
            value: val
          });
        } else {
          const payVal = colIdx + 1 < row.length ? row[colIdx + 1] : null;
          const durVal = colIdx + 2 < row.length ? row[colIdx + 2] : null;

          const duration = typeof durVal === 'number' ? durVal : 1.0;
          const payStr = payVal ? String(payVal).trim() : '';

          sessionsList.push({
            patientName,
            date: dateStr,
            paymentInfo: payStr,
            duration,
            modality
          });
        }
      }
    }
  }

  // ==========================================
  // PARSE DE PACIENTES ÚNICOS (CRM)
  // ==========================================
  const patientsList: any[] = [];
  const patientNames = new Set<string>();

  for (const s of sessionsList) patientNames.add(s.patientName);
  for (const inv of invoicesList) patientNames.add(inv.patientName);

  for (const name of patientNames) {
    if (!name || name === 'None' || name === 'Total') continue;

    const pSessions = sessionsList.filter(s => s.patientName === name);
    let modality = 'particular';
    let defaultRate = 150;

    if (pSessions.length > 0) {
      const modCounts: Record<string, number> = {};
      for (const s of pSessions) {
        modCounts[s.modality] = (modCounts[s.modality] || 0) + 1;
      }
      const sortedMods = Object.keys(modCounts).sort((a, b) => modCounts[b] - modCounts[a]);
      modality = sortedMods[0].toLowerCase();

      const rates: number[] = [];
      for (const s of pSessions) {
        const rateMatch = s.paymentInfo?.match(/\d+([\.,]\d+)?/);
        if (rateMatch) {
          rates.push(parseFloat(rateMatch[0].replace(',', '.')));
        }
      }
      if (rates.length > 0) {
        defaultRate = rates.reduce((sum, r) => sum + r, 0) / rates.length;
      } else {
        if (modality.includes('social')) defaultRate = 80;
        else if (modality.includes('zenklub')) defaultRate = 40;
        else if (modality.includes('integrando')) defaultRate = 20.5;
      }
    } else {
      const pInvoices = invoicesList.filter(inv => inv.patientName === name);
      if (pInvoices.length > 0) {
        const avgInvoice = pInvoices.reduce((sum, inv) => sum + inv.value, 0) / pInvoices.length;
        defaultRate = Math.round(avgInvoice / 4);
      }
    }

    // Determina a origem do paciente
    let origin: 'particular' | 'social_clinic' | 'zenklub' | 'integrando_ser' | 'training_student' = 'particular';
    if (modality.includes('zenklub')) {
      origin = 'zenklub';
    } else if (modality.includes('integrando')) {
      origin = 'integrando_ser';
    } else if (modality.includes('social') || modality.includes('social_clinic')) {
      origin = 'social_clinic';
    }

    // Determina o formato de atendimento
    const hasRent = rentLogsList.some(r => r.patientName === name);
    const format: 'presencial' | 'online' = (hasRent || modality.includes('presencial')) ? 'presencial' : 'online';

    patientsList.push({
      name,
      origin,
      format,
      defaultRate: Math.round(defaultRate),
      status: 'active'
    });
  }

  // ==========================================
  // EXECUTA UPLOAD EM LOTES (BATCH WRITES)
  // ==========================================
  console.log(`\nDados preparados:`);
  console.log(`- Pacientes (CRM): ${patientsList.length}`);
  console.log(`- Faturas: ${invoicesList.length}`);
  console.log(`- Logs de Aluguel: ${rentLogsList.length}`);
  console.log(`- Sessões: ${sessionsList.length}`);
  console.log(`- Transações de Plataforma: ${platformTxsList.length}`);

  const collections = [
    { name: 'patients', list: patientsList },
    { name: 'invoices', list: invoicesList },
    { name: 'rent_logs', list: rentLogsList },
    { name: 'sessions', list: sessionsList },
    { name: 'platform_transactions', list: platformTxsList }
  ];

  for (const col of collections) {
    if (col.list.length === 0) continue;
    console.log(`Enviando lote para a coleção "${col.name}"...`);
    
    const BATCH_LIMIT = 450;
    let batch = writeBatch(db);
    let count = 0;

    for (const item of col.list) {
      const docRef = doc(collection(db, col.name));
      batch.set(docRef, item);
      count++;

      if (count >= BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
        console.log(`  Lote de 450 enviado com sucesso...`);
      }
    }

    if (count > 0) {
      await batch.commit();
      console.log(`  Lote final de ${count} enviado com sucesso.`);
    }
  }

  console.log("\nSeed concluído com sucesso!");
}

runSeed().catch(err => {
  console.error("Erro durante o processo de seed:", err);
  process.exit(1);
});
