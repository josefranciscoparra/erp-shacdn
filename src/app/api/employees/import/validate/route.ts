import { NextRequest, NextResponse } from "next/server";

import { parseEmployeeImportBuffer } from "@/lib/employee-import/parser";
import { employeeImportOptionsSchema } from "@/lib/employee-import/schema";
import type { EmployeeImportOptions } from "@/lib/employee-import/types";
import { requireEmployeeImportPermission } from "@/server/actions/employee-import/permissions";
import { persistValidationJob } from "@/server/actions/employee-import/service";
import { validateRowsForOrganization } from "@/server/actions/employee-import/validator";

export async function POST(request: NextRequest) {
  try {
    const user = await requireEmployeeImportPermission();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Debes adjuntar un archivo XLSX o CSV." }, { status: 400 });
    }

    const optionsRaw = formData.get("options");
    let parsedOptions: EmployeeImportOptions;

    try {
      parsedOptions = employeeImportOptionsSchema.parse(
        optionsRaw ? JSON.parse(String(optionsRaw)) : { vacationMode: "BALANCE" },
      );
    } catch (error) {
      return NextResponse.json({ error: "Las opciones proporcionadas no son válidas." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsedRows = await parseEmployeeImportBuffer({ buffer, fileName: file.name });

    const validation = await validateRowsForOrganization({
      rows: parsedRows,
      orgId: user.orgId,
      options: parsedOptions,
    });

    const jobId = await persistValidationJob({
      orgId: user.orgId,
      userId: user.id,
      options: parsedOptions,
      rows: validation.rows,
      stats: validation.stats,
      fileBuffer: buffer,
      fileName: file.name,
      mimeType: file.type,
    });

    return NextResponse.json({
      jobId,
      summary: validation.stats,
      rows: validation.rows.slice(0, 50),
      options: parsedOptions,
    });
  } catch (error) {
    console.error("Error validando importación masiva:", error);
    return NextResponse.json({ error: "No fue posible validar el archivo. Inténtalo de nuevo." }, { status: 500 });
  }
}
