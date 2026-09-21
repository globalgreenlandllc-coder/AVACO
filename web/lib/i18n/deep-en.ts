/**
 * The interpretation layer. AVOCO returns scores only (id, name, value); everything a person reads
 * about what a score means is written here. Replace with AVOCO's official texts if they provide them.
 */
export const deepEn = {
  ui: {
    expand: "Show explanation",
    yourScore: "What your score means",
    essence: "The type in brief",
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
      essence: "The Organizer turns intentions into order. They think in plans, sequences and deadlines, and feel most at ease when everyone knows who does what and by when.",
      strengths: ["Reliable: what is promised gets done", "Turns a vague goal into clear steps", "Keeps a team on course under pressure"],
      watch: ["Can hold on to the plan after the situation has changed", "May come across as rigid or controlling", "Finds improvisation and ambiguity draining"],
      communicate: "Come prepared. Give the agenda, the facts and the deadline up front, and keep your commitments: a broken promise costs more trust with this type than with any other.",
      role: "Operations, project management, finance, quality, any role where consistency matters more than novelty.",
    },
    driver: {
      essence: "The Driver is oriented to results. They decide fast, take charge without being asked and measure a day by what was achieved.",
      strengths: ["Decisive when others hesitate", "Comfortable with pressure, risk and competition", "Moves a stalled effort forward"],
      watch: ["May run over quieter people", "Impatient with detail and long discussion", "Can mistake speed for progress"],
      communicate: "Be brief and start with the conclusion. Offer options rather than problems, and don't take bluntness personally.",
      role: "Leadership, sales, crisis work, launching new lines of business.",
    },
    catalyst: {
      essence: "The Catalyst starts things. They generate ideas easily, infect others with enthusiasm and get restless when nothing is changing.",
      strengths: ["A steady source of new ideas", "Energises a room", "Quick to see an opportunity"],
      watch: ["Starts more than they finish", "Loses interest once the work becomes routine", "Can overwhelm a team with changes of direction"],
      communicate: "Give the big picture first and room to think aloud. Agree the next concrete step before the conversation ends, in writing if it matters.",
      role: "Innovation, marketing, business development, early stages of a project.",
    },
    performer: {
      essence: "The Performer communicates with their whole presence. They enjoy an audience, tell a story well and make ideas vivid for other people.",
      strengths: ["Engaging speaker and presenter", "Builds rapport quickly", "Makes dry material memorable"],
      watch: ["Needs recognition, and fades without it", "May favour impression over substance", "Can take criticism personally"],
      communicate: "Give attention and acknowledge their contribution in front of others. Deliver criticism in private, and tie it to a specific behaviour.",
      role: "Public speaking, client-facing roles, training, media, hospitality.",
    },
    harmonizer: {
      essence: "The Harmonizer looks after the people. They notice how others feel, smooth tension and keep a group working well together.",
      strengths: ["Attentive, warm listener", "Creates trust and loyalty", "Holds a team together in hard times"],
      watch: ["Avoids necessary conflict", "Finds it hard to say no", "Can put others' needs ahead of their own for too long"],
      communicate: "Start with the person, then the task. Ask for their view directly, because they may not volunteer a disagreement.",
      role: "HR, care and support roles, customer success, teaching, team coordination.",
    },
    analyst: {
      essence: "The Analyst needs to understand before acting. They look for facts, logic and cause, notice the detail others miss and care about being accurate.",
      strengths: ["Thorough and precise", "Decisions that hold up under scrutiny", "Calm, objective view of a problem"],
      watch: ["Slow to decide when data is incomplete", "May seem distant or critical", "Can get lost in detail and miss the deadline"],
      communicate: "Bring data and give time to think. Don't push for an answer on the spot, and expect precise questions.",
      role: "Research, engineering, finance, law, audit, anything where errors are expensive.",
    },
    skeptic: {
      essence: "The Skeptic tests everything. They see the weak point in an argument and the risk in a plan early, and don't accept a claim on anyone's authority.",
      strengths: ["Spots risks before they become problems", "Hard to mislead or manipulate", "Keeps a group honest"],
      watch: ["Can drain enthusiasm from a new idea", "Trust comes slowly", "May be heard as negative even when trying to help"],
      communicate: "Welcome the doubts and answer them with evidence. Never oversell: one exaggeration and the rest of what you say is discounted.",
      role: "Risk, security, compliance, quality control, due diligence, editing.",
    },
    mediator: {
      essence: "The Mediator finds common ground. They hear every side, stay even-handed and help people who disagree reach something they can all accept.",
      strengths: ["Fair and trusted by opposing sides", "Defuses conflict", "Patient, diplomatic negotiator"],
      watch: ["May avoid taking a clear position", "Can be slow when a fast, unpopular decision is needed", "Own interests get lost in the search for balance"],
      communicate: "Explain every side's position and give time to weigh them. Ask what they themselves think, not only what would work for everyone.",
      role: "Negotiation, partnerships, diplomacy, arbitration, cross-team coordination.",
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
        text: "AVOCO returns scores only. It does not report which features of your voice produced a particular score, so this report cannot tell you that, either. The explanations you read here describe what each type and scale means in general, and how to read a score in your zone. They are written by this platform, not generated from your words.",
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
