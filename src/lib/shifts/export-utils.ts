/**
 * Utilidades de Exportación para Informes de Turnos
 * Sprint 6
 */

import ExcelJS from "exceljs";

/**
 * Exportar datos de organización a CSV
 */
export function exportOrgStatsToCSV(stats: any, dateRange: { from: Date; to: Date }) {
  const rows = [
    ["Informe de Turnos - Estadísticas Generales"],
    [`Período: ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`],
    [],
    ["Métrica", "Valor"],
    ["Total Turnos", stats.totalShifts],
    ["Total Asignaciones", stats.totalAssignments],
    ["Asignaciones con Anomalías", stats.assignmentsWithAnomalies],
    ["Ausencias", stats.absences],
    ["Retrasos", stats.delays],
    ["Promedio Retraso (min)", Math.round(stats.avgDelayMinutes)],
    ["Horas Planificadas", stats.totalPlannedHours],
    ["Horas Trabajadas", stats.totalWorkedHours],
    ["Tasa de Cumplimiento (%)", stats.complianceRate],
    ["Tasa de Ausencias (%)", stats.absenceRate],
  ];

  const csv = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `informe-turnos-${Date.now()}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exportar informe de empleado a CSV
 */
export function exportEmployeeReportToCSV(report: any) {
  const rows = [
    ["Informe de Turnos por Empleado"],
    [`Empleado: ${report.employee.firstName} ${report.employee.lastName}`],
    [`Número: ${report.employee.employeeNumber}`],
    [
      `Período: ${new Date(report.period.startDate).toLocaleDateString()} - ${new Date(report.period.endDate).toLocaleDateString()}`,
    ],
    [],
    ["Estadísticas"],
    ["Métrica", "Valor"],
    ["Total Turnos", report.stats.totalShifts],
    ["Turnos Completados", report.stats.completedShifts],
    ["Ausencias", report.stats.absences],
    ["Retrasos", report.stats.delays],
    ["Salidas Anticipadas", report.stats.earlyDepartures],
    ["Horas Planificadas", report.stats.totalPlannedHours],
    ["Horas Trabajadas", report.stats.totalWorkedHours],
    ["Tasa de Cumplimiento (%)", report.stats.complianceRate],
    [],
    ["Detalle de Turnos"],
    [
      "Fecha",
      "Hora Inicio",
      "Hora Fin",
      "Centro",
      "Posición",
      "Estado",
      "Planificado (h)",
      "Trabajado (h)",
      "Ausencia",
      "Retraso (min)",
      "Salida Anticipada (min)",
    ],
  ];

  report.assignments.forEach((a: any) => {
    rows.push([
      new Date(a.date).toLocaleDateString(),
      a.startTime,
      a.endTime,
      a.costCenter,
      a.position ?? "",
      a.status,
      Math.round((a.plannedMinutes / 60) * 10) / 10,
      a.actualWorkedMinutes ? Math.round((a.actualWorkedMinutes / 60) * 10) / 10 : "",
      a.wasAbsent ? "Sí" : "No",
      a.hasDelay ? a.delayMinutes : "",
      a.hasEarlyDeparture ? a.earlyDepartureMinutes : "",
    ]);
  });

  const csv = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `informe-empleado-${report.employee.employeeNumber}-${Date.now()}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exportar informe de empleado a Excel con formato
 */
export async function exportEmployeeReportToExcel(report: any) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Informe de Turnos");

  // Estilos
  const headerStyle = {
    font: { bold: true, size: 14 },
    fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF4472C4" } },
    alignment: { horizontal: "center" as const },
  };

  const subHeaderStyle = {
    font: { bold: true },
    fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFD9E1F2" } },
  };

  // Título
  worksheet.mergeCells("A1:K1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "Informe de Turnos por Empleado";
  titleCell.style = headerStyle;

  // Información del empleado
  worksheet.getCell("A3").value = "Empleado:";
  worksheet.getCell("B3").value = `${report.employee.firstName} ${report.employee.lastName}`;
  worksheet.getCell("A4").value = "Número:";
  worksheet.getCell("B4").value = report.employee.employeeNumber;
  worksheet.getCell("A5").value = "Período:";
  worksheet.getCell("B5").value =
    `${new Date(report.period.startDate).toLocaleDateString()} - ${new Date(report.period.endDate).toLocaleDateString()}`;

  // Estadísticas
  worksheet.getCell("A7").value = "Estadísticas";
  worksheet.getCell("A7").style = subHeaderStyle;

  const statsData = [
    ["Total Turnos", report.stats.totalShifts],
    ["Turnos Completados", report.stats.completedShifts],
    ["Ausencias", report.stats.absences],
    ["Retrasos", report.stats.delays],
    ["Salidas Anticipadas", report.stats.earlyDepartures],
    ["Horas Planificadas", report.stats.totalPlannedHours],
    ["Horas Trabajadas", report.stats.totalWorkedHours],
    ["Tasa de Cumplimiento (%)", report.stats.complianceRate],
  ];

  let currentRow = 8;
  statsData.forEach((stat) => {
    worksheet.getCell(`A${currentRow}`).value = stat[0];
    worksheet.getCell(`B${currentRow}`).value = stat[1];
    currentRow++;
  });

  // Detalle de turnos
  currentRow += 2;
  worksheet.getCell(`A${currentRow}`).value = "Detalle de Turnos";
  worksheet.getCell(`A${currentRow}`).style = subHeaderStyle;

  currentRow++;
  const headers = [
    "Fecha",
    "Hora Inicio",
    "Hora Fin",
    "Centro",
    "Posición",
    "Estado",
    "Planificado (h)",
    "Trabajado (h)",
    "Ausencia",
    "Retraso (min)",
    "Salida Anticipada (min)",
  ];

  headers.forEach((header, index) => {
    const cell = worksheet.getCell(`${String.fromCharCode(65 + index)}${currentRow}`);
    cell.value = header;
    cell.style = subHeaderStyle;
  });

  currentRow++;
  report.assignments.forEach((a: any) => {
    worksheet.getCell(`A${currentRow}`).value = new Date(a.date).toLocaleDateString();
    worksheet.getCell(`B${currentRow}`).value = a.startTime;
    worksheet.getCell(`C${currentRow}`).value = a.endTime;
    worksheet.getCell(`D${currentRow}`).value = a.costCenter;
    worksheet.getCell(`E${currentRow}`).value = a.position ?? "";
    worksheet.getCell(`F${currentRow}`).value = a.status;
    worksheet.getCell(`G${currentRow}`).value = Math.round((a.plannedMinutes / 60) * 10) / 10;
    worksheet.getCell(`H${currentRow}`).value = a.actualWorkedMinutes
      ? Math.round((a.actualWorkedMinutes / 60) * 10) / 10
      : "";
    worksheet.getCell(`I${currentRow}`).value = a.wasAbsent ? "Sí" : "No";
    worksheet.getCell(`J${currentRow}`).value = a.hasDelay ? a.delayMinutes : "";
    worksheet.getCell(`K${currentRow}`).value = a.hasEarlyDeparture ? a.earlyDepartureMinutes : "";

    // Colorear filas con anomalías
    if (a.wasAbsent) {
      for (let col = 1; col <= 11; col++) {
        worksheet.getCell(`${String.fromCharCode(64 + col)}${currentRow}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFC7CE" },
        };
      }
    } else if (a.hasDelay) {
      for (let col = 1; col <= 11; col++) {
        worksheet.getCell(`${String.fromCharCode(64 + col)}${currentRow}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFEB9C" },
        };
      }
    }

    currentRow++;
  });

  // Ajustar anchos de columna
  worksheet.columns = [
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 20 },
    { width: 15 },
    { width: 12 },
    { width: 15 },
    { width: 15 },
    { width: 10 },
    { width: 15 },
    { width: 20 },
  ];

  // Descargar
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `informe-empleado-${report.employee.employeeNumber}-${Date.now()}.xlsx`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exportar estadísticas generales a Excel
 */
export async function exportOrgStatsToExcel(stats: any, dateRange: { from: Date; to: Date }) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Estadísticas Generales");

  // Estilos
  const headerStyle = {
    font: { bold: true, size: 14 },
    fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF4472C4" } },
    alignment: { horizontal: "center" as const },
  };

  const subHeaderStyle = {
    font: { bold: true },
    fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFD9E1F2" } },
  };

  // Título
  worksheet.mergeCells("A1:B1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "Informe de Turnos - Estadísticas Generales";
  titleCell.style = headerStyle;

  // Período
  worksheet.getCell("A2").value = "Período:";
  worksheet.getCell("B2").value = `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`;

  // Datos
  worksheet.getCell("A4").value = "Métrica";
  worksheet.getCell("B4").value = "Valor";
  worksheet.getCell("A4").style = subHeaderStyle;
  worksheet.getCell("B4").style = subHeaderStyle;

  const data = [
    ["Total Turnos", stats.totalShifts],
    ["Total Asignaciones", stats.totalAssignments],
    ["Asignaciones con Anomalías", stats.assignmentsWithAnomalies],
    ["Ausencias", stats.absences],
    ["Retrasos", stats.delays],
    ["Promedio Retraso (min)", Math.round(stats.avgDelayMinutes)],
    ["Horas Planificadas", stats.totalPlannedHours],
    ["Horas Trabajadas", stats.totalWorkedHours],
    ["Diferencia de Horas", Math.round((stats.totalWorkedHours - stats.totalPlannedHours) * 10) / 10],
    ["Tasa de Cumplimiento (%)", stats.complianceRate],
    ["Tasa de Ausencias (%)", stats.absenceRate],
  ];

  let currentRow = 5;
  data.forEach((row) => {
    worksheet.getCell(`A${currentRow}`).value = row[0];
    worksheet.getCell(`B${currentRow}`).value = row[1];
    currentRow++;
  });

  // Ajustar anchos
  worksheet.columns = [{ width: 30 }, { width: 20 }];

  // Descargar
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `informe-turnos-${Date.now()}.xlsx`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
