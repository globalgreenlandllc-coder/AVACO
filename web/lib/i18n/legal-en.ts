/**
 * The privacy policy and the terms of service. Written from what the platform really does (see lib/gateway.ts,
 * lib/workspaces.ts, lib/billing.ts and the gateway's avoco.ts), so every sentence can be checked against code.
 * Placeholders: {operator} {email} {site} {law} {updated} {version} {price}; lib/legal.ts fills them in.
 * Section anchors are NOT in here (they would be sent to the translator): see LEGAL_SLUGS in lib/legal.ts.
 */

export interface LegalTable { head: string[]; rows: string[][] }
export interface LegalSection { title: string; paras: string[]; bullets?: string[]; after?: string[]; table?: LegalTable }
export interface LegalDocText { title: string; lead: string; inShort: string[]; sections: LegalSection[] }

export interface LegalDict {
  nav: { legal: string; privacy: string; terms: string; api: string };
  updated: string;
  contents: string;
  inShort: string;
  inShortNote: string;
  languageNote: string;
  controls: { title: string; reports: string; email: string; privacy: string; terms: string };
  agree: { before: string; terms: string; and: string; privacy: string };
  workspaceNotice: string;
  workspaceNoticeLink: string;
  privacy: LegalDocText;
  terms: LegalDocText;
}

