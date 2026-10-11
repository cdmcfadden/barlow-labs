import { DEFAULT_SCALE, type Survey } from "./types";

/**
 * Realtor feature-value survey for Yoova for Agents.
 * "Today" = shipped on the web realtor portal as of Sept 2026.
 * "Roadmap" = under consideration. Question ids are stored with responses — don't rename.
 */
export const realtorFeatures: Survey = {
  slug: "realtor-features",
  title: "Yoova for Agents: what matters to you?",
  audience: "Realtor survey",
  intro:
    "Yoova is the home app your buyers keep after closing, with your name on it. Tell us which features you'd actually use, so we build the right things next.",
  scale: DEFAULT_SCALE,
  writeIns: 2,
  writeInPrompt:
    "Is there a feature you'd want that isn't listed? Describe it and tell us how valuable it would be.",
  thankYou:
    "Your answers are in. They go straight to the team deciding what Yoova builds next. For early access or a demo, email hello@yoova.com.",
  sections: [
    {
      id: "today",
      title: "Features available today",
      description: "These are live in Yoova for Agents now. How valuable is each one to you?",
      questions: [
        {
          id: "agent_branding",
          label: "Your brand inside your clients' home app",
          detail:
            "Your name, photo and logo stay in your past clients' home app, with one-tap call, email and message.",
        },
        {
          id: "client_dashboard",
          label: "Client activity and potential-lead dashboard",
          detail: "See which clients are active in the app and who is showing signs of a next move.",
        },
        {
          id: "transactions",
          label: "Closing tracker with AI timeline and summary",
          detail:
            "Upload the contract and Yoova pulls out the key dates. Your client sees closing progress in their app.",
        },
        {
          id: "offer_analysis",
          label: "Side-by-side offer comparison",
          detail: "Compare offers on a listing and share a clean summary link with your seller.",
        },
        {
          id: "open_houses",
          label: "Open house QR sign-in and lead capture",
          detail: "Visitors sign in by QR code, and Yoova sends the follow-up email for you.",
        },
        {
          id: "ask_yoova",
          label: "Ask Yoova, an AI assistant that knows your business",
          detail: "Ask questions about your clients, deals and uploaded documents in plain English.",
        },
        {
          id: "messaging",
          label: "In-app messaging with clients",
          detail: "A one-to-one inbox with each client, separate from your personal texts.",
        },
        {
          id: "newsletters",
          label: "Client updates and newsletters with an AI writer",
          detail: "Post announcements in the app or email all clients, with a draft written for you.",
        },
        {
          id: "vendor_list",
          label: "Your preferred vendor list, shared with clients",
          detail:
            "Inspectors, lenders and trades you trust, auto-filled with contact details and shown in your clients' app.",
        },
        {
          id: "courses",
          label: "Branded homeowner education courses",
          detail: "Short video courses under your name, built yourself or cloned from the Yoova library.",
        },
      ],
    },
    {
      id: "roadmap",
      title: "Features we're considering",
      description: "None of these exist yet. How valuable would each be if we built it?",
      questions: [
        {
          id: "crm_sync",
          label: "Two-way sync with your CRM",
          detail: "Contacts, notes and activity stay in sync with Follow Up Boss, BoldTrail (kvCORE), Lofty or similar.",
        },
        {
          id: "vendor_matching",
          label: "Automatic vendor-to-homeowner job matching",
          detail:
            "When a client needs a repair or project, Yoova matches them with your vetted vendors, gets quotes and books the job.",
        },
        {
          id: "full_tc",
          label: "Full transaction coordination with every party",
          detail:
            "One workspace for deadlines, documents and messaging with the lender, title/escrow, inspector and the other agent.",
        },
        {
          id: "next_home_search",
          label: "Advanced next-home search for clients",
          detail: "MLS-powered saved searches and alerts tailored to each client's needs, budget and equity.",
        },
        {
          id: "closing_gift",
          label: "Closing-gift program",
          detail: "Gift each buyer a year of Yoova at closing, branded to you, as part of your closing package.",
        },
        {
          id: "seller_signals",
          label: "Seller-signal alerts",
          detail:
            "Get notified when a past client shows signs of moving: equity milestones, value checks, big projects or life events.",
        },
        {
          id: "equity_reports",
          label: "Automatic home value and equity reports",
          detail: "A monthly branded report to each past client on their home's value, equity and refinance options.",
        },
        {
          id: "cma_comps",
          label: "MLS comps and CMA builder",
          detail: "Pull comparable sales and produce a branded market analysis in minutes.",
        },
        {
          id: "home_history",
          label: "Verified Home History Report for listings",
          detail:
            "A \"Carfax for homes\" from the owner's maintenance and upgrade records, ready to share when the home is listed.",
        },
        {
          id: "prefilled_dossier",
          label: "Home profile pre-filled at closing",
          detail:
            "Listing and transaction data, from the MLS, dotloop or SkySlope, sets up your buyer's home profile automatically.",
        },
      ],
    },
  ],
};
