export type ContentTypeId =
  | "brb"
  | "emotes"
  | "clips"
  | "sponsors"
  | "scorebugs"
  | "audio";

export type SupportedContentType = {
  id: ContentTypeId;
  title: string;
  description: string;
};

export type SetupStep = {
  number: "01" | "02" | "03";
  title: string;
  description: string;
};

export type Integration = {
  name: string;
  src: string;
  status: "supported" | "upcoming";
  width: number;
  height: number;
};

export const landingContent = {
  proposition: {
    eyebrow: "The live layer for your stream",
  },
  ctas: {
    primary: {
      label: "Get started — it’s free",
      href: "/app",
    },
    secondary: {
      label: "See it in action",
      href: "#product",
    },
  },
  product: {
    collaborationDescription:
      "Invite the people you trust to place media and run the live layer while you focus on the stream.",
  },
  contentTypes: [
    {
      id: "brb",
      title: "BRB cards",
      description: "Timers, designs, and scene variations.",
    },
    {
      id: "emotes",
      title: "Emotes & effects",
      description: "Emote walls and visual moments.",
    },
    {
      id: "clips",
      title: "Clips & highlights",
      description: "Queue, preview, and play stream clips.",
    },
    {
      id: "sponsors",
      title: "Sponsor assets",
      description: "Sponsor art and promotional blocks.",
    },
    {
      id: "scorebugs",
      title: "Scorebugs",
      description: "Scores, timers, and leaderboard graphics.",
    },
    {
      id: "audio",
      title: "Audio cues",
      description: "Sounds, music, and audio moments.",
    },
  ] satisfies readonly SupportedContentType[],
  setupSteps: [
    {
      number: "01",
      title: "Create your canvas",
      description: "Start a canvas and invite your approved moderators.",
    },
    {
      number: "02",
      title: "Add it to OBS",
      description: "Paste your single Moddrop browser-source URL into OBS.",
    },
    {
      number: "03",
      title: "Go live",
      description: "Your mods run the layer while you run the show.",
    },
  ] satisfies readonly SetupStep[],
  integrations: [
    {
      name: "Twitch",
      src: "/img/brands/twitch.svg",
      status: "supported",
      width: 17,
      height: 20,
    },
    {
      name: "YouTube Live",
      src: "/img/brands/youtube.svg",
      status: "upcoming",
      width: 24,
      height: 17,
    },
    {
      name: "Kick",
      src: "/img/brands/kick.svg",
      status: "upcoming",
      width: 50,
      height: 16,
    },
    {
      name: "TikTok Live",
      src: "/img/brands/tiktok.svg",
      status: "upcoming",
      width: 16,
      height: 18,
    },
    {
      name: "Rumble",
      src: "/img/brands/rumble.svg",
      status: "upcoming",
      width: 64,
      height: 16,
    },
  ] satisfies readonly Integration[],
  imagery: {
    hero: {
      src: "/img/landing-hero.webp",
      alt: "A velvet green-room couch under a warm brass lamp, a headset resting on one arm.",
    },
  },
  logos: {
    onDark: "/img/moddrop-logo-lockup-on-dark.svg",
    iconDark: "/img/moddrop-icon-black.svg",
  },
} as const;
