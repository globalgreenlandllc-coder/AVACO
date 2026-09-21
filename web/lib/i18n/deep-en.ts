/**
 * The interpretation layer. AVOCO returns scores only (id, name, value); everything a person reads
 * about what a score means is written here. The official type content lives in types-en.ts; this file holds
 * the zone texts, a short reading per type (drawn from AVOCO's typology, used until a type's full official
 * report is added) and the emotional-scale readings, which are this platform's own.
 */
export const deepEn = {
  ui: {
    expand: "Show explanation",
    yourScore: "What your score means",
    strengths: "Strengths",
    watch: "Worth watching",
    communicate: "How to talk with this type",
    role: "Where it shines",
    measures: "What this scale reflects",
    summaryTitle: "Summary",
    summaryLeaders: "Leading: {names}.",
    summaryBalanced: "No type reaches the leading zone. Strongest: {names}.",
    summaryActive: "Active alongside: {names}.",
    summaryEmoTop: "Most expressed right now: {names}.",
    summaryEmoLow: "Least expressed right now: {names}.",
    bands: { high: "High", mid: "Moderate", low: "Low" },
  },

  zoneMeaning: {
    leading: "At {value} this type is in the leading zone (50 and above). This is how you come across most of the time: it shapes your first impression and the way you act when you aren't thinking about it.",
    active: "At {value} this type is in the active zone (30 to 49). It isn't your default, but you switch into it readily when a situation calls for it, and people who know you will recognise it.",
    background: "At {value} this type is in the background zone (below 30). It shows rarely in your voice. Acting this way is possible for you, but it takes deliberate effort and tires you faster than your leading styles.",
  },

  psytypes: {
    organizer: {
      strengths: ["Builds systems, plans time and allocates resources", "Responsible, disciplined and results-oriented", "Decisive and steady under stress"],
      watch: ["Expects others to share their principles and their order", "Uncomfortable with chaos and uncertainty", "Tends to divide people into \"us\" and \"them\""],
      communicate: "Be direct, logical and consistent. Lay out the stages and the necessary steps in advance, and keep to what was agreed.",
      role: "Building systems, planning, allocating resources: any role where order, standards and reliability decide the result.",
    },
    driver: {
      strengths: ["Takes responsibility and makes the important decisions", "Not afraid of risk; oriented toward victory", "Charismatic: leads people and builds advantageous alliances"],
      watch: ["Can become fixated on one supremely important idea", "Possessive of their ideas", "A strong appetite for power and authority"],
      communicate: "Speak with confidence and be concrete. Connect what you propose to their large goal.",
      role: "The front line: leadership, large goals, influence on big systems and processes.",
    },
    catalyst: {
      strengths: ["Generates ideas and initiatives", "Attracts people and resources", "Fast, flexible and inventive"],
      watch: ["Takes on many things and doesn't finish them", "Scatters attention; weak on long-term goals", "Careless with risk"],
      communicate: "Keep it free, lively and positive. Emphasise opportunities, and agree the next concrete step.",
      role: "Negotiations, sales, attracting resources, launching new projects.",
    },
    performer: {
      strengths: ["Natural charm; a favourable impression from the first minutes", "Rich imagination and creative solutions", "Emotionally \"infects\" others and moves them to act"],
      watch: ["Tends to promise a lot and declare large-scale intentions", "May present an illusory picture of well-being and guaranteed success", "Needs recognition and a central place"],
      communicate: "Give attention and recognition. Then agree the specifics, so that large declarations become commitments.",
      role: "Work with public attention and opinion: presentation, creative work, creating an atmosphere of celebration and motivation.",
    },
    harmonizer: {
      strengths: ["Easily senses and understands what others feel", "Finds an approach to different people through care", "Genuine emotions; scrupulous in matters of morality"],
      watch: ["Avoids conflict, even a necessary one", "Cannot stand rudeness, vulgarity or disharmony", "Reacts emotionally to the smallest nuances"],
      communicate: "Keep the conversation soft, friendly and sincere. Openness and trust matter more to them than arguments.",
      role: "Roles built on care, support and the humanising of a team or a service.",
    },
    analyst: {
      strengths: ["Original thinking and unconventional solutions", "Deep, tirelessly developed expertise in a narrow field", "High intelligence and intellectual creativity"],
      watch: ["May neglect practical duties and subordination", "Reluctant to make contact; can seem detached", "Decisions can look illogical or unpredictable to others"],
      communicate: "Respect their inner world and don't pry into it. Engage through their field of interest, and give them space and time.",
      role: "Mathematics, architecture, IT development, art, directing: any profession that needs an original approach.",
    },
    skeptic: {
      strengths: ["Meticulous and responsible; never cuts corners", "Sees risks and plans in advance how to prevent them", "Keeps their word and doesn't let people down"],
      watch: ["Self-criticism and doubt can hold them back", "Slow to decide: weighs every pro and con", "Resists change that looks hasty or ill-considered"],
      communicate: "Give time to weigh things and don't push for an impulsive decision. Be precise, and keep criticism gentle: they are already hard on themselves.",
      role: "Teams where attention to detail, analysis and responsibility matter.",
    },
    mediator: {
      strengths: ["Deep empathy; a good listener and conversationalist", "Loyal to ideas, friends, loved ones and responsibilities", "Notices what others miss; talent for art, music and literature"],
      watch: ["Puts others' needs ahead of their own", "Can withdraw, become disillusioned and fall into stagnant states", "Low motivation for change and for achievement goals"],
      communicate: "Be sincere and go deep. Appeal to meaning and ideals rather than gain, and respect their autonomy.",
      role: "Creative fields, and work that serves an ideal or helps people.",
    },
  },

  emostate: {
    energy_level: {
      measures: "General vitality and mood as it sounds in the voice: brightness of tone, tempo, and how much energy carries through a phrase.",
      high: "You sound lively and in good spirits. There is energy to spare, and others are likely to pick up on it.",
      mid: "An even working level of energy: neither run down nor especially charged.",
      low: "The voice sounds tired or subdued. That often follows poor sleep, a long day or low mood. If it repeats across recordings, it is worth paying attention to rest.",
    },
    stress_tolerance: {
      measures: "How steady the voice stays: whether pitch and loudness hold, or waver the way they do under strain.",
      high: "The voice is steady. You sound like someone who is coping well with whatever pressure is present.",
      mid: "Mostly steady, with some signs of tension. Normal for a busy day.",
      low: "The voice carries signs of strain. You may be under pressure right now, or the recording itself felt stressful.",
    },
    openness_to_new: {
      measures: "Readiness for new ideas and change, heard in the flexibility and variety of intonation.",
      high: "You sound curious and receptive. A good moment for brainstorming, learning or a change of plan.",
      mid: "Open within reason: new ideas get a hearing, and get tested.",
      low: "Right now you sound more inclined to stick with what is known and proven. A sensible state for finishing work, less so for starting something unfamiliar.",
    },
    emotional_confidence: {
      measures: "How strongly feelings colour the voice, as opposed to a neutral, even delivery.",
      high: "Feelings come through clearly. People will find you easy to read, and the emotional tone of what you say will carry weight.",
      mid: "Feeling is present but measured.",
      low: "The delivery is neutral and reserved. Useful for keeping a cool head; others may find it harder to tell what you feel.",
    },
    ability_to_assert: {
      measures: "Firmness in holding your own position, heard in how definite and unhesitating the delivery is.",
      high: "You sound self-reliant and ready to stand your ground.",
      mid: "You hold a position while staying open to other views.",
      low: "Right now you sound more inclined to go along with others than to insist. Worth noticing before a negotiation or a difficult conversation.",
    },
    ability_to_set_goals: {
      measures: "A sense of purpose and direction, heard in how focused and forward-moving the speech is.",
      high: "You sound like someone who knows where they are going and is on the way.",
      mid: "There is direction, without great urgency.",
      low: "The voice suggests a lack of clear direction at the moment: a pause, a period of doubt, or tiredness.",
    },
    self_control: {
      measures: "How tightly impulses and reactions are held in check, heard in how even and restrained the delivery is.",
      high: "Delivery is controlled and measured. You are keeping a firm hand on your reactions.",
      mid: "A balance of spontaneity and restraint.",
      low: "You are speaking freely and spontaneously, with little filtering. That reads as openness and sincerity; in a tense situation it can also mean saying more than you intended.",
    },
    ability_to_attract: {
      measures: "How easily the voice draws people in: warmth, resonance and a pleasant, engaging timbre.",
      high: "The voice is warm and engaging. People are likely to want to keep listening.",
      mid: "A pleasant, neutral impression.",
      low: "The voice is doing less than usual to draw listeners in right now. Tiredness, tension and a poor microphone all lower this scale.",
    },
    person_manifestation: {
      measures: "The wish to be noticed, heard in emphasis, volume and dramatic contrast.",
      high: "You are putting yourself forward and want to be heard. Effective on a stage; in a small group it can crowd others out.",
      mid: "You make yourself heard without demanding attention.",
      low: "You are not seeking attention. Modest and unobtrusive, which can also mean being overlooked.",
    },
    person_harmonicity: {
      measures: "Inner balance and calm, heard in the smoothness and evenness of the voice.",
      high: "You sound calm and at peace with yourself.",
      mid: "Reasonably settled, with some inner movement.",
      low: "The voice suggests inner restlessness or agitation. That is not necessarily negative: excitement and anticipation lower this scale as well as worry.",
    },
    authority: {
      measures: "The drive to lead and influence, heard in a firm, weighty, directive delivery.",
      high: "You sound like the one in charge. People will tend to follow, or to push back.",
      mid: "You can lead when needed without insisting on it.",
      low: "You are not trying to direct anyone right now. A cooperative, non-threatening tone.",
    },
    kindness: {
      measures: "Warmth and goodwill toward others, heard in a soft, open, welcoming tone.",
      high: "You sound warm and well-disposed. People will find you easy to approach.",
      mid: "Polite and neutral.",
      low: "The tone is cool or businesslike. Appropriate in many settings; if it isn't what you intend, it is easy to soften.",
    },
    expressivity: {
      measures: "How vividly you express yourself: range of pitch, variation of tempo and loudness, as opposed to monotone.",
      high: "Lively, varied speech that holds attention.",
      mid: "Moderately varied delivery.",
      low: "The delivery is even, close to monotone. It can sound calm and serious, or flat and tired, depending on the rest of the picture.",
    },
    emo_engage: {
      measures: "Emotional involvement and enthusiasm for what you are talking about.",
      high: "You sound genuinely involved and inspired. What you are talking about matters to you.",
      mid: "Interested, without being carried away.",
      low: "You sound detached from the subject right now. Try a recording about something you care about to see the difference.",
    },
  },

  fit: {
    "title": "Where you can do your best work",
    "lead": "A fit score for twenty-five fields of work, from 0 to 100. The higher the score, the more naturally that kind of work comes to you; a low score means it is possible but costs you more effort.",
    "best": "Best fit",
    "effort": "Takes more effort",
    "personality": "Personality",
    "rightNow": "Right now",
    "roles": "Roles",
    "all": "All fields by sector",
    "note": "This score is calculated by this platform, not by AVOCO, from everything AVOCO measured. Three quarters of it come from your personality types: each field is tied to the types whose AVOCO descriptions name that kind of work. One quarter comes from the emotional scales that kind of work leans on, as they sound right now, so that part will shift from one recording to the next. The score reflects style and inclination, not skill, experience or training.",
    "summary": "Best fit for work: {names}.",
    "sectors": {
      "business": "Business and management",
      "market": "Sales and communication",
      "people": "Working with people",
      "tech": "Technical and analytical",
      "creative": "Creative",
      "practical": "Practical and service"
    },
    "fields": {
      "leadership": {
        "name": "Leadership and general management",
        "text": "Taking responsibility, making the important decisions, leading people toward a large goal.",
        "roles": "CEO, director, department head, team lead"
      },
      "entrepreneurship": {
        "name": "Entrepreneurship and new ventures",
        "text": "Starting things: spotting an opportunity, moving fast, bringing people and resources together.",
        "roles": "Founder, business developer, product launcher, franchise owner"
      },
      "operations": {
        "name": "Operations and process management",
        "text": "Building systems, keeping standards, making sure the work runs the same way every day.",
        "roles": "Operations manager, production manager, office manager, supply planner"
      },
      "projects": {
        "name": "Project management",
        "text": "Turning a goal into a plan, a schedule and delivered results.",
        "roles": "Project manager, programme coordinator, construction manager, scrum master"
      },
      "finance": {
        "name": "Finance and accounting",
        "text": "Accuracy with money: records, controls, forecasts and careful decisions.",
        "roles": "Accountant, financial analyst, controller, bookkeeper, underwriter"
      },
      "consulting": {
        "name": "Consulting and strategy",
        "text": "Understanding a client's problem quickly and convincing them of a way forward.",
        "roles": "Management consultant, business analyst, strategy advisor"
      },
      "sales": {
        "name": "Sales, negotiation and partnerships",
        "text": "Making connections, attracting people and resources, closing agreements.",
        "roles": "Account executive, real-estate agent, business development, recruiter, buyer"
      },
      "service": {
        "name": "Customer service and support",
        "text": "Patience and goodwill with people who need help, including the difficult ones.",
        "roles": "Support agent, call-centre operator, client success manager, receptionist"
      },
      "marketing": {
        "name": "Marketing and creative production",
        "text": "Turning ideas into something vivid that reaches and moves an audience.",
        "roles": "Marketer, brand manager, content creator, copywriter, SMM specialist"
      },
      "stage": {
        "name": "Public speaking, media and events",
        "text": "Working with public attention: presenting, performing, creating an atmosphere.",
        "roles": "Presenter, speaker, host, actor, PR manager, event producer"
      },
      "hr": {
        "name": "HR and team care",
        "text": "Looking after the people and the climate in a team; support and trust.",
        "roles": "HR manager, recruiter, people partner, office culture lead"
      },
      "teaching": {
        "name": "Teaching and training",
        "text": "Explaining, engaging a group and caring whether each person got it.",
        "roles": "Teacher, corporate trainer, tutor, coach, instructor"
      },
      "counselling": {
        "name": "Counselling and psychology",
        "text": "Listening deeply, staying calm and helping a person find their own way.",
        "roles": "Psychologist, counsellor, therapist, mediator, career adviser"
      },
      "healthcare": {
        "name": "Healthcare and care work",
        "text": "Care combined with precision and steadiness under pressure.",
        "roles": "Nurse, doctor, pharmacist, caregiver, medical assistant"
      },
      "social": {
        "name": "Social work and non-profit",
        "text": "Work that serves an ideal and the people who need it most.",
        "roles": "Social worker, NGO coordinator, volunteer manager, community organiser"
      },
      "research": {
        "name": "Research and science",
        "text": "Deep, original work in a narrow field where thinking matters most.",
        "roles": "Researcher, scientist, academic, R&D specialist"
      },
      "it": {
        "name": "IT and engineering",
        "text": "Building and fixing complex systems; long, concentrated, precise work.",
        "roles": "Software developer, engineer, system architect, DevOps, QA engineer"
      },
      "data": {
        "name": "Data and analytics",
        "text": "Finding what the numbers say, carefully and without jumping to conclusions.",
        "roles": "Data analyst, statistician, actuary, market researcher"
      },
      "quality": {
        "name": "Quality, risk and audit",
        "text": "Attention to detail, foreseeing risks, doing things correctly and to the end.",
        "roles": "Auditor, quality manager, risk analyst, inspector, compliance officer"
      },
      "law": {
        "name": "Law and compliance",
        "text": "Rules, precedent and argument: holding a position and getting the details right.",
        "roles": "Lawyer, legal counsel, notary, compliance specialist, contract manager"
      },
      "arts": {
        "name": "Art, writing and creative craft",
        "text": "Work that draws on a rich inner world, sensitivity and imagination.",
        "roles": "Writer, musician, artist, film-maker, editor"
      },
      "design": {
        "name": "Design and architecture",
        "text": "Original ideas given form: a sense of beauty joined to structure.",
        "roles": "Designer, architect, UX designer, illustrator, interior designer"
      },
      "admin": {
        "name": "Administration and logistics",
        "text": "Order in documents, schedules and movement of things; nothing gets lost.",
        "roles": "Administrator, logistics coordinator, dispatcher, executive assistant, records manager"
      },
      "hospitality": {
        "name": "Hospitality, travel and events",
        "text": "Making people feel welcome and creating an experience they remember.",
        "roles": "Hotel manager, restaurateur, tour guide, flight attendant, wedding planner"
      },
      "safety": {
        "name": "Safety, security and emergency services",
        "text": "Clear rules, quick decisions and steadiness when it matters most.",
        "roles": "Security manager, safety officer, emergency responder, military and police roles"
      }
    }
  },

  method: {
    title: "How this analysis works",
    lead: "What AVOCO measures, how it turns a voice into scores, and how far to trust it.",
    sections: [
      {
        title: "It listens to how you sound, not to what you say",
        text: "The words are not analysed, so the language you speak doesn't matter. The analysis works on the sound itself. Speech is produced by breathing, muscle tone in the vocal tract and nervous regulation, and all three change with emotion, stress, tiredness and mental load. Those changes are measurable in the recording.",
      },
      {
        title: "What is measured",
        items: [
          "Pitch: the fundamental frequency of the voice and how much it varies",
          "Micro-instability: tiny cycle-to-cycle variations in pitch (jitter) and loudness (shimmer)",
          "Timing: speech tempo, rhythm, and the length and frequency of pauses",
          "Intonation and energy: the melodic contour of phrases and how loudness is distributed",
          "Timbre: spectral features such as MFCC, spectral centroid and the harmonics-to-noise ratio",
        ],
      },
      {
        title: "How the scores are produced",
        text: "The recording is cleaned first: levels are normalised, noise is reduced and non-speech is cut out. The features above are then extracted and passed to an ensemble of machine-learning models (neural networks and classical algorithms) trained on recordings of people whose profiles were known. The result is a score from 0 to 100 on each of eight personality types and fourteen emotional scales. The scales are independent of each other: they are not percentages of a whole and don't add up to 100.",
      },
      {
        title: "How reliable it is",
        text: "Voxera, which operates the AVOCO analysis service, reports accuracy of 70 to 90 percent depending on the task and the type, from internal studies with more than 3,000 respondents, in Russian, English and Kazakh. Those are the developer's own figures and have not been independently verified by this platform. Treat the report as an informed outside view, not a verdict.",
      },
      {
        title: "What the explanations are, and are not",
        text: "AVOCO returns scores only. It does not report which features of your voice produced a particular score, so this report cannot tell you that, either. The descriptions of the personality types come from AVOCO's own typology and describe the type in general, not you individually. The readings of the emotional scales and of the zones were written by this platform. Nothing here is generated from your words.",
      },
      {
        title: "Getting a truer picture",
        items: [
          "Personality scores are fairly stable; emotional scores change from day to day and even hour to hour",
          "A cold, a bad microphone, background noise or reading from a script all affect the result",
          "Speak freely for a minute or more, in a quiet place, about something that matters to you",
          "Compare several recordings made on different days before drawing conclusions",
        ],
      },
    ],
  },
};
