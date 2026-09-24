/**
 * AVOCO's official type content, taken from the original AVOCO report ("Vocal Psychotyping System").
 * `overview` is the official typology paragraph and exists for all eight types.
 * `full` is the complete official report for a type. Only the Catalyst report has been supplied so far;
 * add the other seven here (same shape) as their reports arrive, and the report page picks them up.
 */
export const typesEn = {
  ui: {
    overview: "About this type",
    mindset: "Mindset",
    groups: {
      team: "Role in the team",
      motivation: "Motivation and psychological need",
      resources: "Attitude toward resources",
      communication: "Communication type",
      stress: "Behaviour under stress",
      relationships: "Relationships",
      compatibility: "Compatibility",
    },
    roles: "Roles and responsibilities",
    socialRole: "Social role",
    strengths: "Key strengths",
    risks: "Risks",
    authority: "Attitude toward authority",
    subordination: "Attitude toward subordination",
    environment: "Preferred work environment",
    motive: "Personal motive",
    needs: "Psychological needs",
    management: "Motivation and management",
    money: "Money",
    time: "Time",
    people: "People",
    interaction: "Interaction style",
    channel: "Communication channel",
    decisions: "Decision-making style",
    speech: "Speech",
    wantToHear: "What they want to hear",
    vocabulary: "Their vocabulary",
    emotion: "Primary emotion",
    mask: "Stress mask",
    triggers: "Triggers",
    stage1: "First stage of stress",
    stage1Note: "Lasts only a few seconds and occurs many times a day. It signals entering stress and warns that understanding may be lost and communication disrupted.",
    stage2: "Second stage of stress",
    stage2Note: "Communication breakdown, unmet psychological needs, active onset of the stress response. Can last from several minutes to several days.",
    extreme: "Extreme stage of stress",
    extremeNote: "Prolonged stress, problematic scenario.",
    bottom: "Bottom of stress",
    bottomNote: "The consequences of prolonged stress. After reaching the bottom, a person is forced to fundamentally change their life stance, often abandoning previous psychological needs; a reassessment of oneself, one's strategy and one's life takes place. In the worst case, they remain stuck at the bottom.",
    pattern: "Pattern",
    exit: "Exiting stress",
    negative: "Negative manifestation of the type",
    business: "Preferred style of business relations and priorities",
    businessProblem: "Problematic scenario in business relationships",
    love: "Love language",
    loveProblem: "Problematic relationship scenario",
    style: "Preferred relationship style and priorities",
    compatibilityLead: "How this type gets on with each of the eight types, out of five.",
    outOf: "{score} of 5",
    pendingTitle: "Full AVOCO report",
    partialNote: "AVOCO's full report for this type (role in the team, motivation, communication, behaviour under stress, relationships, compatibility) has not been added to this platform yet. Shown above: AVOCO's official description of the type, and a short reading drawn from it.",
  },

  profiles: {
    organizer: {
      overview: "The Organizer is self-confident, decisive, stress-resistant, and knows how to insist on their own. This personality type values order, stability, and clear rules, adhering to an internal code. They expect others to share their principles and strive to establish their own order. They love systems, wanting everything to be logical and to correspond to certain recognized standards and requirements. They prefer to plan and take a structured approach to their functions at work and in personal life. They excel at building systems, planning time, and allocating resources. The Organizer is responsible, disciplined, and results-oriented. Such people avoid chaos and uncertainty, preferring that everything go according to plan. They avoid problems, strive to create a safe environment, and want everything to meet their expectations. In communication, they tend toward directness, logic, and consistency. They prefer to know in advance the stages and necessary steps for implementing what is important to them. Subconsciously, they divide people into \"us\" and \"them.\"",
    },
    driver: {
      overview: "The Driver possesses a strong nervous system, stable work capacity, high mental tone, and energetic potential. This is a passionate personality type who loves to take responsibility, make important decisions, and be on the front line. They are self-confident, not afraid to take risks, and always strive for high results. Drivers are oriented toward victory and the successful achievement of goals; they often inspire those around them with their energy and drive for leadership. In communication, Drivers prefer confidence and concreteness; they excel at building advantageous relationships and alliances, and are charismatic. They tend to become fixated on a single supremely important idea that they wish to bring to life. They live by grand meanings and super-goals or super-tasks. They want to influence large systems, social processes, and the like. They are very \"contagious,\" able to suggest what they want, lead people, and attract attention. They are possessive of their ideas. They like and know how to handle power; they are maximally goal-oriented. They easily create advantageous connections and enjoy authority.",
    },
    catalyst: {
      overview: "The Catalyst possesses a strong nervous system. They are characterized by stable work capacity, high mental tone, and energetic potential. Their psyche quickly switches from solving one task to another. They are easygoing, energetic people, excellent communicators who can easily create useful connections and quickly adapt to a new environment. They strive for the broadest possible communication and a kaleidoscopic sequence of life events. Optimistic, cheerful, and swift, they find a way out of any situation and are skillful in business. They are oriented toward profitable, sharp, and clear decisions. They think quickly and act quickly. High discernment and the ability to verify any information through acquaintances give them the ability to make instant decisions. They sense an advantage. These are people who value speed. Life is a game to them, and humor is their main weapon. Their primary need is to receive positive emotions, so they prefer to always be surrounded by people, most often in high spirits. This is periodically replaced by brief depressive episodes.",
      full: {
        mindset: "Fast, situational, reflects a flow of ideas and expression of momentary emotions; they have difficulty assessing risks. They easily switch from one task to another; they are multi-taskers. A broad, optimistic view of what is happening in the real world.",
        team: {
          intro: "The Catalyst is the team's inspirer, whose energy and charisma energize those around them. They are able to infect everyone with an idea, attract attention, and charge people with energy. They easily become an informal leader, attracting attention with their optimism and resourcefulness. The Catalyst generates ideas, motivates the team, and actively participates in project promotion. They are characterized by high work speed, communicative talents, and the ability to find unconventional solutions.",
          roles: "Idea generator, producer, creator, motivator, networker, salesperson, communicator, product developer, and marketing strategist — these roles can be combined in one person. The Catalyst is ideal for negotiations, attracting new resources, managing sales, and launching new projects.",
          socialRole: "The Catalyst serves as a motivator and catalyst for change. They connect people, establish relationships, inspire forward movement, and actively participate in achieving team goals. They charge people with energy and optimism.",
          strengths: [
            "Charisma and positive influence on the team.",
            "Ability to generate new ideas and initiatives.",
            "Ability to attract people and resources.",
            "Courage in decision-making.",
            "Multi-tasking.",
            "High speed in resolving issues and implementing them.",
            "Developed communication skills.",
            "Brightness and memorable presence.",
            "Disarming sense of humor.",
            "Resourcefulness and creative approach.",
            "High level of inner freedom and independence.",
            "Love of life and optimism.",
            "Behavioral flexibility and inventiveness.",
          ],
          risks: [
            "Superficial approach to tasks.",
            "Lack of focus on long-term goals.",
            "Tendency to scatter attention.",
            "Carelessness, lack of caution.",
            "Takes on many things but does not finish them; unreliability.",
            "Lack of commitment and irresponsibility.",
          ],
          authority: "Respects inspiring leaders who support initiatives. Cannot stand strict hierarchy and limitations. May ignore authorities who seem boring or hinder progress.",
          subordination: "Subordination is conditional. The Catalyst prefers flexible rules and minimal bureaucracy. Often violates subordination if it helps achieve goals.",
          environment: "Prefers to work in a team, successfully handles multi-tasking, and maintains numerous contacts. They thrive on changes of scenery and activity types, as well as open spaces. Excellent results are achieved when there is an opportunity to create and innovate, as well as to diversify communication.",
        },
        motivation: {
          motive: "Striving for vivid emotions, challenges, risks, and recognition. Seeking the strongest sensations in the shortest amount of time. Living in the moment and to the fullest, feeling the game of life.",
          needs: "The Catalyst seeks vivid emotions, challenges, and recognition of their achievements. Adrenaline and the feeling of standing out among the best are important to them. Praise for successes and attention to their charisma stimulate them to move forward. They strive to be the center of attention, to be heard, and to influence events. The ability to quickly implement ideas and see the results of their work is also a key motivating factor.",
          management: "Clearly state in advance that documentation and reports will be strictly controlled. Penalize violations of agreements and promises. Provide opportunities for informal communication and humor. Remind them to \"think first, then act\"; give them a pause to reflect. During depressive episodes — cheer them up and help them. Do not give new assignments when old ones are incomplete. Stop them from shifting responsibility onto others.",
          money: "For the Catalyst, money is a symbol of freedom and opportunity. They see it as a tool for a rich life, implementing ideas, and creating a luxurious, adventure-filled environment.",
        },
        resources: {
          time: "They handle this resource flexibly, living \"here and now.\" They may miss deadlines if they find something more interesting. Although they value time, they do not always adhere to rigid limits.",
          money: "They easily take and spend money if it involves creating new opportunities. They spend based on internal response; they are not strong in strategic planning and financial accounting, but they have a good sense of opportunities.",
          people: "They use human resources to create energy in the team. Their style is to inspire rather than control, but they may forget about evenly distributing workload among employees. They make many new acquaintances; they are not stable in their affections.",
        },
        communication: {
          interaction: [
            "Use a free communication style, avoiding formalities and rigid hierarchy.",
            "Maintain an active and positive atmosphere in dialogue.",
            "Be prepared for fast, multi-tasking discussions.",
            "Emphasize achievements, opportunities, and benefits.",
            "Respect their opinion, but do not be afraid to gently correct them if they are wrong.",
            "Demonstrate flexibility and readiness to adapt to changes during the dialogue.",
            "Support initiative, ask questions, demonstrate engagement.",
          ],
          channel: "Democratic, with room for a joke — the main thing is that it is not boring.",
          decisions: "Impulsive, based on current circumstances, opportunities, and personal interest. Makes decisions quickly, especially if they see an advantage or bright prospects.",
          speech: "Fast, gushing, expressive, inconsistent, emotionally charged, with many stories and humor. Sometimes they jump from one topic to another, using words that reflect their attitude at the moment: wow, cool, super, ugh, what the hell, etc.",
          wantToHear: [
            "A unique opportunity",
            "You're doing a great job",
            "This will bring success",
            "That's an innovative solution",
            "Your energy is contagious",
            "We will achieve our goals together",
            "Great idea, thought, solution",
            "How do you manage to do all this?",
          ],
          vocabulary: ["Idea", "Project", "Opportunities", "Potential", "Energy", "Innovation", "Success", "Movement", "Progress", "Team", "Connections", "Result", "Fast", "Creative", "New approach", "Flexibility"],
        },
        stress: {
          emotion: "Irritation, inability to hide a negative reaction; rolling eyes; irony may turn into sarcasm.",
          mask: [
            "Vertical furrow between the eyebrows, showing bewilderment or anger; phrases: \"Who said?\", \"What do you mean?\"",
            "Raised shoulders, gestures of the \"it's not my fault\" variety.",
            "Sardonic smile or strained laugh.",
            "Emotional outbursts: sharp intonations and raised voice.",
          ],
          triggers: [
            "Difficulties requiring significant mental effort, when they have to strain to do something that does not bring immediate joy.",
            "Pressure from outside, external coercion, control.",
            "Lack of recognition for achievements.",
            "Monotony, lack of novelty and bright challenges.",
            "Boredom, monotony, loss of interest.",
            "Feeling of fatigue and irritation due to routine.",
          ],
          stage1: [
            "Face immediately shows displeasure, facial furrows appear.",
            "Attempt to shift responsibility: \"What do you mean? Why me?\", \"Let someone else do it.\"",
            "Sharp expression of irritation: \"What nonsense?\", \"Why is this even needed?\"",
            "Demonstrative unwillingness to take on complex tasks, being stubborn.",
            "Inviting others to think and do it for them.",
          ],
          stage2: [
            "Blaming others: \"Why did you do that?\", \"This is all because of you!\", \"Yeah, but you!!!\"",
            "Complains with a negative attitude or simply grumbles, without even trying to find a constructive action.",
            "Raises voice, boils over, shouts, accuses others.",
            "Deflects blame, shifts responsibility for mistakes onto others.",
            "Crosses the boundaries of their \"games,\" becomes cruel, hurts others; irony turns into sarcasm: \"Of course, you always do everything so perfectly!\"",
          ],
          pattern2: "I would have done it better, but I'm surrounded by incompetents",
          extreme: [
            "Becomes vindictive: \"You're ruining my life, so I'll ruin yours!\"",
            "Irresponsibility toward the team and project sets in.",
            "Abandoning projects, refusing to participate in discussions.",
            "Outbursts of aggression and desire for revenge for \"failure.\"",
            "Belief that everyone around is to blame for their failures.",
          ],
          patternExtreme: "You let me down, now figure it out yourselves",
          bottom: [
            "Depressive state, loss of faith in success in solving tasks and in the power of creativity.",
            "Isolation, refusal to interact.",
            "Apathy regarding work and their own ambitions.",
            "Reassessment of life goals, change of strategy, or abandonment of previous beliefs.",
          ],
          exit: "It is important for the Catalyst to have recognition of their creativity, optimism, and support. They need tasks that stimulate their interest and give them a sense of challenge. They need to feel the game, excitement, and freedom. The team must recognize their leadership, and criticism must be gentle and constructive.",
          negative: [
            "Causticity and sarcasm, accompanied by sharp, hurtful remarks.",
            "Tendency toward fussiness: they take on everything but finish nothing.",
            "Frivolity, idleness, and a superficial attitude toward responsibilities.",
          ],
        },
        relationships: {
          business: "Intense interaction with elements of competition, where excitement is maintained within the partnership, a democratic communication style where there are no clear boundaries between work and personal life. They like to create business partnerships based on friendship, the \"partner in crime\" type. In a partnership, they fit the role of instigator, communicator, negotiator, and creative. Ideal partnership with someone to whom they can entrust control over finances, agreements, and management of strategic issues.",
          businessProblem: "They promise but do not deliver, quickly lose enthusiasm, are inconsistent in their intentions, neglect obligations, and abandon things halfway.",
          love: "Attention and fun. Catalysts love it when relationships bring joy, drive, and new experiences. It is important to them that their partner shares their active lifestyle, values their charisma, and supports their endeavors. They perceive care through vivid emotions, shared activities, new challenges, and ease of communication.",
          loveProblem: "Catalysts may avoid serious conversations and responsibility in relationships if they feel they are losing freedom. They tend to avoid dialogue or resort to sarcasm if their partner demands excessive attention to domestic or emotional matters. Sometimes they can be inconsistent and forget about agreements, causing their partner to feel unstable. There is also a risk that the Catalyst will lose interest in the relationship if it becomes routine or lacks vivid emotions. Conflicts are often related to lack of restraint and the habit of shifting responsibility.",
          style: [
            "Oriented toward relationships that provide emotions, drive, and variety.",
            "Value ease, spontaneity, and openness in communication.",
            "Prefer partners who are willing to compromise and do not restrict their freedom.",
            "Enjoy playing the role of inspirer and leader in relationships.",
            "Relationships for them are a source of new experiences, not routine.",
            "Tend toward flirting and charismatic behavior, which can create difficulties for jealous partners.",
          ],
        },
        compatibility: {
          organizer: { score: 2, note: "structure interferes" },
          driver: { score: 4, note: "leaders duo" },
          catalyst: { score: 5, note: "energy match" },
          performer: { score: 5, note: "bright and happy" },
          harmonizer: { score: 5, note: "support each other" },
          analyst: { score: 2, note: "too different" },
          skeptic: { score: 3, note: "calmness might tire" },
          mediator: { score: 3, note: "inspire with wisdom" },
        },
      },
    },
    performer: {
      overview: "The Performer is a personality type with the most vibrant energy, which attracts the attention of many people. These individuals possess a rich imagination and often find creative approaches to solving tasks efficiently. Their ability to see the world through the prism of emotions and images allows them to create something unusual, inspiring, bright, and beautiful. The key behavioral tendency is the creation and presentation to the general public of an illusorily prosperous model of the world (or a demonstratively unhappy one), in which the Performer's own \"I\" occupies the central place. They attract people through their natural charm, becoming the center of attention and inspiring others with their enthusiasm. They know how to create an atmosphere of celebration and motivation. They know how to emotionally \"infect\" others, motivating them to take action. They are able to make quick decisions and take responsibility for results, especially when it brings them recognition. They are masters at creating all kinds of illusions of future well-being and guaranteed success. They have the ability to make the most favorable impression on people from the very first minutes of meeting. They tend to promise a lot and broadly declare large-scale intentions. They strive to create social resonance through their behavior. They are socially flexible and capable of role-playing behavior. They know how to work with public attention and opinion, and they enjoy doing so.",
    },
    harmonizer: {
      overview: "The Harmonizer is a person with high emotional sensitivity who easily senses and understands the feelings of others. They easily find an approach to different people through care and personal compliments. Sincerity, openness, and trust in communication are important to them. Harmonizers tend to pay attention to details and prefer a soft, friendly communication style. They value support and try to avoid conflicts, therefore they need the conversation to be as comfortable and good-natured as possible. They strive for harmonization and humanization. They cannot stand hints of vulgarity, rudeness, or disharmony. They have a refined sense of beauty. These are people of genuine, not feigned, emotions. They sympathize and empathize with others. They react emotionally to the smallest nuances of what is happening. They easily grasp all shades of their interlocutor's mood. They are scrupulous in matters of morality. By nature, they are altruists and pacifists.",
    },
    analyst: {
      overview: "The Analyst is a personality type distinguished by original thinking and unconventional solutions, a worldview that gives birth to creativity and novelty. They are focused on intellectual creativity and the creation of intellectual products. An introverted type who prefers to withdraw from social activity, they are more immersed in their own unique and rich inner world, which they protect as much as possible from external idle curiosity. Among such people, one often finds mathematicians, architects, IT developers, artists, and directors — anyone whose profession requires an original approach and thinking. They may have a rich inner world but do not express it outwardly. These are simple-hearted, somewhat naive people characterized by social inexperience. They may be disciplined in their passions but neglect practical duties and subordination. They may seem detached, have difficulty engaging in social processes, and are reluctant to make contact with other people. As a rule, they possess high intelligence and always tirelessly develop themselves in a narrow area of interest, achieving significant success in it. They are often called servants of their talent because their talent manifests more than their personality itself. They are characterized by unpredictability due to their original thinking and, from the majority's perspective, illogical actions and decisions. Intellectual creativity — always and in everything.",
      full: {
        "mindset": "Thinking is original, based on forming concepts about objects and phenomena of the surrounding world based on their secondary characteristics. The ability to create entire virtual worlds and concepts. Thinking is independent and reflexive, may be inconsistent. Difficulties with goal-setting. Concealed high self-regard. Difficulty in learning and implementing even relatively simple behavioral stereotypes. Naivety. Inconsistency and distractibility.",
        "team": {
          "intro": "The Analyst is a deep analyst and visionary who immerses themselves in the essence of processes and projects, creating intellectual yet creative solutions. They are characterized by a high degree of concentration in their area of interest, innovative thinking, and the ability to generate unconventional solutions. The Analyst is autonomous, independent, and inclined to work alone, creating complex and large-scale concepts. Their unique ideas and deep knowledge make them indispensable in a team, especially in areas requiring intellectual creativity.",
          "roles": "Research work, technology development, analytics, creating the architecture of complex, multi-component projects and processes — roles in which the Analyst can demonstrate their strengths.",
          "socialRole": "The Analyst fulfills the role of creator of complex structures and intellectual-creative solutions, providing the team with access to unique knowledge and innovative ideas. They are rarely involved in daily interactions, but their contribution has long-term value.",
          "strengths": [
            "Innovative thinking and the ability to find unconventional solutions.",
            "Deep expertise in their chosen field.",
            "Autonomy and independence, ability to work effectively alone.",
            "Alternative, multidimensional, and abstract thinking.",
            "Strong vision and developed cognitive functions.",
            "Ability to maintain high concentration on a process.",
            "Emotional stability in difficult situations.",
            "Finds simplicity in complexity.",
            "Generates novelty.",
            "Well-developed associative thinking.",
            "Excellent imagination and creative approach.",
            "Tolerance and acceptance of diversity.",
            "Feels comfortable in virtual space.",
            "Easily engages in thought experiments, arriving at original and precise conclusions without practical experience."
          ],
          "risks": [
            "Tendency toward isolation and insufficient engagement in team processes.",
            "Difficulty adapting to social norms and team dynamics, asociality.",
            "Experiences difficulty in bringing what they have started to the intended goal.",
            "Cannot perform work strictly according to a template."
          ],
          "authority": "This personality type respects authorities who demonstrate high competence and intellectual depth. Official titles and status for their own sake do not interest them. They may ignore formal positions if they do not see real substance or benefit behind them.",
          "subordination": "They tend toward autonomous work, perceiving subordination more as a formality. Rules are important to them only as long as they do not interfere with their personal effectiveness. Analysts value freedom of action and prefer to work according to their own schedule, avoiding rigid constraints.",
          "environment": "The ideal work environment is autonomy and the ability to immerse themselves in complex tasks. They value quiet, minimal social distractions, and access to resources that facilitate deep analysis and creativity."
        },
        "motivation": {
          "motive": "Striving for intellectual creativity and experimentation, creating novelty.",
          "needs": "The Analyst strives to preserve personal autonomy and the ability to realize their own ideas in a comfortable environment, in solitude. It is important to them that their right to independence is recognized, and that others respect their unique vision and approach to tasks. They prefer to work by their own rules, avoiding imposed limitations.",
          "management": "Pay compliments to their theoretical preparation and intellectual, creative solutions. Develop their initiative. Prefer working with a computer rather than with people. Ask them to provide reports in writing rather than orally. Do not emphasize your own status when interacting with the Analyst.",
          "money": "Money is a tool for creating a personal world that corresponds to their inner vision. The Analyst values functionality and is willing to spend money if the expenses contribute to realizing their ideas."
        },
        "resources": {
          "time": "They may miss deadlines and do not always feel time constraints, considering time as their personal resource. Such people do not like it when their time is wasted unnecessarily and prefer to work at their own pace, without external pressure.",
          "money": "Money is not a goal for them but a means. Analysts are not prone to wastefulness but are willing to spend money if they consider the expenses justified. Saving for the sake of saving is not attractive to them, especially if it limits their capabilities.",
          "people": "They value professionalism and independence in others. Interaction with people who respect their autonomy and do not demand constant attention is most comfortable for them. Such individuals prefer to avoid participating in collective discussions unless necessary, and try to distance themselves from excessive emotionality in relationships."
        },
        "communication": {
          "interaction": [
            "Build communication based on respect for their intellect and individuality.",
            "Avoid excessive emotions; focus on content and facts.",
            "Ask questions about their ideas, demonstrating interest in the depth of their thoughts.",
            "Give clear instructions without unnecessary pressure, providing autonomy.",
            "Listen to their conclusions and suggestions, encourage original approaches.",
            "Do not invade their personal space; maintain professional distance.",
            "This personality type is very sensitive to criticism and covertly aggressive.",
            "Prefers to communicate with those similar to themselves."
          ],
          "channel": "Prefer a directive communication channel, with clear instructions on what to do, without interfering in the execution process. Prefer written formats — email or structured discussions. Emotionally neutral, rationally constructed conversations are most comfortable for them.",
          "decisions": "Decisions are based on an internal representation of how things exist in their world, according to their logic, analysis, and internal value system. They carefully think through every detail, avoiding spontaneity. They are illogical from an outside perspective, often finding something important in minor details.",
          "speech": "Verbose but not fast. Highly theoretically grounded. Philosophizing and delving into specific topics. Only opens up with those close to them. Considers many options. Not limited to a single solution.",
          "wantToHear": [
            "Brilliant",
            "That is a very deep, fascinating idea",
            "Your approach is unique",
            "Your conclusions are impressive, captivating",
            "Tell me how you came to this",
            "That sounds brilliant",
            "Your reflections open up new horizons",
            "Your contribution could change the world"
          ],
          "vocabulary": [
            "Depth of analysis",
            "Unusual approach",
            "Theory",
            "Concept",
            "Immersion",
            "Unique idea",
            "Logic",
            "World of meanings",
            "Elaboration",
            "Innovation",
            "Impressive result",
            "Comprehensive",
            "Vision",
            "Representation",
            "Universe",
            "Worldview"
          ]
        },
        "stress": {
          "emotion": "Withdrawal, detachment. May secretly act out of spite if offended.",
          "mask": [
            "Cold and alienated facial expression, avoiding gaze (to the side or past the interlocutor).",
            "Body language demonstrates a desire to disappear, to hide.",
            "If not allowed to leave for a long time, may explode."
          ],
          "triggers": [
            "Violation of personal distance.",
            "Criticism of their ideas or worldview.",
            "Pressure aimed at forcing participation in teamwork.",
            "Loss of control over time and tasks."
          ],
          "stage1": [
            "Attempt to disappear from the situation, avoiding eye contact.",
            "Minimal responses or complete ignoring of questions.",
            "Withdrawal into oneself, silence."
          ],
          "stage2": [
            "Behavior becomes even less productive. The person may pretend to work but will avoid performing real tasks — loss of connection with motivation occurs.",
            "They become indecisive, excessively slow, and may irritate others with their apathy.",
            "Ignoring commitments, missing deadlines, \"daydreaming.\"",
            "Lack of initiative to return to work, waiting for an external invitation or proposal.",
            "Acts out if unable to be alone."
          ],
          "pattern2": "Nobody needs me, let them decide for themselves",
          "extreme": [
            "Complete self-exclusion from team life.",
            "Retreat into their inner worlds, refusal of contact.",
            "Physical removal from sources of stress.",
            "They may fall into a state of complete inaction and meaningless avoidance of any decisions.",
            "The Analyst can no longer cope with external or internal demands."
          ],
          "patternExtreme": "Nobody understands me, I'd rather stay alone",
          "bottom": [
            "Complete loss of interest in the real world. \"I am not needed or of interest to anyone here.\"",
            "Neglect of appearance and social norms.",
            "Replacement of real contacts and actions with fantasies or solitude.",
            "Complete lack of contact with reality, refusal of even the most basic actions (for example, may not answer questions or respond to requests)."
          ],
          "exit": "The Analyst needs to be given freedom of choice and time to recover. Clear boundaries of interaction and respect for their autonomy are necessary. Encouragement of their ideas and recognition of their significance will help bring them back to the team. Make sure they understand your intention regarding the value of their contribution. Support their confidence by outlining specific steps for completing tasks. Give clear instructions for action.",
          "negative": [
            "Withdrawal, unwillingness to maintain connections.",
            "Ignoring rules and norms accepted in society.",
            "Retreat into fantasies, detachment from reality.",
            "Chaotic behavior and neglect of external aspects of life.",
            "Difficulty communicating with them.",
            "Ineffective communication.",
            "Indifference to the experiences of others.",
            "Inability to establish contacts.",
            "Emotional dullness.",
            "Lack of friends.",
            "Concealed pretension to genius.",
            "Suppressed aggression."
          ]
        },
        "relationships": {
          "business": "They work well in roles as strategists, analysts, or people responsible for long-term plans, research, and \"behind-the-scenes\" work. Their strengths are imagination, attention to detail, and the ability to generate unique ideas. The Analyst needs an active and decisive partner who will take over operational management, quick decision-making, and the implementation of their ideas. It is better not to burden the Analyst with tasks requiring urgent responses or work involving high social activity. The partner can take on these functions. It is important for the Analyst to receive assurances that their ideas and contributions are valuable, even if they are not always involved in daily operational work. The ideal union: the Analyst as the creator and developer of intellectual and creative solutions, with a partner who is the Skeptic and the Communicator, complementing them with activity, the ability to take risks, and work in a dynamic environment.",
          "businessProblem": "The Analyst loses connection with motivation, misses deadlines, and withdraws at a critical moment. Their actions become illogical, and they cannot begin actual task execution. They suddenly grow cold toward their partner, avoid communication, and become completely closed emotionally. They exclude themselves from all processes.",
          "love": "Space and respect. The Analyst perceives love as granting them freedom for creativity and reflection. Gestures demonstrating acceptance of their uniqueness and even genius are important, such as supporting their interests or respecting their personal boundaries. Non-verbal care and unobtrusive expressions of love are preferable to loud words for them. They express gratitude through intellectual or highly unusual, personalized gifts filled with meaning (books, paintings, interesting trinkets, unique experiences). They may not speak openly about their feelings, but they will be there during difficult times. If the Analyst opens up and invites a partner into their inner world, this is a sign of deep trust. This person values freedom and deep intellectual connection. They perceive love through joint discussion of ideas, philosophy, art, or other inspiring topics. They consider themselves unusual, \"not like everyone else,\" so it is important for a partner to accept the Analyst as they are.",
          "loveProblem": "Analysts may be emotionally closed off, causing the partner to feel detachment, distance, and a lack of attention. Their desire to preserve inner freedom is sometimes perceived as indifference. Conflicts arise if the partner tries to impose close emotional contact or demands more attention than the Analyst is ready to give. They also tend to avoid solving problems, preferring to withdraw into themselves, which widens the gap in the relationship. If their boundaries are constantly violated, they may completely withdraw, destroying the relationship. Dialogue may simply fail to develop.",
          "style": [
            "Prefer emotionally unobtrusive relationships with an emphasis on intellectual closeness.",
            "Feel more comfortable in relationships where the partner shares their interests and respects their need for solitude.",
            "Value respect for personal boundaries and the freedom to be themselves.",
            "Strive for long-term relationships based on mutual independence.",
            "Expect a partner who does not demand constant emotional involvement.",
            "Enjoy discussing abstract ideas and value intellectual conversations more than romantic expressions.",
            "Value self-sufficient, deep partners who are fascinating in their uniqueness.",
            "It is important to them that their beloved accepts them as they are, including their unconventional thinking, interests, and occasionally unusual behavior."
          ]
        },
        "compatibility": {
          "organizer": {
            "score": 2,
            "note": "distance interferes"
          },
          "driver": {
            "score": 2,
            "note": "ignoring ideas"
          },
          "catalyst": {
            "score": 2,
            "note": "different approach"
          },
          "performer": {
            "score": 2,
            "note": "too bright"
          },
          "harmonizer": {
            "score": 2,
            "note": "emotional detachment"
          },
          "analyst": {
            "score": 5,
            "note": "respect for space"
          },
          "skeptic": {
            "score": 2,
            "note": "different tempo"
          },
          "mediator": {
            "score": 4,
            "note": "deep understanding"
          }
        }
      },
    },
    skeptic: {
      overview: "The Skeptic is distinguished by high sensitivity, a tendency toward self-criticism, and deep internal reflection. They strive for self-improvement through self-analysis. Although this personality type may exhibit doubt and caution, they possess many valuable qualities that make them unique and indispensable in certain areas of life. They are sensitive, reliable, and responsible individuals. They always strive for excellence and are willing to work on themselves. Their qualities make them indispensable in teams where attention to detail, analysis, and responsibility are important. They avoid impulsive decisions, carefully weighing all pros and cons. They are meticulous and responsible in their work, always approaching their duties with the utmost seriousness. Skeptics will not allow themselves to \"cut corners\" and strive to bring things to perfection. They see possible risks and think through ways to prevent them in advance. If this personality type gives their word, they will try to keep it and not let anyone down. They are driven by a desire to do everything \"correctly,\" therefore they constantly improve their skills and knowledge. They lean toward conservatism, preserving traditional forms of behavior, and oppose chaos and ill-considered, reckless changes in society.",
    },
    mediator: {
      overview: "This personality type has a rich inner world and the ability to see beauty even in the smallest details. Their emotional depth makes them good listeners and conversationalists. Their inner compass is attuned to fundamental universal ideals, which they choose to serve. Those around them often mistake this for self-sacrifice or masochism, which can indeed happen when this personality type feels out of place in the material world and falls into depressive states. Such people easily empathize with others' pain and are ready to help, often prioritizing others' needs over their own. Their tendency toward reflection and sensitivity make them talented in art, music, literature, or other creative fields, as they sense the primordial harmony of the world and its subtle aspects. They always remain true to their ideas, friends, loved ones, and responsibilities, provided these align with their worldview. Thanks to their sensitivity, they often notice things that others miss. These are people with a rich inner world who bring depth, sincerity, and service to the world. Often, their presence, even unnoticed by the majority, can harmonize the space. On the other side, they are antisocial, disillusioned with life and people. They tend to experience \"persistent stagnant\" states, a lack of a sparkling sense of humor, and a lack of hearty laughter (more often, one might see a Pierrot-like smile). They find solace in spirituality, poetry, creativity, and philosophy. From a materialistic and achievement-oriented perspective, this personality type has low motivation for change, development and achieving goals. They strive for autonomy and independence from everyone.",
    },
  },
};
