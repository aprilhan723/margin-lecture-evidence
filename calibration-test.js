"use strict";
const assert = require("node:assert/strict");
const { search } = require("./evidence.js");

// AI-authored synthetic fixture. Blank lines count towards the citation.
const notes = [
  "Bridge sensor calibration",
  "",
  "The bridge sensor offset was −0.25 volts after calibration.",
  "",
  "The amber lamp used 6 watts."
].join("\n");

const cases = [
  ["The bridge sensor offset was +0.25 volts after calibration.", "check", 3],
  ["The bridge sensor offset was 0.25 volts after calibration.", "check", 3],
  ["The bridge sensor offset was -0.25 volts after calibration.", "candidate", 3],
  ["The bridge sensor offset was −0.25 volts after calibration.", "candidate", 3],
  ["Rain delayed the campus shuttle.", "abstain", null]
];

for (const [claim, status, expectedLine] of cases) {
  const result = search(notes, claim);
  assert.equal(result.status, status, claim);
  assert.equal(result.rows[0]?.start ?? null, expectedLine, claim);
  if (expectedLine) assert.equal(result.rows[0].text, notes.split("\n")[expectedLine - 1]);
  if (status === "check") assert.ok(result.rows[0].reasons.some(r => r.includes("quantity")));
  console.log(JSON.stringify({ claim, status, line: expectedLine }));
}
