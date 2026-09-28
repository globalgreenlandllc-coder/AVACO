/** Words for gifts (lib/gifts.ts): the landing pitch, the builder, the giver's page and the recipient's page. */
export interface GiftText {
  nav: string;
  landing: { eyebrow: string; title: string; text: string; points: string[]; cta: string; from: string };
  form: {
    title: string; lead: string; yourName: string; yourNamePlaceholder: string; recipientName: string; recipientNamePlaceholder: string; recipientHelp: string; message: string; messagePlaceholder: string;
    reports: string; reportsHelp: string; industries: string; industriesHelp: string; matches: string; matchesHelp: string; best: string; bestHelp: string; total: string; pay: string; create: string; creating: string;
    signIn: string; signInFree: string; freeNote: string; secure: string; given: string; none: string;
  };
  status: { pending: string; paid: string; opened: string; claimed: string; recorded: string };
  giver: {
    eyebrow: string; someone: string; title: string; lead: string; paidNote: string; pendingNote: string; pendingCta: string; linkLabel: string; copy: string; copied: string;
    email: string; text: string; share: string; emailSubject: string; emailBody: string; smsBody: string; preview: string; whatNextTitle: string; whatNext: string[];
    contents: string; back: string; another: string;
  };
  recipient: {
    eyebrow: string; title: string; titleNamed: string; message: string; contentsTitle: string; reportItem: string; reportsItem: string; industryItem: string; industriesItem: string; matchItem: string; matchesItem: string; bestItem: string; bestsItem: string;
    noPay: string; stepsTitle: string; steps: string[]; claim: string; claimSignedIn: string; claimNote: string; claimedByYou: string; goRecord: string; myReports: string;
    claimedByOther: string; notReady: string; giverPreview: string; given: string; footer: string;
  };
  record: { title: string; text: string; left: string };
}

