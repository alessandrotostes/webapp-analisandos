import * as XLSX from 'xlsx';

const XLSX_MOD = (XLSX as any).default || XLSX;
console.log("XLSX_MOD typeof readFile:", typeof XLSX_MOD.readFile);
console.log("XLSX_MOD typeof utils:", typeof XLSX_MOD.utils);
