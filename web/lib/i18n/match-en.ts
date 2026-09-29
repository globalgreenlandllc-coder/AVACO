/** Words for the relationship match (lib/match.ts). Keys must match the rules there; a test checks that. */
import type { Category, Role, TypeKey } from "../match";
import type { KindWords, MatchKind } from "../match-kind";
import { matchKindWordsEn } from "./match-kind-words";

export interface MatchText {
  categories: Record<Category, { name: string; blurb: string; brings: Record<TypeKey, string>; tip: string }>;
  /** "a|b" (sorted) → a short note on the pair of leading types. The Catalyst row is AVOCO's official wording. */
  pairNotes: Record<string, string>;
  /** "category:a|b" → why this pair clicks or clashes there. Only for pairs the rules adjust. */
  frictions: Record<string, string>;
  roles: Record<Role, { name: string; text: string; none: string }>;
  bands: Record<"natural" | "strong" | "complementary" | "challenging", { title: string; text: string }>;
  today: { tense: string; reserved: string; steady: string };
  /** Who the two are to each other: the words of the pages and the areas read, per kind (lib/match-kind.ts). */
  kinds: Record<MatchKind, KindWords>;
  /** "Works for" before the list of kinds, on the offer. */
  worksFor: string;
}

export const matchEn: MatchText = {
  categories: {
    romance: { name: "Romance and attraction", blurb: "The spark, and whether it keeps being lit.", tip: "Plan one thing a month that is only for the two of you, and let the more expressive partner choose it.",
      brings: { organizer: "steadiness and gestures that are planned, not improvised", driver: "intensity and the pull of someone who knows what they want", catalyst: "surprise, play and the feeling that nothing is boring", performer: "charm, drama and moments made to be remembered", harmonizer: "tenderness and attention to the small things", analyst: "a quiet, original devotion that shows in deeds", skeptic: "constancy rather than fireworks", mediator: "depth and a love that means something" } },
    warmth: { name: "Warmth and emotional support", blurb: "Who notices when the other is not okay, and what happens next.", tip: "Agree on a signal for \"I need you to just listen\", and honour it before offering solutions.",
      brings: { organizer: "reliable presence, more than words", driver: "protection and fixing the problem", catalyst: "cheering up and changing the subject", performer: "big emotions, generously shared", harmonizer: "the ability to feel what the other feels", analyst: "attention when asked, distance when not", skeptic: "loyal care that watches for what could go wrong", mediator: "listening without judgement" } },
    communication: { name: "Communication and conflict", blurb: "How disagreements start, how they end, and who says sorry.", tip: "Take conflicts out of the moment: a fixed half hour later, sitting down, one topic.",
      brings: { organizer: "clear rules and a wish to settle things", driver: "directness, and the will to win the argument", catalyst: "humour that defuses, and a habit of changing the subject", performer: "expressiveness that can turn into a scene", harmonizer: "softness and the search for peace", analyst: "logic, and silence when it gets emotional", skeptic: "precision, and remembering every detail", mediator: "patience, and withdrawing when hurt" } },
    home: { name: "Home and everyday life", blurb: "Bills, dishes, plans, order: the unglamorous part that decides most days.", tip: "Split the household by who minds a task least, not evenly; write it down once.",
      brings: { organizer: "systems that keep the home running", driver: "decisions and the big purchases", catalyst: "energy in bursts, and a tolerance for mess", performer: "a beautiful home when it matters, chaos in between", harmonizer: "comfort and care for how the home feels", analyst: "solving the practical puzzles, ignoring the routine", skeptic: "order, checks and things done properly", mediator: "calm, and a low need for things" } },
    providing: { name: "Providing and money", blurb: "Earning, spending, saving, and who worries about it.", tip: "One shared account for the household, one private each, and a monthly ten-minute money talk.",
      brings: { organizer: "planning and control of the budget", driver: "earning power and appetite for more", catalyst: "opportunities, and spending on them", performer: "generosity and a taste for the good life", harmonizer: "modest needs and care for the family's comfort", analyst: "frugality by indifference", skeptic: "caution, savings and no surprises", mediator: "little interest in money as a goal" } },
    ambition: { name: "Ambition and shared goals", blurb: "Where the two of you are going, and whether you pull the same way.", tip: "Write one shared five-year picture together, in ten sentences, and revisit it each birthday.",
      brings: { organizer: "a plan and the discipline to follow it", driver: "a big goal and the drive to reach it", catalyst: "new ventures, one after another", performer: "visibility, recognition and a name", harmonizer: "support for the other's goals", analyst: "mastery of something difficult", skeptic: "quality and steady improvement", mediator: "meaning over achievement" } },
    fun: { name: "Fun, freedom and adventure", blurb: "Laughter, travel, spontaneity, and how much room each needs.", tip: "Protect each partner's own time and own friends; the two of you get stronger when both come back with stories.",
      brings: { organizer: "well-organised trips and traditions", driver: "bold plans and pace", catalyst: "spontaneity, parties and new people", performer: "shows, scenes and a talent for enjoying life", harmonizer: "warm evenings with close friends", analyst: "curiosity and unusual interests", skeptic: "quiet pleasures, carefully chosen", mediator: "nature, art and slow time" } },
    loyalty: { name: "Loyalty and trust", blurb: "Constancy, jealousy, promises kept.", tip: "Say out loud what counts as a betrayal for each of you; it is rarely the same list.",
      brings: { organizer: "principles and a code", driver: "possessiveness and protection", catalyst: "sincerity in the moment, and a wide social life", performer: "devotion with an audience, and a need to be admired", harmonizer: "faithfulness and moral scruple", analyst: "steadiness, once committed", skeptic: "reliability and a word that is kept", mediator: "loyalty to the person and to the ideal" } },
    family: { name: "Family and parenting", blurb: "Children, relatives, and the home as a base.", tip: "Decide the two or three rules you both will never bend on; let everything else flex.",
      brings: { organizer: "structure, routines and safety", driver: "ambition for the children and standards", catalyst: "play, adventure and lightness", performer: "celebration and self-confidence", harmonizer: "warmth and emotional security", analyst: "curiosity and independence", skeptic: "care, health and caution", mediator: "acceptance and depth" } },
  },
  pairNotes: {
    "organizer|organizer": "shared order, risk of rigidity", "driver|organizer": "power with structure", "catalyst|organizer": "structure interferes", "organizer|performer": "a frame for the star", "harmonizer|organizer": "order and warmth", "analyst|organizer": "respect at a distance", "organizer|skeptic": "both value doing it right", "mediator|organizer": "calm, different priorities",
    "driver|driver": "two leaders, one throne", "catalyst|driver": "leaders duo", "driver|performer": "power and shine", "driver|harmonizer": "drive and warmth", "analyst|driver": "respect, little overlap", "driver|skeptic": "speed against caution", "driver|mediator": "force meets depth",
    "catalyst|catalyst": "energy match", "catalyst|performer": "bright and happy", "catalyst|harmonizer": "support each other", "analyst|catalyst": "too different", "catalyst|skeptic": "calmness might tire", "catalyst|mediator": "inspire with wisdom",
    "performer|performer": "two stars on one stage", "harmonizer|performer": "the star and the admirer", "analyst|performer": "fascination, then neglect", "performer|skeptic": "critique stings", "mediator|performer": "art and its quiet audience",
    "harmonizer|harmonizer": "gentle, may avoid decisions", "analyst|harmonizer": "warmth that reaches the inner world", "harmonizer|skeptic": "care and reliability", "harmonizer|mediator": "deep and gentle",
    "analyst|analyst": "parallel worlds", "analyst|skeptic": "intellect and rigour", "analyst|mediator": "two inner worlds meet",
    "skeptic|skeptic": "double caution, slow to move", "mediator|skeptic": "calm and loyal",
    "mediator|mediator": "deep, and easily becalmed",
  },
  frictions: {
    "romance:catalyst|performer": "Two people who live for the moment: the romance takes care of itself.", "romance:skeptic|skeptic": "Neither will make the first move or the grand gesture; romance needs to be scheduled here, and that is fine.", "romance:organizer|skeptic": "Solid and safe, but someone has to decide to be spontaneous.", "romance:analyst|analyst": "Two rich inner worlds that may forget to meet in the outer one.",
    "warmth:driver|driver": "Both fix problems instead of feeling them; nobody is holding the room.", "warmth:harmonizer|mediator": "Each feels the other before a word is said.", "warmth:analyst|skeptic": "Support arrives as analysis and worry, not as comfort.",
    "communication:driver|driver": "Every disagreement is a contest, and neither concedes. The one who can lose an argument on purpose wins the relationship.", "communication:catalyst|skeptic": "One jokes and moves on, the other remembers everything. The joke lands as dismissal.", "communication:catalyst|organizer": "Rules against freedom: the same argument in different clothes.", "communication:driver|harmonizer": "One states, the other softens; conflicts end because someone knows how to end them.", "communication:catalyst|driver": "Fast, frank and forgiving; fights are loud and short.", "communication:driver|performer": "Two people who need to be heard first.",
    "home:catalyst|catalyst": "Nobody owns the boring parts. Hire help or the mess becomes the argument.", "home:performer|performer": "Beautiful when guests come, chaos in between.", "home:organizer|skeptic": "A well-run home, done properly.", "home:catalyst|performer": "Great for parties, weak on Tuesdays.",
    "providing:catalyst|catalyst": "Money comes in waves and leaves the same way; someone must play the treasurer.", "providing:catalyst|performer": "Both spend on the good life and on opportunities; savings need a rule.", "providing:organizer|skeptic": "Budgeted, saved, checked.", "providing:driver|organizer": "One earns and decides, one plans and holds; a strong pairing for building.", "providing:mediator|mediator": "Money is not the point for either; make sure someone still minds it.",
    "ambition:driver|driver": "Two engines; a lot gets built if the goals point the same way.", "ambition:mediator|mediator": "Meaning matters more than results for both; contentment, or drift.", "ambition:harmonizer|mediator": "Warm and deep, with little appetite for the climb.", "ambition:catalyst|driver": "Ideas plus drive; the classic founding couple.",
    "fun:skeptic|skeptic": "Rest is the shared pleasure; adventure has to be imported.", "fun:organizer|skeptic": "Well-planned, low-risk, repeatable holidays.", "fun:catalyst|performer": "Life is a party and both are the hosts.", "fun:organizer|organizer": "Fun follows the plan; spontaneity is rare and welcome.",
    "loyalty:catalyst|catalyst": "Both flirt, both roam socially; trust needs explicit agreements.", "loyalty:catalyst|performer": "Two charmers; jealousy is the likely third party.", "loyalty:mediator|skeptic": "Two of the most faithful types: promises are kept.", "loyalty:organizer|skeptic": "A word given is a word kept, on both sides.",
    "family:catalyst|performer": "Wonderful, exciting parents who will need a routine imposed from somewhere.", "family:harmonizer|organizer": "Warmth inside a structure: what children need most.", "family:driver|harmonizer": "Standards and protection with tenderness.",
  },
  roles: {
    engine: { name: "The engine", text: "{name} sets the pace, starts things and pushes when the two of you stall.", none: "Neither of you naturally pushes; decide who starts things, or they wait." },
    anchor: { name: "The anchor", text: "{name} keeps the pair steady: order, routine, the ground under the plans.", none: "Nobody here is the anchor; routines and order will need an outside structure." },
    peacemaker: { name: "The peacemaker", text: "{name} feels the room, softens edges and ends the fights.", none: "Neither of you smooths things over naturally, so fights last longer than they need to." },
    planner: { name: "The planner", text: "{name} thinks ahead, arranges and remembers what is due.", none: "Planning is nobody's instinct here; a shared calendar is not optional." },
    treasurer: { name: "The treasurer", text: "{name} minds the money and asks the uncomfortable question.", none: "Neither of you watches the money by nature; automate savings before you need them." },
  },
  bands: {
    natural: { title: "A natural match", text: "{a} and {b} pull the same way and give each other what each needs most. The frictions are few and named below; they are habits, not walls." },
    strong: { title: "A strong match, with work in a few areas", text: "{a} and {b} fit well where it matters most. Two or three areas below will ask for effort; pairs like this do best when they name those areas early instead of discovering them." },
    complementary: { title: "Complementary, and demanding", text: "{a} and {b} are each other's missing half, which is exactly where the arguments live. This can be one of the strongest pairings there is, if both accept that the other is not going to become like them." },
    challenging: { title: "A challenging pairing", text: "{a} and {b} want different things from life and from each other, and say them in different languages. It can work, and some such pairs are the most interesting ones, but it needs deliberate rules: how you argue, who decides what, and what each of you gives up." },
  },
  today: { tense: "{name} sounds tense in this recording (composure {calm}): not the week for big decisions about each other.", reserved: "{name} sounds reserved in this recording (warmth {warmth}); read the softer categories above with that in mind.", steady: "{name} sounds steady and warm in this recording." },
  worksFor: "Works for",
  kinds: {
    couple: {
      label: "A couple", hint: "Partners, spouses, dating: any two people in love.", who: "your partner",
      title: "How well do you two match?", lead: "Invite your partner to record a minute of their voice on a private link. You both get their report, and a compatibility report on top: your match score, nine areas of a relationship, who holds which role, where you naturally connect, where you complement each other and where differences may create friction.",
      eyebrow: "Add-on · Relationship & Compatibility", areasTitle: "Nine areas of a relationship", partnerName: "Your partner's first name", swap: [], words: matchKindWordsEn.couple, categories: {},
    },
    business: {
      label: "Business partners", hint: "Co-founders, co-owners, two people building something together.", who: "your business partner",
      title: "How well do you work together?", lead: "Invite your business partner to record a minute of their voice on a private link. You both get their report, and a compatibility report on top: your match score, six areas of a partnership, who holds which role, where you naturally connect, where you complement each other and where differences may create friction.",
      eyebrow: "Add-on · Relationship & Compatibility", areasTitle: "Six areas of a partnership", partnerName: "Your business partner's first name",
      swap: [["Invite my partner", "Invite my business partner"], ["Your partner's", "Your business partner's"], ["your partner's", "your business partner's"], ["your partner", "your business partner"], ["my partner", "my business partner"], ["Nine areas of a relationship", "Six areas of a partnership"]],
      words: matchKindWordsEn.business, categories: {
        warmth: { name: "Support under pressure", blurb: "Who notices when the other is overloaded, and what happens next.", tip: "Agree a signal for \"I'm at the limit\", and treat it as a fact, not a complaint." },
        providing: { name: "Money and resources", blurb: "Earning, spending, investing, and who worries about the numbers.", tip: "Ownership shares written down, one account for the business, and a monthly numbers meeting nobody skips." },
        ambition: { name: "Goals and growth", blurb: "Where the two of you are taking this, and whether you pull the same way.", tip: "Write one shared three-year picture, then name which goals are the company's and which are each of yours." },
        fun: { name: "Energy and time off", blurb: "Pace, breaks, and how much room each of you needs.", tip: "Protect each partner's time off; the business gets stronger when both come back with ideas." },
        loyalty: { name: "Trust and reliability", blurb: "Promises kept, credit shared, and what counts as a betrayal.", tip: "Say out loud what counts as a betrayal in this partnership; it is rarely the same list." },
        communication: { name: "Communication and conflict", blurb: "How disagreements start, how they end, and who gives way.", tip: "Take disagreements out of the moment: a fixed half hour later, one topic, and the decision written down." },
      },
    },
    colleagues: {
      label: "Colleagues", hint: "Two people who work side by side: a manager and a report, teammates, a duo.", who: "your colleague",
      title: "How well do you two work together?", lead: "Invite your colleague to record a minute of their voice on a private link. You both get their report, and a compatibility report on top: your match score, five areas of working together, who holds which role, where you naturally connect, where you complement each other and where differences may create friction.",
      eyebrow: "Add-on · Relationship & Compatibility", areasTitle: "Five areas of working together", partnerName: "Your colleague's first name",
      swap: [["Invite my partner", "Invite my colleague"], ["Your partner's", "Your colleague's"], ["your partner's", "your colleague's"], ["your partner", "your colleague"], ["my partner", "my colleague"], ["Nine areas of a relationship", "Five areas of working together"]],
      words: matchKindWordsEn.colleagues, categories: {
        warmth: { name: "Support at work", blurb: "Who notices when the other is overloaded, and what happens next.", tip: "Agree a signal for \"I'm at the limit\", and treat it as a fact, not a complaint." },
        ambition: { name: "Goals and growth", blurb: "What each of you wants from the work, and whether you pull the same way.", tip: "Say what each of you wants to be doing in three years; it explains most of the small frictions." },
        fun: { name: "Energy and pace", blurb: "Tempo, breaks, and how much room each of you needs.", tip: "Match the pace on shared work, and leave each other's own work alone." },
        loyalty: { name: "Trust and reliability", blurb: "Promises kept, credit shared, and what counts as a betrayal.", tip: "Say out loud what counts as a betrayal at work; it is rarely the same list." },
        communication: { name: "Communication and conflict", blurb: "How disagreements start, how they end, and who gives way.", tip: "Take disagreements out of the moment: a fixed half hour later, one topic, and the decision written down." },
      },
    },
    family: {
      label: "Family", hint: "A parent and a child, siblings, relatives: two people who share a family.", who: "your family member",
      title: "How well do you two get along?", lead: "Invite your family member to record a minute of their voice on a private link. You both get their report, and a compatibility report on top: your match score, six areas of family life, who holds which role, where you naturally connect, where you complement each other and where differences may create friction.",
      eyebrow: "Add-on · Relationship & Compatibility", areasTitle: "Six areas of family life", partnerName: "Their first name",
      swap: [["Invite my partner", "Invite my family member"], ["Your partner's", "Their"], ["your partner's", "their"], ["your partner", "your family member"], ["my partner", "my family member"], ["Nine areas of a relationship", "Six areas of family life"]],
      words: matchKindWordsEn.family, categories: {
        providing: { name: "Money and support", blurb: "Who provides, who worries, and how money is talked about.", tip: "Keep money talk out of arguments about everything else; give it its own time." },
        loyalty: { name: "Loyalty and trust", blurb: "Constancy, promises kept, and taking each other's side.", tip: "Say out loud what counts as a betrayal for each of you; it is rarely the same list." },
        fun: { name: "Fun and time together", blurb: "Laughter, traditions, and how much room each of you needs.", tip: "Protect one tradition that is only the two of yours, and each other's own time." },
      },
    },
    friends: {
      label: "Friends", hint: "Close friends, flatmates, travel companions.", who: "your friend",
      title: "How well do you two get along?", lead: "Invite your friend to record a minute of their voice on a private link. You both get their report, and a compatibility report on top: your match score, five areas of a friendship, who holds which role, where you naturally connect, where you complement each other and where differences may create friction.",
      eyebrow: "Add-on · Relationship & Compatibility", areasTitle: "Five areas of a friendship", partnerName: "Your friend's first name",
      swap: [["Invite my partner", "Invite my friend"], ["Your partner's", "Your friend's"], ["your partner's", "your friend's"], ["your partner", "your friend"], ["my partner", "my friend"], ["Nine areas of a relationship", "Five areas of a friendship"]],
      words: matchKindWordsEn.friends, categories: {
        ambition: { name: "Goals and support", blurb: "What each of you is after, and how you back each other.", tip: "Ask about the other's next goal once a season, and remember the answer." },
        loyalty: { name: "Loyalty and trust", blurb: "Constancy, keeping confidences, and showing up.", tip: "Say out loud what counts as a betrayal for each of you; it is rarely the same list." },
      },
    },
  },
};