export const legalEn: LegalDict = {
  nav: { legal: "Legal", privacy: "Privacy policy", terms: "Terms of service", api: "Company API" },
  updated: "Last updated {updated} · version {version}",
  contents: "Contents",
  inShort: "In short",
  inShortNote: "A plain-language summary. The full text below is what counts.",
  languageNote: "This translation is provided for convenience. If it differs from the English text, the English text applies.",
  controls: {
    title: "Your controls",
    reports: "My reports: download or delete a report with its recording",
    email: "Write to us about your data",
    privacy: "Read the privacy policy",
    terms: "Read the terms of service",
  },
  agree: { before: "By creating an account you agree to the", terms: "terms of service", and: "and the", privacy: "privacy policy" },
  workspaceNotice: "By creating a workspace you accept the terms for companies: every person you record has agreed first, and a report is never the sole basis for a decision about them.",
  workspaceNoticeLink: "Terms for companies",

  privacy: {
    title: "Privacy policy",
    lead: "This policy explains what AVOCO collects when you use {site}, why, where it goes and what you can do about it. It is written to be read, not skimmed. If anything is unclear, write to {email}.",
    inShort: [
      "Your voice is analysed only after you tick the consent box. Nothing you say is transcribed: the analysis measures how the voice sounds, not the words.",
      "The recording and the report are private to your account. When a company invited you, that company sees them too, and the policy says exactly what it sees.",
      "You can delete a report together with its recording yourself, at any time, for good.",
      "We do not sell personal data, we show no advertising, and there are no tracking or analytics cookies on this site.",
      "The recording is sent to the analysis provider under a random job number, without your name or email.",
      "AVOCO is for adults. A person under 18 can be recorded only where a parent or guardian has agreed.",
    ],
    sections: [
      {
        title: "Who we are",
        paras: [
          "AVOCO at {site} is operated by {operator} (\"we\"). We decide what personal data this site collects and how it is used, so we are the controller in the sense of the European and British data-protection laws, and the business in the sense of the Californian ones.",
          "The voice-analysis technology (\"AVOCO\", the vocal psychotyping system) is developed by Voxera and licensed to us. Voxera computes the scores from a recording on our behalf and receives no information about who you are; see \"Where your data goes\".",
          "Questions, requests and complaints about your data: {email}. We answer within 30 days, usually much sooner.",
        ],
      },
      {
        title: "What we collect",
        paras: ["Only what the service needs to work. In detail:"],
        bullets: [
          "Account data. When you sign up, our sign-in provider (Clerk) collects your email address, your name if you give one, the sign-in method you chose (a password or a Google or similar account) and when you signed in. We see your email, name and an account number.",
          "Voice recordings. The audio you record in the browser or upload: 30 seconds to 5 minutes of speech. If you upload a video, its voice track is extracted on your device; the video itself never leaves your computer or phone.",
          "The consent you gave. The date and time you ticked the consent box are stored with each recording, as proof that the analysis was requested.",
          "Analysis results. Your scores on eight personality types and fourteen emotional-state scales, and the fields of work the platform calculates from them. Together they are your report.",
          "Company workspaces. When someone creates a workspace: its name, industry, its members' account numbers, its groups, and for every person the company records, the name and optional email the company typed in, their recordings and results. Companies with API access also get a key, of which we keep only a fingerprint.",
          "Purchases. When you buy report credits: the pack, the amount, the currency, a Stripe reference and the running credit balance. Card numbers never reach us: Stripe takes the payment on its own pages.",
          "Technical data. Like every website, our hosting keeps short-lived server logs with your IP address, browser type and the pages requested, for security and troubleshooting. We keep no browsing profile.",
          "Anonymous statistics. For every finished report, one row saying which type led and which field came first, without any link to a person. These help us see the product being used and cannot be traced back to you.",
        ],
        after: [
          "What we do not collect: a transcript of your words, a voiceprint that could identify you, your location, your contacts, or advertising identifiers.",
        ],
      },
      {
        title: "Why we use it, and on what legal basis",
        paras: ["Each use has one purpose, and where the law asks for a legal basis, this is it:"],
        bullets: [
          "To analyse your voice and build your report: your explicit consent, given by ticking the box before each analysis. You withdraw it by deleting the report; the analysis itself cannot be undone, but its results and the recording are gone.",
          "To run your account, keep your reports, and show them to you: performance of our agreement with you (the terms of service).",
          "To take payments, keep accounts and answer support questions: performance of the agreement and our legal obligations to keep accounting records.",
          "To keep the service secure and prevent abuse (rate limits, logs, blocking misuse): our legitimate interest in running a safe service, which does not override your rights.",
          "To understand how the product is used, in aggregate: our legitimate interest, using anonymous statistics only.",
          "Nothing else. We do not use your recordings to train models, we do not build advertising profiles, and we do not sell or rent personal data.",
        ],
      },
      {
        title: "How the voice analysis works, and what it is not",
        paras: [
          "The analysis measures acoustic properties of the recording: tempo, pitch and its movement, dynamics, pauses, timbre. It compares them with reference patterns and returns numbers from 0 to 100 for eight personality types and fourteen emotional-state scales. The words are not recognised, and the result is not a diagnosis.",
          "Because a voice is personal, we treat every recording as sensitive data regardless of what the law of your country calls it: no analysis runs without your ticked consent, the recording is never shown to anyone but you (and the company that invited you), and you can delete it at any time.",
          "The analysis does not identify you. No voiceprint or template for recognising you is created or kept, and the same recording could not be used to find you among other people. We keep the recording only as the source of your report; delete the report and the recording goes with it.",
          "We make no decisions about you with legal or similarly significant effects. A company that uses reports is bound by our terms not to make hiring, promotion, grading or dismissal decisions on a report alone.",
        ],
      },
      {
        title: "Where your data goes",
        paras: ["We use a small number of service providers, each for one task, and each receives only what that task needs. None of them may use your data for their own purposes."],
        table: {
          head: ["Provider", "What it does for us", "What it receives", "Where"],
          rows: [
            ["Voxera (AVOCO technology)", "Computes the scores from a recording", "The audio, a random job number and the address to send the result to. No name, no email, no account number.", "Kazakhstan"],
            ["Vercel", "Hosts the site, stores the audio files, keeps short-lived logs", "Everything the site needs to run; audio files under long, unguessable addresses", "United States"],
            ["Neon", "The database", "Accounts' numbers, reports, workspaces, credits", "United States (AWS, N. Virginia)"],
            ["Clerk", "Sign-up and sign-in", "Your email, name, sign-in method and session", "United States"],
            ["Stripe", "Card payments", "Your email and the purchase; your card details go to Stripe only", "United States"],
          ],
        },
        after: [
          "If you are in the European Economic Area, the United Kingdom or Switzerland, this means your data is transferred abroad. We rely on the providers' standard contractual clauses and equivalent commitments for those transfers, and on your explicit consent for the recording sent to the analysis provider. Write to us if you want a copy of the safeguards.",
          "We disclose data beyond this list only when the law requires it, to protect someone's safety or our rights, or if the business is sold, in which case this policy continues to apply to your data.",
        ],
      },
      {
        title: "When a company invited you",
        paras: [
          "Companies use AVOCO to understand candidates, teams, sales people, agents, students or clients. If you received a link from a company, this is how it works:",
        ],
        bullets: [
          "The company decides why you are recorded and is responsible for that decision under the law that applies to it. We process your recording on the company's behalf and on the basis of the consent you give on the recording page.",
          "The company sees your name and the email it entered, your recording and your report. Other participants never see your data. The company may hide the emotional-state part for everyone in a workspace, and in some settings must.",
          "Your link stays yours. From it you can read your report and delete your recording and report for good; the company then loses them too.",
          "Our terms oblige the company not to use a report as the sole basis for a decision about you and to tell you so where such decisions are made. If a company breaks that, tell us at {email}.",
          "A person under 18 can take part only where the company has confirmed that a parent or guardian agreed.",
        ],
      },
      {
        title: "How long we keep it",
        paras: ["Nothing is kept \"just in case\". This is the schedule:"],
        table: {
          head: ["Data", "Kept until", "How to remove it"],
          rows: [
            ["Recording and report", "You delete them, or the company deletes the group or workspace they belong to", "\"Delete report and audio\" in the report; the audio file is removed in the same step"],
            ["A recording that could not be analysed", "You delete it; it is never charged for", "The same button"],
            ["Account", "You close it", "Write to {email}, and we remove the account and everything in it"],
            ["Workspace data", "The company deletes the workspace, or its last administrator closes their account", "Workspace settings"],
            ["Purchases and credit history", "As long as accounting law requires, usually seven years", "Cannot be deleted earlier; it is kept only for bookkeeping"],
            ["Server logs", "A few days", "Expire on their own"],
            ["Anonymous statistics", "Indefinitely; they contain no link to a person", "Not applicable"],
          ],
        },
      },
      {
        title: "Cookies",
        paras: ["This site uses three cookies, all of them necessary. There are no advertising, tracking or analytics cookies, and fonts are served from our own site, so no font provider sees your visit."],
        table: {
          head: ["Cookie", "Set by", "Purpose", "Lifetime"],
          rows: [
            ["__session, __client_uat", "Clerk", "Keeps you signed in and checks the session on every page", "__session while you are signed in (a session lasts up to 7 days); __client_uat one year"],
            ["lang", "AVOCO", "Remembers the language you picked", "One year"],
          ],
        },
        after: ["Because we do not track you, there is nothing to opt out of; browser \"Do Not Track\" and \"Global Privacy Control\" signals need no separate handling, and we honour them by default."],
      },
      {
        title: "Your rights and how to use them",
        paras: [
          "Wherever you live, you can see, download, correct and delete what we hold about you. Most of it you can do yourself, right now:",
        ],
        bullets: [
          "See and download: every report has a \"Download report\" button that gives you the complete report as one file, and \"Save as PDF\" a version for paper.",
          "Delete: \"Delete report and audio\" removes the report and the recording for good. To close the whole account, write to {email}.",
          "Correct: your name and email are edited in your account menu.",
          "Withdraw consent: deleting a report withdraws the consent for that recording.",
        ],
        after: [
          "If you are in the European Economic Area or the United Kingdom, you also have the rights to restrict or object to processing, to data portability, and to complain to your data-protection authority. We would rather hear from you first, but that right is yours regardless.",
          "If you live in California or another US state with a privacy law, you have the rights to know, to access, to correct, to delete, and to opt out of sale or sharing. We do not sell or share personal data for advertising, and we never treat you differently for using your rights. You may authorise someone to act for you; we will verify the request through your account email.",
          "If you live in a state with a biometric-privacy law (such as Illinois, Texas or Washington): we do not create voiceprints or any identifier from your voice. Even so, we obtain your written consent through the consent box, we keep this retention schedule public, we never sell recordings, and we delete a recording on request.",
          "To use any right, write to {email} from the email on your account. We reply within 30 days (45 for Californian requests where the law allows), and we never charge for it.",
        ],
      },
      {
        title: "Security",
        paras: [
          "Everything travels over encrypted connections. Recordings are stored under long random addresses that appear nowhere but in your own report, reports are tied to your account number and every request checks that the report belongs to the person asking. Passwords are handled by Clerk and never stored by us; keys and secrets on the server are stored encrypted.",
          "No system is perfectly secure. If a breach ever affects your data, we will tell you and the authorities as the law requires, without undue delay.",
        ],
      },
      {
        title: "Children",
        paras: [
          "You must be 18 or older to create an account. A person under 18 can be recorded only through a company workspace whose setting requires the company to confirm that a parent or guardian agreed. If you believe we hold a child's recording without that agreement, write to {email} and we will delete it.",
        ],
      },
      {
        title: "Changes to this policy",
        paras: [
          "When we change this policy, the date and version at the top change with it, and we keep the previous version available on request. If a change reduces your rights or adds a new use of your data, we tell you inside the app or by email before it takes effect.",
        ],
      },
      {
        title: "Contact",
        paras: ["{operator}, the operator of AVOCO at {site}. Email: {email}."],
      },
    ],
  },

  terms: {
    title: "Terms of service",
    lead: "These terms are the agreement between you and {operator} for using AVOCO at {site}: the site, the reports, the company workspaces and the API. Please read them; they are short on purpose.",
    inShort: [
      "You must be 18 or older, and you record only your own voice or a person who agreed to it.",
      "A report is an insight into how a voice sounds. It is not a medical, psychological or hiring assessment, and never the sole basis for a decision about a person.",
      "One credit opens one full report. A recording that could not be analysed costs nothing. Unused credits can be refunded within 14 days.",
      "Companies are responsible for lawful use with their people: informed consent first, no decisions on a report alone, and no emotion analysis at work or in education where the law forbids it.",
      "You own your recordings; we use them only to make your report. The platform and the report texts are ours.",
      "We may suspend accounts that break these terms, and our liability is limited as set out below.",
    ],
    sections: [
      {
        title: "The agreement",
        paras: [
          "By creating an account, recording or uploading a voice, opening a company workspace or calling the API, you accept these terms and our privacy policy. If you act for a company, you confirm that you may bind it, and \"you\" includes that company.",
          "You must be 18 or older. If you do not agree with these terms, do not use AVOCO.",
        ],
      },
      {
        title: "What AVOCO is, and is not",
        paras: [
          "AVOCO measures how a voice sounds and returns a report: scores on eight personality types and fourteen emotional-state scales, the official description of the leading type, and the fields of work the platform calculates from the scores. The same recording always gives the same result; a different day may give a different emotional state.",
          "AVOCO is not a medical device, not a psychological or psychiatric assessment, not a lie detector and not a hiring test. It gives no advice on health, employment, finance or law. A report describes patterns in one recording; it does not define a person, and we make no promise that it is accurate or complete for any particular purpose.",
        ],
      },
      {
        title: "Your account",
        paras: [
          "Keep your sign-in details to yourself and tell us at {email} if you think someone else is using your account. You are responsible for what happens under it. One person, one account; give us accurate information and keep your email current, because that is how we reach you.",
        ],
      },
      {
        title: "Recordings",
        paras: ["Every recording you send must follow these rules:"],
        bullets: [
          "It is your own voice, or the voice of a person who knows what AVOCO does and has agreed to be analysed. Recording a call, a meeting or a conversation and sending it without the speaker's agreement is forbidden, and in many places illegal.",
          "It contains one person speaking, 30 seconds to 5 minutes, and nothing unlawful, threatening or abusive.",
          "It is not sent to impersonate someone, to test the service against a person's will, or to attack the service.",
        ],
        after: [
          "We may refuse or remove a recording that breaks these rules and close the account that sent it. You remain the owner of your recordings; you grant us the licence needed to store them, send them to the analysis provider, produce your report and show it to you, and nothing more. Deleting a report ends that licence for its recording.",
        ],
      },
      {
        title: "Using a report",
        paras: ["Reports are for understanding people and talking with them better. You may keep, download, print and share your own report as you like. You may not:"],
        bullets: [
          "Use a report as the sole basis for a decision about a person's employment, promotion, grading, dismissal, credit, insurance, housing or access to services.",
          "Use AVOCO to treat people differently because of a protected characteristic, or to profile people without their knowledge.",
          "Use AVOCO for surveillance, law enforcement, or to assess people who do not know they are being assessed.",
          "Use the emotional-state analysis on people at work or in education where the law prohibits it (for example under the EU Artificial Intelligence Act). A workspace can hide the emotional-state part for that reason.",
          "Copy, scrape, resell or republish the report texts and type descriptions, reverse-engineer the service, or overload it.",
        ],
      },
      {
        title: "Credits, prices and refunds",
        paras: [
          "A full report is opened with one credit. Credits are bought in packs at the prices shown at the time of purchase, in the currency shown; taxes are added where they apply. Credits have no cash value, cannot be transferred to another account and do not expire.",
          "During the launch, full reports may be free; the site says so when that is the case. When paid, you can record for free and see your leading type first, and a credit is used only when you open the full report. A recording that could not be analysed is never charged.",
          "If you bought credits by mistake, write to {email} within 14 days and we refund the unused ones. A credit that has opened a report is used and cannot be refunded. Promo codes are personal and can be withdrawn if misused. Payments are processed by Stripe under its own terms.",
        ],
      },
      {
        title: "Terms for companies",
        paras: ["A workspace lets a company invite people, collect recordings and read their reports. Every company using a workspace or the API agrees to the following, and is responsible for its members and API keys:"],
        bullets: [
          "Consent first. Before a person is recorded, the company tells them what AVOCO does, who will see the report and for what purpose, and obtains their informed agreement. The consent box on the recording page and the consent flag in the API are the company's confirmation that this happened.",
          "The company is the controller of its participants' data and must have a lawful basis for the analysis under the laws that apply to it, including biometric-privacy laws in some US states. We process the data on the company's instructions, as described in the privacy policy.",
          "No decisions on a report alone. A report may inform a conversation, an interview or a coaching plan; it may not decide hiring, promotion, grading, dismissal or pay by itself. Where the company makes such decisions, it must tell the person that a voice analysis was part of the picture and give them a chance to respond.",
          "Emotional state at work and in education. Where the law prohibits inferring emotions of employees or students, the company must turn on \"hide emotional state\" for that workspace and must not use that part of the analysis. This applies in the European Union.",
          "Minors. A person under 18 may be recorded only in a workspace whose setting requires it, and only after a parent or guardian has agreed. The company is responsible for that agreement.",
          "Respecting the person. Participants keep the right to read their own report and to delete their recording and report; the company will not obstruct that. The company deletes participants' data when it no longer needs it and whenever a participant asks.",
          "Limits. Workspaces have a monthly report limit and credits; recordings sent above the limit are refused, not queued.",
        ],
        after: [
          "A company indemnifies us against claims arising from its use of AVOCO with people who were not properly informed, or from decisions it made on the basis of reports.",
        ],
      },
      {
        title: "The API",
        paras: [
          "API keys are issued in a workspace and must stay on the company's servers, never in a browser or a mobile app. Each request must carry the consent confirmation. We may change the API with reasonable notice and may throttle or suspend keys that overload the service or break these terms.",
        ],
      },
      {
        title: "Intellectual property",
        paras: [
          "The platform, its design, the report texts, the type descriptions and the AVOCO name belong to us or to our licensors, and are protected by copyright and trademark law. You may use them to read and share your own reports, and companies may use them inside their workspaces. Any other use needs our written permission. Your recordings and the scores computed from them are yours.",
        ],
      },
      {
        title: "Availability and changes",
        paras: [
          "We aim to keep AVOCO available at all times, but it depends on an external analysis service. When that service is unavailable, recordings wait in a queue and are analysed automatically once it is back; a recording that cannot be analysed within a day is marked as failed and is not charged. We may add, change or remove features, and we will give reasonable notice before removing anything you have paid for.",
        ],
      },
      {
        title: "Ending the agreement",
        paras: [
          "You may stop using AVOCO at any time, delete your reports and ask us at {email} to close your account. We may suspend or close an account that breaks these terms, that is used to harm others, or that the law requires us to close; where reasonable we warn first. Unused credits are refunded when we close an account without cause. Sections on intellectual property, disclaimers, liability and disputes survive the end of the agreement.",
        ],
      },
      {
        title: "Disclaimers",
        paras: [
          "AVOCO is provided \"as is\" and \"as available\". To the extent the law allows, we make no warranties, express or implied, including of accuracy, fitness for a particular purpose or uninterrupted availability. Nothing in a report is advice, and you use it at your own judgement. Nothing in these terms limits rights that consumer law gives you and that cannot be limited by agreement.",
        ],
      },
      {
        title: "Limitation of liability",
        paras: [
          "To the extent the law allows, we are not liable for indirect, incidental, special or consequential damages, for lost profits or data, or for decisions made by you or by third parties on the basis of a report. Our total liability for everything arising from these terms is limited to the amount you paid us in the twelve months before the claim, or 100 US dollars, whichever is greater. This limitation does not apply to liability that cannot be limited by law, including for our fraud, gross negligence or wilful misconduct.",
        ],
      },
      {
        title: "Governing law and disputes",
        paras: [
          "These terms are governed by the laws of {law}, without regard to conflict-of-law rules, and disputes are brought before its courts. If you are a consumer, you keep the protection of the mandatory laws of the country where you live and may bring a claim there. Before going to court, write to {email}: most issues are settled in a few emails.",
        ],
      },
      {
        title: "Changes to these terms",
        paras: [
          "We may update these terms. The date and version at the top change with every update, and if a change materially affects your rights, we tell you inside the app or by email at least 14 days before it takes effect. Continuing to use AVOCO after that date means you accept the updated terms.",
        ],
      },
      {
        title: "Contact",
        paras: ["{operator}, the operator of AVOCO at {site}. Email: {email}."],
      },
    ],
  },
};
