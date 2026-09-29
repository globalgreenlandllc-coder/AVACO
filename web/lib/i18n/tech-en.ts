/**
 * Words for /technology: how AVOCO reads a voice and how far to trust it. Every claim here rests on one of four
 * sources, named on the page: the developer's published description of the method, AVOCO's official typology, the
 * platform's own tests against the live analysis, and the platform's own data handling. The developer's figures are
 * always attributed to the developer. {operator} is filled from lib/legal.ts.
 */
export interface TechText {
  meta: { title: string; description: string };
  hero: { eyebrow: string; title: string; lead: string; facts: string[] };
  voice: { eyebrow: string; title: string; paras: string[] };
  measured: { eyebrow: string; title: string; lead: string; items: Array<{ title: string; text: string }>; note: string };
  pipeline: { eyebrow: string; title: string; steps: Array<{ title: string; text: string }> };
  origin: { eyebrow: string; title: string; paras: string[]; stats: Array<{ figure: string; label: string }>; statsNote: string };
  accuracy: {
    eyebrow: string; title: string; lead: string;
    developer: { title: string; items: string[]; note: string };
    ours: { title: string; items: Array<{ title: string; text: string }> };
  };
  limits: { eyebrow: string; title: string; is: { title: string; items: string[] }; isNot: { title: string; items: string[] } };
  privacy: { eyebrow: string; title: string; items: string[]; link: string };
  tips: { eyebrow: string; title: string; items: string[] };
  sources: { eyebrow: string; title: string; method: string; research: string; typology: string; tests: string; open: string };
  cta: { title: string; text: string; record: string; sample: string };
  landingLink: string;
  footerLink: string;
}

