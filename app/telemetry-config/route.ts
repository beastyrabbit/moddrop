import { errorConfig } from "@/backend/stream-canvas/src/telemetry/config";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(errorConfig(process.env), {
    headers: { "Cache-Control": "no-store" },
  });
}