export const giftEn: GiftText = {
  nav: "Gift a report",
  landing: {
    eyebrow: "A gift",
    title: "Give someone their voice",
    text: "A voice report is a gift that says: I want to know who you are. You pay, we give you a private link, and the person you care about records thirty seconds and gets the full report, with your name and your words on it. Nothing to pay on their side.",
    points: ["Their personality type, emotional state and best fields of work, in full", "Add industry chapters on top, for the career they are in or dream of", "Send it by text, email or a QR code; it never expires"],
    cta: "Gift a report",
    from: "From {price}",
  },
  form: {
    title: "Gift a voice report",
    lead: "Choose what the gift holds, pay once, and you get a private link to send. Whoever opens it records their voice and gets everything below, free for them, with your name on it.",
    yourName: "Your first name",
    yourNamePlaceholder: "Robert",
    recipientName: "Their first name",
    recipientNamePlaceholder: "Laura",
    recipientHelp: "Optional: it appears on the gift page. Leave it empty if you want to decide later who gets it.",
    message: "A message from you",
    messagePlaceholder: "Happy birthday, Laura. I've always wanted to know what your voice says about you…",
    reports: "Voice reports",
    reportsHelp: "One is usually enough; more lets them record again on another day and compare.",
    industries: "Industry chapters",
    industriesHelp: "Each opens one industry of their choice on top of a report: the roles ranked for them, and their path in.",
    matches: "Match reports",
    matchesHelp: "Each lets them invite someone, a partner, a business partner, a colleague, family or a friend, with a private link: that person records too, and both get a match report on how the two of them fit.",
    best: "Best-match industry",
    bestHelp: "We assess their profile against every industry and show where they are most likely to excel, with their strongest role and the path to it.",
    total: "Total",
    pay: "Pay {price} and create the link",
    create: "Create the link",
    creating: "Creating your gift…",
    signIn: "Sign in to pay {price} and get the link",
    signInFree: "Sign in to create the link",
    freeNote: "Charging is off, so this gift costs nothing today.",
    secure: "Secure payment by Stripe. You come straight back to your gift link.",
    given: "Gifts you have given",
    none: "None yet.",
  },
  status: { pending: "Not paid yet", paid: "Ready to send", opened: "Opened, not claimed yet", claimed: "Claimed by {name}", recorded: "Recorded ✓" },
  giver: {
    eyebrow: "Your gift",
    someone: "someone you care about",
    title: "Send this link to {name}",
    lead: "It is private: only someone with the link can open it. They sign in, or create a free account, and the gift lands in their account: their report opens by itself after they record, nothing to pay.",
    paidNote: "Payment received. Your gift is ready to send.",
    pendingNote: "This gift has not been paid for yet, so the link does not work until it is.",
    pendingCta: "Pay now",
    linkLabel: "The gift link",
    copy: "Copy link",
    copied: "Copied",
    email: "Send by email",
    text: "Send by text",
    share: "Share…",
    emailSubject: "A gift for you: your voice report",
    emailBody: "Hi {name},\n\nI have a gift for you: your own AVOCO voice report. Open this link, record thirty seconds of your voice, and your report is yours. Nothing to pay.\n\n{link}\n\n{message}\n\n{giver}",
    smsBody: "{giver} has a gift for you: your own AVOCO voice report. Open the link, record 30 seconds, and it's yours, nothing to pay. {link}",
    preview: "See what {name} will see",
    whatNextTitle: "What happens next",
    whatNext: [
      "{name} opens the link and sees it is from you, with your message.",
      "They sign in or create a free account (that is where their report lives), and the gift is theirs.",
      "They record thirty seconds. The report opens by itself; no card, no credits, nothing to do.",
      "You see here when the link was opened, claimed and recorded. The link never expires.",
    ],
    contents: "Inside: {reports} voice report(s){industries}{matches}",
    back: "My reports",
    another: "Gift another",
  },
  recipient: {
    eyebrow: "A gift for you",
    title: "{giver} gave you your voice report",
    titleNamed: "{recipient}, {giver} gave you your voice report",
    message: "{giver} wrote:",
    contentsTitle: "What is inside",
    reportItem: "1 full voice report: your personality type with its complete portrait, your emotional state today, and the fields where you would do your best work",
    reportsItem: "{n} full voice reports: your personality type with its complete portrait, your emotional state today, and the fields where you would do your best work. Record again on another day and compare",
    industryItem: "1 industry chapter: pick any industry, and its roles are ranked for your voice, with your path in",
    industriesItem: "{n} industry chapters: pick any industries, and their roles are ranked for your voice, with your path in",
    matchItem: "1 match report: invite someone with a private link; they record too, and you both get a report on how well the two of you match",
    matchesItem: "{n} match reports: invite someone with a private link; they record too, and you both get a report on how well the two of you match",
    bestItem: "Your best-match industry: your profile assessed against every industry, with your strongest role and the path to it",
    bestsItem: "{n} best-match industry assessments: each finds, for one report, the industry and the role where you are most likely to excel",
    noPay: "Everything is paid for. You will never be asked for a card.",
    stepsTitle: "How it works",
    steps: [
      "Claim the gift: sign in, or create a free account in a minute. That is where your report will live.",
      "Record thirty seconds of speech, in any language, about anything. Only how you sound is measured.",
      "About a minute later your report opens by itself. It is yours to keep, download and print.",
    ],
    claim: "Claim my gift",
    claimSignedIn: "Claim my gift with this account",
    claimNote: "You are signed in as {email}. The gift will be added to this account.",
    claimedByYou: "This gift is in your account.",
    goRecord: "Record my voice",
    myReports: "My reports",
    claimedByOther: "This gift has already been claimed by someone else. If that should have been you, ask {giver} to check.",
    notReady: "This gift is not ready yet: {giver} has not finished paying for it.",
    giverPreview: "This is your gift, as {name} will see it. The claim button appears for them, not for you.",
    given: "Given on {date}",
    footer: "AVOCO reads how a voice sounds, not what it says. Not a medical, psychological or hiring assessment.",
  },
  record: {
    title: "A gift from {giver}",
    text: "Your report is a gift: it opens by itself once your voice is analysed, nothing to pay.",
    left: "{n} report(s) left in the gift",
  },
};
