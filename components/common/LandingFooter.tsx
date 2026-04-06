import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="mx-auto max-w-[1280px] pb-8">
      <div className="signal-surface flex flex-col gap-4 border-t border-t-[#33ff33]/18 px-6 py-5 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-white/64">
          &copy; {new Date().getFullYear()} Moddrop. Brought to you by Beasty.
        </p>
        <Link
          href="https://beastyrabbit.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[0.72rem] tracking-[0.2em] text-white/68 uppercase hover:text-[#33ff33]"
        >
          BeastyRabbit.com
        </Link>
      </div>
    </footer>
  );
}
