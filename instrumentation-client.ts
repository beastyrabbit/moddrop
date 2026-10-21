import { bufferEarlyErrors } from "@/lib/telemetry/browser-errors";

// Next loads this before hydration. The queue is bounded, memory-only, and sent
// only once server-delivered configuration enables error reporting.
bufferEarlyErrors();
