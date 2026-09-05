/*
 * Question set for the 2-minute Financial Roadmap Test.
 *
 * Types
 *   single   - one choice, auto-advances on click
 *   multi    - many choices, needs the Next button
 *   currency - numeric input with a peso prefix
 *   number   - plain numeric input with a unit suffix
 *
 * showIf(answers) is optional. Return false to skip the question.
 * Add, remove or reword freely - the scoring engine in app.js reads answers
 * by id, so keep the ids intact if you only want to change wording.
 */
window.QUIZ = [
  {
    id: "role",
    type: "single",
    q: "How do you contribute to your household finances?",
    options: [
      { v: "breadwinner", l: "I am the main breadwinner" },
      { v: "shared", l: "We share it more or less equally" },
      { v: "supporting", l: "I help out when I can" },
      { v: "self", l: "I only provide for myself" }
    ]
  },
  {
    id: "support",
    type: "currency",
    q: "Roughly how much do you set aside for your household every month?",
    hint: "A close estimate is perfectly fine."
  },
  {
    id: "years",
    type: "number",
    unit: "years",
    q: "For how many more years do you expect to keep providing that support?"
  },
  {
    id: "dependents",
    type: "number",
    unit: "people",
    q: "How many people would feel it financially if your income stopped?"
  },
  {
    id: "debt",
    type: "single",
    q: "Do you have loans or debts your family would be left with?",
    options: [
      { v: "yes", l: "Yes" },
      { v: "no", l: "No, none right now" }
    ]
  },
  {
    id: "debtAmount",
    type: "currency",
    q: "About how much is still outstanding on those loans?",
    showIf: function (a) { return a.debt === "yes"; }
  },
  {
    id: "ciCost",
    type: "single",
    q: "With healthcare costs the way they are, how much do you think recovering from a serious illness would take?",
    options: [
      { v: "750000", l: "Somewhere between 500,000 and 1,000,000" },
      { v: "1500000", l: "Somewhere between 1,000,000 and 2,000,000" },
      { v: "2500000", l: "More than 2,000,000" },
      { v: "unsure", l: "Honestly, I have no idea" }
    ]
  },
  {
    id: "sources",
    type: "multi",
    q: "If a diagnosis came next month, where would the money actually come from?",
    hint: "Pick everything that applies.",
    options: [
      { v: "savings", l: "Savings or emergency fund" },
      { v: "government", l: "Government benefits (PhilHealth, SSS, GSIS)" },
      { v: "hmo", l: "HMO from work" },
      { v: "loans", l: "Loans or credit" },
      { v: "family", l: "Help from family and friends" },
      { v: "insurance", l: "Insurance I already own" },
      { v: "assets", l: "Selling assets (property, car, business)" }
    ]
  },
  {
    id: "preference",
    type: "single",
    q: "Would you rather an insurer carried that cost, or are you comfortable as you are?",
    options: [
      { v: "insurer", l: "I would rather an insurer carried it" },
      { v: "current", l: "I am comfortable with my current setup" }
    ]
  },
  {
    id: "runway",
    type: "single",
    q: "If illness or injury stopped your income tomorrow, how long could your savings hold?",
    options: [
      { v: "3", l: "About 3 months" },
      { v: "6", l: "About 6 months" },
      { v: "12", l: "About a year" },
      { v: "unsure", l: "I need help working that out" }
    ]
  },
  {
    id: "income",
    type: "currency",
    q: "What is your monthly take-home income?",
    hint: "This stays private. It is only used to size your numbers."
  },
  {
    id: "outflow",
    type: "currency",
    q: "And roughly what do your total monthly expenses come to?"
  },
  {
    id: "coverage",
    type: "multi",
    q: "What protection do you already have in place?",
    hint: "Pick everything that applies.",
    options: [
      { v: "personal", l: "A personal insurance policy I pay for" },
      { v: "employer", l: "Insurance provided by my employer" },
      { v: "government", l: "Government benefits only" },
      { v: "hmo", l: "HMO" },
      { v: "none", l: "Nothing yet" }
    ]
  },
  {
    id: "motivation",
    type: "single",
    q: "What made you take this test today?",
    options: [
      { v: "get_insured", l: "I want to get insured" },
      { v: "comparing", l: "I am comparing my options" },
      { v: "learning", l: "Just learning more" },
      { v: "curious", l: "Just curious" }
    ]
  },
  {
    id: "timeline",
    type: "single",
    q: "What is your timeline for putting coverage in place?",
    options: [
      { v: "asap", l: "As soon as possible" },
      { v: "3months", l: "Within 3 months" },
      { v: "year", l: "Sometime this year" },
      { v: "research", l: "Just researching for now" }
    ]
  }
];
