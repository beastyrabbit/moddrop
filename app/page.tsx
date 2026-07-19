import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "Moddrop | The live layer for your stream",
  description:
    "Moddrop is the live layer for your stream. One OBS browser source. Approved mods share a canvas to run BRB cards, emotes, clips, sponsor art, scorebugs, and audio cues — together, while you stay live.",
};

export default function LandingPage() {
  return <Landing />;
}
