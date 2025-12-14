import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";

import {
  EMPLOYEE_IMPORT_COLUMNS,
  EMPLOYEE_IMPORT_HEADER_MAP,
  EMPLOYEE_IMPORT_SAMPLE_ROW,
} from "./constants";
import type { EmployeeImportRowData, ParsedEmployeeImportRow } from "./types";

function normalizeKey(key: string): string {
  const clean = key.trim().toLowerCase().replace(/\s+/g, "_");
  return EMPLOYEE_IMPORT_HEADER_MAP[clean] ?? clean;
}

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).trim();
}

function toNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mapRecordToRow(rowIndex: number, record: Record<string, string>): ParsedEmployeeImportRow {
  const data: EmployeeImportRowData = {
    firstName: record.firstName ?? "",
    lastName: record.lastName ?? "",
    secondLastName: record.secondLastName || undefined,
    nifNie: record.nifNie ?? "",
    email: record.email ?? "",
    phone: record.phone || undefined,
    mobilePhone: record.mobilePhone || undefined,
    startDate: record.startDate ?? "",
    scheduleTemplateId: record.scheduleTemplateId ?? "",
    departmentId: record.departmentId || undefined,
    costCenterId: record.costCenterId || undefined,
    managerEmail: record.managerEmail || undefined,
    role: record.role || undefined,
    contractType: record.contractType || undefined,
    weeklyHours: toNumber(record.weeklyHours),
    notes: record.notes || undefined,
    ptoBalanceDays: toNumber(record.ptoBalanceDays),
    ptoBalanceMinutes: toNumber(record.ptoBalanceMinutes),
    ptoAnnualDays: toNumber(record.ptoAnnualDays),
    ptoAnnualMinutes: toNumber(record.ptoAnnualMinutes),
    ptoUsedDays: toNumber(record.ptoUsedDays),
    ptoUsedMinutes: toNumber(record.ptoUsedMinutes),
  };

  return {
    rowIndex,
    data,
    raw: record,
  };
}

async function parseXlsx(buffer: Buffer): Promise<ParsedEmployeeImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.getWorksheet("Employees") ?? workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("No se encontró la hoja 'Employees' en la plantilla.");
  }

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell) => {
    const key = normalizeKey(cell.text || String(cell.value ?? ""));
    headers.push(key);
  });

  const rows: ParsedEmployeeImportRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      const cell = row.getCell(index + 1);
      record[header] = normalizeValue(cell.value);
    });

    const hasData = Object.values(record).some((value) => value && value.trim() !== "");
    if (!hasData) return;

    rows.push(mapRecordToRow(rowNumber, record));
  });

  return rows;
}

function parseCsv(buffer: Buffer): ParsedEmployeeImportRow[] {
  const text = buffer.toString("utf-8");
  const csvRecords: Record<string, string>[] = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return csvRecords.map((record, index) => {
    const normalized: Record<string, string> = {};
    Object.entries(record).forEach(([key, value]) => {
      if (!key) return;
      const normalizedKey = normalizeKey(key);
      normalized[normalizedKey] = normalizeValue(value);
    });
    return mapRecordToRow(index + 2, normalized); // CSV headers row counted as 1
  });
}

export function parseEmployeeImportBuffer(params: { buffer: Buffer; fileName?: string }): Promise<ParsedEmployeeImportRow[]> {
  const fileName = params.fileName?.toLowerCase() ?? "";
  if (fileName.endsWith(".csv")) {
    return Promise.resolve(parseCsv(params.buffer));
  }

  return parseXlsx(params.buffer);
}

export async function parseEmployeeImportFile(file: File): Promise<ParsedEmployeeImportRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return parseEmployeeImportBuffer({ buffer, fileName: file.name });
}

export function buildTemplateRows() {
  const headers = EMPLOYEE_IMPORT_COLUMNS.map((column) => column.key);
  return {
    headers,
    sample: EMPLOYEE_IMPORT_SAMPLE_ROW,
  };
}
