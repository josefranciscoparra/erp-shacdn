import { NextResponse } from "next/server";

import * as Sentry from "@sentry/nextjs";

/**
 * Endpoint de prueba para verificar que Sentry está funcionando correctamente
 *
 * GET /api/sentry-test - Lanza un error de prueba
 * Query params:
 *   - type: "error" (default) | "warning" | "info"
 *
 * @example
 * GET /api/sentry-test
 * GET /api/sentry-test?type=warning
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "error";

  switch (type) {
    case "error":
      // Lanzar un error de prueba
      throw new Error("🧪 Sentry Test Error: This is a test error from /api/sentry-test");

    case "warning":
      // Capturar un warning
      Sentry.captureMessage("🧪 Sentry Test Warning: This is a test warning", {
        level: "warning",
        tags: {
          test: true,
          endpoint: "/api/sentry-test",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Test warning sent to Sentry",
        type: "warning",
      });

    case "info":
      // Capturar un mensaje informativo
      Sentry.captureMessage("🧪 Sentry Test Info: This is a test info message", {
        level: "info",
        tags: {
          test: true,
          endpoint: "/api/sentry-test",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Test info message sent to Sentry",
        type: "info",
      });

    case "breadcrumbs":
      // Probar breadcrumbs
      Sentry.addBreadcrumb({
        category: "test",
        message: "Test breadcrumb 1",
        level: "info",
      });

      Sentry.addBreadcrumb({
        category: "test",
        message: "Test breadcrumb 2",
        level: "info",
      });

      Sentry.captureMessage("🧪 Sentry Test: Testing breadcrumbs", {
        level: "info",
        tags: {
          test: true,
          endpoint: "/api/sentry-test",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Test with breadcrumbs sent to Sentry",
        type: "breadcrumbs",
      });

    case "performance":
      // Probar performance monitoring
      return await Sentry.startSpan(
        {
          name: "test_performance_endpoint",
          op: "test.performance",
        },
        async () => {
          // Simular operación lenta
          await new Promise((resolve) => setTimeout(resolve, 2000));

          return NextResponse.json({
            success: true,
            message: "Performance test completed (2s delay)",
            type: "performance",
          });
        },
      );

    default:
      return NextResponse.json(
        {
          error: "Invalid type parameter",
          validTypes: ["error", "warning", "info", "breadcrumbs", "performance"],
        },
        { status: 400 },
      );
  }
}
