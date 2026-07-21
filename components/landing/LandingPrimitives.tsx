import {
  AudioLines,
  Clapperboard,
  ImagePlay,
  Radio,
  Trophy,
  Users2,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import type { ContentTypeId } from "@/lib/landing-content";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const contentTypeIcons: Record<ContentTypeId, IconComponent> = {
  brb: Radio,
  emotes: ImagePlay,
  clips: Clapperboard,
  sponsors: Users2,
  scorebugs: Trophy,
  audio: AudioLines,
};
