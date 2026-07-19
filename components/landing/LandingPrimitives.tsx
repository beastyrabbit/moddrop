import {
  AudioLines,
  Clapperboard,
  ImagePlay,
  Radio,
  Trophy,
  Users2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { type ContentTypeId, landingContent } from "@/lib/landing-content";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const contentTypeIcons: Record<ContentTypeId, IconComponent> = {
  brb: Radio,
  emotes: ImagePlay,
  clips: Clapperboard,
  sponsors: Users2,
  scorebugs: Trophy,
  audio: AudioLines,
};

type LandingLogoProps = {
  className?: string;
  priority?: boolean;
};

export function LandingLogo({ className, priority = false }: LandingLogoProps) {
  return (
    <Link
      href="/"
      aria-label="Moddrop home"
      className={`inline-flex min-h-11 items-center ${className ?? ""}`}
    >
      <Image
        src={landingContent.logos.onDark}
        alt="Moddrop"
        width={154}
        height={30}
        priority={priority}
        className="h-auto w-[104px] min-[360px]:w-[132px] sm:w-[154px]"
        style={{ height: "auto" }}
      />
    </Link>
  );
}