export const techEn: TechText = {
  meta: {
    title: "How AVOCO reads a voice",
    description: "What AVOCO measures in thirty seconds of speech, how the analysis works, where it comes from, what we have tested ourselves and where its limits are.",
  },
  hero: {
    eyebrow: "The technology",
    title: "How AVOCO reads a voice",
    lead: "Everything we know about the technology behind your report: where it comes from, what it measures, what we have tested ourselves, and where its limits are. Nothing is hidden, and nothing is claimed that we cannot show.",
    facts: [
      "The same recording gives the same result, every time",
      "Sound, not words: nothing you say is transcribed",
      "Built by a voice-AI company, studied with more than 3,000 people",
    ],
  },
  voice: {
    eyebrow: "Why a voice",
    title: "Your voice carries more than your words",
    paras: [
      "Speaking is a physical act. Your breath, the tension of dozens of small muscles and the way your nervous system regulates them all shape the sound, before you choose a single word.",
      "Emotion, stress, tiredness and mental effort change those processes, and the changes can be measured in a recording. Voice research has studied this for decades: pitch, the steadiness of the tone, pace and pauses all move in recognisable ways.",
      "AVOCO applies that research to two questions: what kind of person the voice belongs to, and what state they are in right now.",
    ],
  },
  measured: {
    eyebrow: "What is measured",
    title: "Six kinds of measurement, taken from sound alone",
    lead: "From the recording, the analysis extracts acoustic measures of the same kinds used in speech science:",
    items: [
      { title: "Pitch", text: "The fundamental frequency of your voice, and how much it varies." },
      { title: "Steadiness", text: "Tiny cycle-to-cycle wobbles in pitch (jitter) and in loudness (shimmer)." },
      { title: "Voice quality", text: "How clear the tone is against breath and noise: the harmonics-to-noise ratio." },
      { title: "Timbre", text: "The shape of the sound's spectrum: MFCC, spectral centroid and spectral entropy." },
      { title: "Timing", text: "Your speaking tempo, and the length and frequency of your pauses." },
      { title: "Melody and energy", text: "The rise and fall of intonation across phrases, and how loudness is spent." },
    ],
    note: "No word is transcribed, stored or understood. What you talk about is entirely up to you.",
  },
  pipeline: {
    eyebrow: "From recording to report",
    title: "Five steps, about a minute",
    steps: [
      { title: "Your consent, then the recording", text: "Nothing is analysed until you tick the consent box. The recording is prepared on your own device in the format the analysis expects; from a video only the sound is used, and the video never leaves your device." },
      { title: "Cleaning", text: "The analysis evens out the level, reduces noise and cuts silence, so that it measures your voice rather than the room." },
      { title: "Measuring", text: "The acoustic features described above are extracted from what remains." },
      { title: "Scoring", text: "An ensemble of machine-learning models, neural networks working alongside classical algorithms, turns the measurements into a score from 0 to 100 on each of eight personality types and fourteen emotional scales." },
      { title: "Your report", text: "We present the scores with AVOCO's official description of each type, and add readings of our own, such as your best-fit fields of work, each marked as ours." },
    ],
  },
  origin: {
    eyebrow: "Where it comes from",
    title: "Built by specialists in voice AI",
    paras: [
      "The analysis is developed and run by Voxera, a voice-AI company in Kazakhstan. Its creator, Vsevolod Shchegelsky, has described the method in a published interview; the cleaning, the acoustic features and the model ensemble on this page come from that description.",
      "The eight personality types and their descriptions are AVOCO's official typology, from its Vocal Psychotyping System. We publish them as they were written.",
      "{operator} runs this platform: the recording, your account, the protection of your data and the report you read.",
    ],
    stats: [
      { figure: "3,000+", label: "people in the developer's studies" },
      { figure: "15,000+", label: "voice analyses in the developer's own app" },
      { figure: "2–3 s", label: "for the analysis itself" },
    ],
    statsNote: "The first two figures are reported by the developer; the time is what we measure.",
  },
  accuracy: {
    eyebrow: "How far to trust it",
    title: "What the developer reports, and what we checked ourselves",
    lead: "A trustworthy tool says how it was tested. Here is everything we know, including what has not been published yet.",
    developer: {
      title: "In the developer's studies",
      items: [
        "Accuracy of 70 to 90 percent, depending on the task and the personality type",
        "Internal studies with more than 3,000 people",
        "Built and tested with Russian, English and Kazakh speakers",
      ],
      note: "These are the developer's own figures. No independent study has been published yet, so we present them as reported, not as proven.",
    },
    ours: {
      title: "In our own tests",
      items: [
        { title: "Repeatable", text: "The same recording returned exactly the same numbers, to the decimal, every time we sent it." },
        { title: "Stable where it should be", text: "Speaking faster or slower, louder or quieter, or saying something completely different did not change the personality result. It follows the voice itself, which is why the same person gets the same type on different days." },
        { title: "Responsive where it should be", text: "The emotional scales move with pace, pauses and phrasing, as they are meant to. They also react to the microphone, background noise and the room, which is why we help you record well." },
        { title: "Honest about a single recording", text: "A voice close to the border between two types can land on either. That is why we average all your recordings and show how settled your type is." },
      ],
    },
  },
  limits: {
    eyebrow: "What it is, and what it is not",
    title: "A mirror, not a verdict",
    is: {
      title: "It is",
      items: [
        "An informed outside view of patterns in your voice",
        "A starting point for reflection, coaching and conversation",
        "Consistent: the same recording always gives the same result",
      ],
    },
    isNot: {
      title: "It is not",
      items: [
        "A medical or psychological diagnosis",
        "A lie detector",
        "A basis on its own for hiring, or for any decision about a person",
      ],
    },
  },
  privacy: {
    eyebrow: "Your voice stays yours",
    title: "Privacy at every step",
    items: [
      "Nothing is analysed without your consent, asked before every recording",
      "The analysis receives the sound and a random job number, never your name, email or account",
      "You can delete a report and its recording at any time, from the report itself",
      "We do not sell data, show ads or build advertising profiles",
    ],
    link: "Read the privacy policy",
  },
  tips: {
    eyebrow: "For the truest reading",
    title: "Help the analysis hear you",
    items: [
      "A quiet room with soft surroundings, not a bathroom or an empty hall",
      "Your everyday voice, about something ordinary, for about a minute",
      "The phone 10 to 20 centimetres away; a wired microphone beats Bluetooth earbuds",
      "Record again on different days: your type settles as recordings add up",
    ],
  },
  sources: {
    eyebrow: "Sources",
    title: "Where these facts come from",
    method: "The developer's published description of the method: an interview with Vsevolod Shchegelsky, in Russian",
    research: "Research on voice and emotion that the developer builds on: Scherer (2003); Cowie et al. (2001); Schuller et al. (2013); Eyben et al. (2016)",
    typology: "AVOCO's official report texts for the eight types (Vocal Psychotyping System), published here unchanged",
    tests: "Our own tests against the live analysis in September 2026: repeated recordings, and the same recordings made faster, slower, louder, quieter, noisier or with different words",
    open: "Open",
  },
  cta: {
    title: "Hear what your voice says",
    text: "Thirty seconds, on any topic. The full method stays with you, at the end of every report.",
    record: "Record my voice",
    sample: "See a sample report",
  },
  landingLink: "How it works, and how far to trust it",
  footerLink: "The technology",
};
