/**
 * Words for the couple's report, closer up (lib/match-deep.ts): eight areas of a shared life, one line per type on
 * each, and for every kind of pair what rubs and what helps. Stances are verb phrases that follow a name: "{a} {sa}".
 */
import type { Kind, Theme } from "../match-deep";
import type { TypeKey } from "../match";

export interface MatchDeepText {
  ui: { title: string; lead: string; note: string; avocoTitle: string; avocoLine: string; rub: string; help: string; kinds: Record<Kind, string> };
  themes: Record<Theme, { name: string; blurb: string; stance: Record<TypeKey, string>; rub: Record<Kind, string>; help: Record<Kind, string> }>;
  /** In place of love, for business partners and colleagues: working together. */
  work: { name: string; blurb: string; stance: Record<TypeKey, string>; rub: Record<Kind, string>; help: Record<Kind, string> };
  /** In place of love, for family and friends: the same axis and lines, said without romance. */
  care: { name: string; blurb: string; stance: Record<TypeKey, string> };
}

export const matchDeepEn: MatchDeepText = {
  ui: {
    title: "Closer up: the two of you in eight areas",
    lead: "AVOCO describes each type's attitude to money, time, ambition, decisions, talk, stress, love and people. Here are {a}'s and {b}'s side by side, and where they meet.",
    note: "The descriptions are AVOCO's official text for each type. The reading of the pair is this platform's, built from them; it describes tendencies, not verdicts, and a couple is always more than two types.",
    avocoTitle: "What AVOCO's own table says",
    avocoLine: "{name}'s type, the {from}, rates a {to} at {n} of 5: {note}.",
    rub: "Where it can rub",
    help: "What helps",
    kinds: { contrast: "Far apart here", bothHigh: "Both at the same end", bothLow: "Both at the same end", aligned: "Pulling the same way" },
  },
  themes: {
    money: {
      name: "Money", blurb: "Earning, spending, saving, and what money is for.",
      stance: {
        organizer: "treats money as something to plan and control, and sleeps better with a reserve",
        driver: "earns hard, spends big when it buys power or speed, and hates being told to wait",
        catalyst: "sees money as fuel for the next opportunity and lets it flow in and out",
        performer: "spends on the good life and on being seen, generously and often on impulse",
        harmonizer: "needs little, spends on the people they love, and avoids money talk",
        analyst: "spends when it serves an idea and finds saving for its own sake pointless",
        skeptic: "saves, checks, worries, and will not gamble with the household",
        mediator: "cares more about meaning than sums, and can let money slip out of view",
      },
      rub: {
        contrast: "{a} {sa}; {b} {sb}. That gap is where money fights start: one feels reckless to the other, the other feels controlling. The argument is rarely about the amount.",
        bothHigh: "{a} {sa}; {b} {sb}. Money will come and go together, and nobody is the brake: bills, taxes and savings need a rule you both obey, or a third hand.",
        bothLow: "{a} {sa}; {b} {sb}. Little friction over money, and little joy from it either; watch that caution doesn't become the only voice at the table.",
        aligned: "{a} {sa}; {b} {sb}. You are close enough here that money is unlikely to be your battleground.",
      },
      help: {
        contrast: "Three pots: one shared for the household with a fixed monthly amount, one private each with no questions asked. The spender keeps freedom, the saver keeps safety.",
        bothHigh: "Automate savings on payday, before either of you sees the money, and agree one purchase size above which you ask the other first.",
        bothLow: "Decide one thing a year you will spend on without a spreadsheet: a trip, a table, a course. Paid pleasure is also a plan.",
        aligned: "Keep one short money talk a month; agreement now is worth protecting when incomes change.",
      },
    },
    pace: {
      name: "Time and pace", blurb: "How fast each of you lives, and what waiting does to you.",
      stance: {
        organizer: "runs on a schedule and expects it kept",
        driver: "moves fast, decides fast and treats waiting as a defeat",
        catalyst: "lives in the moment, starts many things and finishes them late or not at all",
        performer: "runs on inspiration, brilliant in bursts and late in between",
        harmonizer: "keeps an easy rhythm and adapts to the other's",
        analyst: "treats time as their own, misses deadlines and hates being hurried",
        skeptic: "prefers to prepare, arrive early and change nothing at the last minute",
        mediator: "flows with the day and resists pressure to speed up",
      },
      rub: {
        contrast: "{a} {sa}; {b} {sb}. One is always waiting, the other always pushed: lateness and hurry become the daily argument that stands in for bigger ones.",
        bothHigh: "{a} {sa}; {b} {sb}. Life will be fast and full, with a lot started; the risk is that nothing quiet ever gets finished, including the talks that matter.",
        bothLow: "{a} {sa}; {b} {sb}. You will rarely rush each other, and decisions can sit for months. The gift is calm; the cost is drift.",
        aligned: "{a} {sa}; {b} {sb}. Your tempos match well enough that time is not the fight.",
      },
      help: {
        contrast: "Agree what \"on time\" means for the two of you, in minutes, and let the slower one own the calendar for anything with a fixed hour.",
        bothHigh: "Put one slow evening a week in the calendar with nothing planned, and keep it as if it were a flight.",
        bothLow: "Give every open question a date, even a rough one; things you both mean to do need a day, not a mood.",
        aligned: "Say out loud when the other's pace is right for you; it is one of the quiet reasons this works.",
      },
    },
    drive: {
      name: "Ambition and what drives you", blurb: "What each of you is after, and whether you can pull the same way.",
      stance: {
        organizer: "wants results, order and a plan that gets there, and measures the year by it",
        driver: "wants to win, lead and grow, and gets restless without a bigger goal",
        catalyst: "wants movement, new people and the next thing, more than any single summit",
        performer: "wants recognition, an audience and a life that looks like a life",
        harmonizer: "wants peace at home and people around who are well, and will bend own plans for it",
        analyst: "wants to build a world of ideas of their own and be left free to do it",
        skeptic: "wants safety, things done properly and no surprises",
        mediator: "wants meaning, quiet and time for what matters, and cares little for status",
      },
      rub: {
        contrast: "{a} {sa}; {b} {sb}. Different finish lines: one partner's big year can feel like the other's lost year, and support gets read as a lack of ambition, or ambition as a lack of care.",
        bothHigh: "{a} {sa}; {b} {sb}. Two engines: a lot gets built if the goals point the same way, and a quiet competition if they don't.",
        bothLow: "{a} {sa}; {b} {sb}. Neither of you chases status, which is restful; but money, careers and moves will not push you either, so decide together what growing means for you.",
        aligned: "{a} {sa}; {b} {sb}. You want similar things from the years ahead, which makes the big decisions easier than the small ones.",
      },
      help: {
        contrast: "Write one shared five-year picture in ten sentences, then name which goals are \"ours\" and which are \"mine\", and fund both.",
        bothHigh: "Keep separate scoreboards; the couple stops competing when each has a place to win alone.",
        bothLow: "Pick one ambition a year to pursue together, deliberately, so contentment stays a choice rather than a habit.",
        aligned: "Revisit the shared picture on each birthday; alignment drifts when nobody looks.",
      },
    },
    decisions: {
      name: "How each of you decides", blurb: "Fast or weighed, alone or together, and who has the last word.",
      stance: {
        organizer: "decides by the rules and the plan, and expects decisions to stick",
        driver: "decides fast and alone, and asks afterwards, if at all",
        catalyst: "decides on the spot and changes course just as quickly",
        performer: "decides by feel and by how it will look, and can reverse under a new impression",
        harmonizer: "decides by how everyone will feel, and would rather not decide against anyone",
        analyst: "decides by their own logic, slowly and in detail, and dislikes being rushed or overruled",
        skeptic: "decides by risk, weighs every option twice and prefers the known",
        mediator: "decides by values, takes their time, and withdraws when pushed",
      },
      rub: {
        contrast: "{a} {sa}; {b} {sb}. One has moved on while the other is still weighing: the fast one feels blocked, the slow one feels ignored, and decisions get made twice.",
        bothHigh: "{a} {sa}; {b} {sb}. Quick agreements and quick reversals: you can decide the same thing three ways in a week, and nobody slows the pair down.",
        bothLow: "{a} {sa}; {b} {sb}. Careful, thorough and slow: big steps can wait years for the perfect moment.",
        aligned: "{a} {sa}; {b} {sb}. A similar tempo of deciding; the only question is who owns which decision.",
      },
      help: {
        contrast: "Split decisions by size: small ones the fast partner makes alone, big ones get a night's sleep and one conversation. Say which kind this is before arguing.",
        bothHigh: "Write big decisions down with a date; a decision that survives a week is yours, the rest were moods.",
        bothLow: "Give every open question a deadline and decide with what you know then; a good decision now beats a perfect one never.",
        aligned: "Assign domains: who decides on the home, the money, the trips. Agreed ownership ends the re-deciding.",
      },
    },
    talk: {
      name: "How to talk to each other", blurb: "The channel each of you hears on, and the words that land.",
      stance: {
        organizer: "wants things clear, agreed and then closed, and hears facts better than feelings",
        driver: "speaks straight, takes charge of the conversation and hears results",
        catalyst: "talks lightly, jokes, changes the subject, and hears energy more than detail",
        performer: "talks in emotions and stories, and needs to be heard with feeling",
        harmonizer: "talks gently, reads the mood, and hears tone before content",
        analyst: "talks when there is something to say, prefers written and neutral, and shuts down on emotion",
        skeptic: "talks precisely, remembers everything said, and hears risks and slights",
        mediator: "talks slowly and deeply, needs quiet to open up, and hears sincerity",
      },
      rub: {
        contrast: "{a} {sa}; {b} {sb}. You broadcast on different channels: one hears coldness where there is care, the other hears drama where there is a plea. Most of your fights are translations that failed.",
        bothHigh: "{a} {sa}; {b} {sb}. Expressive and quick: a lot gets said, some of it before it was thought. Apologies have to be as loud as the words.",
        bothLow: "{a} {sa}; {b} {sb}. Two quiet people: little gets said in anger, and little gets said at all. The unsaid piles up politely.",
        aligned: "{a} {sa}; {b} {sb}. You hear each other's language natively; keep using it.",
      },
      help: {
        contrast: "Learn a few phrases in the other's language. {b} wants to hear {wantB}. {a} wants to hear {wantA}. They cost nothing and change the weather.",
        bothHigh: "Take arguments out of the moment: a fixed half hour later, seated, one topic, and the first minute belongs to the other.",
        bothLow: "Make a weekly ten-minute check-in a habit, with one question: what did you not say this week?",
        aligned: "Guard it: when one of you is tired or stressed, the channel narrows first. Say \"not now, tonight\" rather than nothing.",
      },
    },
    stress: {
      name: "Under stress", blurb: "What each of you does when it gets too much, and what brings you back.",
      stance: {
        organizer: "gets rigid and controlling, and needs order restored to calm down",
        driver: "gets loud, fast and attacking, and needs a win or a clear next step",
        catalyst: "gets scattered, flees into people and noise, and needs the pressure lifted",
        performer: "makes a scene, then needs to be reassured and admired again",
        harmonizer: "goes quiet and takes the blame, and needs to be asked how they are",
        analyst: "withdraws, goes cold and disappears into their own world, and needs space and no pressure",
        skeptic: "worries, checks and criticises, and needs facts and a plan before anything else",
        mediator: "shuts down and goes still, and needs time and quiet more than words",
      },
      rub: {
        contrast: "{a} {sa}; {b} {sb}. Under pressure you go in opposite directions: one comes closer and louder, the other goes further and quieter. Each reaction makes the other's worse, which is how a bad day becomes a bad week.",
        bothHigh: "{a} {sa}; {b} {sb}. Two outward reactions: stress is loud in this house, over quickly, and hard on anyone in the room.",
        bothLow: "{a} {sa}; {b} {sb}. Two inward reactions: when it gets hard the house goes silent, and each reads the other's silence as rejection.",
        aligned: "{a} {sa}; {b} {sb}. You react in similar ways; at least you will recognise the signs in each other.",
      },
      help: {
        contrast: "Agree in advance what each of you needs in the first hour, and who moves first. The one who comes closer gives space; the one who withdraws sets a time to come back.",
        bothHigh: "One rule: nobody decides anything while loud. Walk, then talk.",
        bothLow: "One rule: silence has a time limit. Whoever notices first says \"we are both gone; tea in an hour\".",
        aligned: "Name the sign out loud when you see it in the other; it lands better from someone who knows it from the inside.",
      },
    },
    love: {
      name: "Love and closeness", blurb: "How each of you gives and reads love, and how much closeness each needs.",
      stance: {
        organizer: "shows love in reliability and things done, and is warmer than they sound",
        driver: "shows love in protection, provision and wanting you, and expects loyalty back",
        catalyst: "shows love in fun, surprise and attention that moves around, and needs freedom",
        performer: "shows love in grand gestures and needs to be admired in return",
        harmonizer: "shows love in constant attention and needs to feel needed",
        analyst: "shows love in respect, space and being there when it counts, and needs room to breathe",
        skeptic: "shows love in loyalty and worry, and needs to feel safe",
        mediator: "shows love in deep, quiet devotion, and needs sincerity and unhurried time",
      },
      rub: {
        contrast: "{a} {sa}; {b} {sb}. One asks for closeness the other experiences as pressure; one asks for space the other experiences as distance. Neither is wrong; the dose is.",
        bothHigh: "{a} {sa}; {b} {sb}. Two people who need a lot of closeness: warm, intense, and quick to feel neglected when life gets busy.",
        bothLow: "{a} {sa}; {b} {sb}. Two people who need room: a calm, respectful union that can cool into two parallel lives if nobody reaches across.",
        aligned: "{a} {sa}; {b} {sb}. Your needs for closeness are close enough to meet without negotiation.",
      },
      help: {
        contrast: "Set the dose on purpose: a fixed time each week that is fully together, and time that is openly apart. Planned distance is not rejection.",
        bothHigh: "Keep one thing each that is only yours; you will bring more back than you took.",
        bothLow: "Put closeness in the calendar until it is a habit: one evening, no screens, no plans.",
        aligned: "Say what you read as love, once, plainly; it stops the other guessing.",
      },
    },
    space: {
      name: "People and space", blurb: "How wide each life is, and how much of it is shared.",
      stance: {
        organizer: "keeps a steady circle and a tidy calendar of who and when",
        driver: "keeps people around who are useful or admiring, and leads the room",
        catalyst: "collects people, parties and plans, and is rarely alone by choice",
        performer: "needs an audience and a stage, and comes alive among people",
        harmonizer: "keeps a warm, close circle and feeds it",
        analyst: "keeps very few people close, needs solitude, and tires in crowds",
        skeptic: "trusts slowly, keeps the door half closed, and prefers the known few",
        mediator: "keeps a small deep circle and long quiet stretches alone",
      },
      rub: {
        contrast: "{a} {sa}; {b} {sb}. One's full evening is the other's exhausting one. The wide one feels held back, the private one feels dragged out, and both feel the other doesn't get it.",
        bothHigh: "{a} {sa}; {b} {sb}. A full house and a full calendar: exciting, and easy to lose the two of you inside the crowd.",
        bothLow: "{a} {sa}; {b} {sb}. A quiet life with few people in it: peaceful, and prone to isolation when one of you needs more than the other can give.",
        aligned: "{a} {sa}; {b} {sb}. A similar appetite for people; little to negotiate here.",
      },
      help: {
        contrast: "Go separately sometimes and don't apologise for it; agree the events that are non-negotiable for each of you, and count them.",
        bothHigh: "Book time with nobody else in it, regularly, before the calendar does it for you.",
        bothLow: "Keep two or three friendships each that are not shared; a couple needs outside air.",
        aligned: "Notice when one of you starts wanting more or less; appetites change with age and work.",
      },
    },
  },
  work: {
    name: "Working together", blurb: "Who leads, who carries, and what each of you needs from the other to do good work.",
    stance: {
      organizer: "works by plan and standards, takes responsibility, and expects the same discipline back",
      driver: "leads, decides and pushes for results, and expects loyalty and speed in return",
      catalyst: "brings deals, people and energy, and loses interest in the routine",
      performer: "brings presence and persuasion, and needs credit and an audience",
      harmonizer: "keeps the team together and smooths conflict, and avoids the hard calls",
      analyst: "brings ideas, depth and long plans, and needs autonomy and no urgent noise",
      skeptic: "checks, secures and delivers properly, and slows down whatever feels risky",
      mediator: "brings loyalty, meaning and patience, and withdraws from pressure and conflict",
    },
    rub: {
      contrast: "{a} {sa}; {b} {sb}. One leads, one carries: the classic shape of a good partnership, and the classic way it sours, when the one who carries stops being heard and the one who leads stops noticing.",
      bothHigh: "{a} {sa}; {b} {sb}. Two people who lead: fast, ambitious, and prone to pulling in two directions, with nobody minding the details.",
      bothLow: "{a} {sa}; {b} {sb}. Two people who carry rather than drive: solid, careful work, and a shortage of push when a decision or a sale is needed.",
      aligned: "{a} {sa}; {b} {sb}. A similar way of working; the question is only who owns what.",
    },
    help: {
      contrast: "Write down who decides what, and give the one who carries a veto on the things they carry. Credit out loud, in front of others.",
      bothHigh: "Split the territory before you split the company: each leads their own area outright, and the shared decisions get a rule for ties.",
      bothLow: "Agree who pushes on what, and put a date on every open decision; hire or borrow the push you both lack.",
      aligned: "Assign ownership by area and revisit it every quarter; sameness is comfortable until something falls between you.",
    },
  },
  care: {
    name: "Closeness and trust", blurb: "How each of you shows care, and how much closeness each needs.",
    stance: {
      organizer: "shows care in reliability and things done, and is warmer than it sounds",
      driver: "shows care in protection and taking charge, and expects loyalty back",
      catalyst: "shows care in fun, surprise and attention that moves around, and needs freedom",
      performer: "shows care in big gestures and needs appreciation in return",
      harmonizer: "shows care in constant attention and needs to feel needed",
      analyst: "shows care in respect, space and being there when it counts, and needs room to breathe",
      skeptic: "shows care in loyalty and worry, and needs to feel safe",
      mediator: "shows care in quiet devotion, and needs sincerity and unhurried time",
    },
  },
};
