import Image from "next/image";
import Link from "next/link";
import { landingContent } from "@/lib/landing-content";

type ModdropLogoProps = {
  className?: string;
  priority?: boolean;
};

export function ModdropLogo({ className, priority = false }: ModdropLogoProps) {
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
