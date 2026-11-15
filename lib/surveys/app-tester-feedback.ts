import { DEFAULT_SCALE, type ScaleLabel, type Survey } from "./types";

/**
 * Follow-up survey for people who tested the Yoova mobile app (iOS and Android).
 * Part 1 is how the experience was (agree/disagree + one pick-one on price).
 * Part 2 is which possible new features they would value (same 1–5 value scale as
 * the realtor survey). Question ids are stored with responses — don't rename.
 */
const AGREE: ScaleLabel[] = [
  { value: 1, short: "Disagree", long: "Strongly disagree" },
  { value: 2, short: "Mostly no", long: "Somewhat disagree" },
  { value: 3, short: "Neutral", long: "Neither agree nor disagree" },
  { value: 4, short: "Mostly yes", long: "Somewhat agree" },
  { value: 5, short: "Agree", long: "Strongly agree" },
];

export const appTesterFeedback: Survey = {
  slug: "app-tester-feedback",
  title: "Yoova app: how did it go?",
  audience: "App tester survey",
  placeholders: { name: "Alex Tester", email: "you@example.com" },
  intro:
    "Thanks for trying the Yoova app. Tell us how it felt to use, then which new features you would actually want. Your answers decide what we fix and build next.",
  scale: DEFAULT_SCALE,
  writeIns: 2,
  writeInPrompt:
    "Is there something you wished the app did that isn't listed? Describe it and tell us how valuable it would be.",
  thankYou:
    "Thank you, your answers are in. They go straight to the team deciding what Yoova fixes and builds next. Questions or something broken? Email hello@yoova.com.",
  sections: [
    {
      id: "experience",
      title: "Part 1: your experience",
      description: "How much do you agree with each statement? Go with your first reaction.",
      tag: "Experience",
      scale: AGREE,
      questions: [
        { id: "easy_to_find", label: "It was easy to find what I was looking for." },
        { id: "performance", label: "The app felt fast: screens loaded quickly and nothing lagged." },
        { id: "look_and_feel", label: "I like the look and feel of the app." },
        { id: "onboarding", label: "Getting started and setting up my home was easy." },
        { id: "assistant", label: "The chat assistant understood me and gave useful answers." },
        { id: "stability", label: "The app felt stable, with no crashes, freezes or glitches." },
        {
          id: "share_with_realtor",
          label: "I'm comfortable sharing my app information with my realtor.",
          detail: "For example the details of your home, your tasks, and the documents and photos you add.",
        },
        { id: "likely_to_use", label: "I'm likely to keep using an app like this." },
        { id: "would_recommend", label: "I would recommend this app to a friend or family member." },
        {
          id: "willing_to_pay",
          label: "What is the most you would pay for an app like this?",
          options: [
            { value: "free", label: "Nothing, I'd only use it if it's free" },
            { value: "one_time_1_99", label: "$1.99, one time" },
            { value: "monthly_5", label: "$5 per month" },
            { value: "monthly_10", label: "$10 per month" },
          ],
        },
      ],
    },
    {
      id: "features",
      title: "Part 2: features you might want",
      description: "None of these are in the app yet. How valuable would each be to you if we built it?",
      tag: "Feature",
      questions: [
        {
          id: "live_vendor_quotes",
          label: "Real-time quotes from vendors",
          detail: "Describe a repair or project and get live prices from local pros, then compare and book in the app.",
        },
        {
          id: "home_video",
          label: "Record and store video of your house",
          detail: "Walk through your home on video, keep it with your home record, and share clips with pros or your realtor.",
        },
        {
          id: "home_search",
          label: "Search for new homes and open houses",
          detail: "Browse listings and upcoming open houses near you, with saved searches and alerts.",
        },
        {
          id: "pay_bills",
          label: "Pay your house bills from the app",
          detail: "Mortgage, utilities, HOA and property tax in one place, with due-date reminders.",
        },
        {
          id: "value_equity",
          label: "Home value and equity tracker",
          detail: "See what your home is worth and how your equity changes over time.",
        },
        {
          id: "smart_home_alerts",
          label: "Smart-home and leak alerts",
          detail: "Connect sensors, thermostats and cameras so the app warns you about water leaks or problems.",
        },
        {
          id: "insurance_mortgage",
          label: "Insurance and mortgage shopping",
          detail: "Renewal reminders and quotes so you know you're not overpaying.",
        },
        {
          id: "project_planner",
          label: "Home project planner with budget and scheduling",
          detail: "Plan a renovation, track costs, and schedule contractors from start to finish.",
        },
        {
          id: "neighborhood_alerts",
          label: "Neighborhood alerts",
          detail: "Nearby sales, permits and local updates that could affect your home's value.",
        },
        {
          id: "energy_savings",
          label: "Energy and utility savings tips",
          detail: "Personalized ways to cut your energy use and bills, based on your home.",
        },
      ],
    },
  ],
};
