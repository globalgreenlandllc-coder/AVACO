/** Words for naming whose voice a report is (lib/people.ts): the recorder's question, the report cover, My reports. */
export interface PeopleText {
  whoseTitle: string;
  me: string;
  /** "Dmitriy (me)" */
  meNamed: string;
  askFirst: string;
  someoneElse: string;
  namePlaceholder: string;
  whoseHelp: string;
  consentOther: string;
  analyseFor: string;
  reportFor: string;
  addName: string;
  change: string;
  editTitle: string;
  editHelp: string;
  save: string;
  saving: string;
  cancel: string;
  error: string;
  everyone: string;
  recordFor: string;
  trendFor: string;
}

export const peopleEn: PeopleText = {
  whoseTitle: "Whose voice is this?",
  me: "Me",
  meNamed: "{name} (me)",
  askFirst: "Before you record: whose voice will this be? The report is filed under that name.",
  someoneElse: "Someone else",
  namePlaceholder: "Their first name",
  whoseHelp: "Each person's recordings are read together, so their type settles over time. Different people are never mixed.",
  consentOther: "{name} is the person speaking in this recording and agreed to it being analysed by AVOCO and kept in my account.",
  analyseFor: "Analyse {name}'s voice",
  reportFor: "Report for {name}",
  addName: "Whose report is this? Add a name",
  change: "Change",
  editTitle: "Whose report is this?",
  editHelp: "Choose “Me” if it is your own voice.",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  error: "The name could not be saved. Try again.",
  everyone: "Everyone",
  recordFor: "Record {name}",
  trendFor: "{name} · change over time",
};
