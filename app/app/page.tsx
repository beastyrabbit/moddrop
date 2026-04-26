import type { Metadata } from "next";
import { StreamCanvasHome } from "@/components/stream-canvas/StreamCanvasHome";

export const metadata: Metadata = {
  title: "Rooms | Moddrop",
  description: "Create and manage Moddrop stream canvas rooms.",
};

export default function StreamCanvasPage() {
  return <StreamCanvasHome />;
}
