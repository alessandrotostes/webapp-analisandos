import * as XLSX_RAW from 'xlsx';
const XLSX = (XLSX_RAW as any).default || XLSX_RAW;
import * as path from 'path';

const excelPath = path.resolve('Analisandos 2026.xlsx');
const workbook = XLSX.readFile(excelPath, { cellDates: true });
const sheet = workbook.Sheets[' Faturas (2026)'];
const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

console.log("Total rows:", rows.length);
for (let i = 0; i < 15; i++) {
  console.log(`Row ${i}:`, rows[i]);
}
