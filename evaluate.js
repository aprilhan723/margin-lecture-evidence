"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const engine = require("./evidence.js");
const sample = require("./sample.json");
const corpus = [
  {id:"classroom", notes:sample.source,cases:[
    ["The lamp sensor's median latency fell to 12 milliseconds.",4,"candidate"],
    ["The final battery voltage was unchanged at 3 V.",7,"candidate"],
    ["The library queue grew on some afternoons.",10,"candidate"],
    ["A blue filter doubled the camera exposure time.",13,"candidate"],
    ["The battery measured 5 volts in the final trial.",7,"check"],
    ["The library queue always grew during the afternoon.",10,"check"],
    ["Rainfall predicted the price of train tickets.",null,"abstain"],
    ["Sandstone erosion produced fine red sediment.",null,"abstain"],
    ["The library queue predicted battery voltage.",null,"abstain"],
    ["The lamp sensor identified the address of the library.",null,"abstain"],
    ["Camera exposure determined the afternoon queue length.",null,"abstain"],
    ["The battery trial measured electricity prices in Seoul.",null,"abstain"]
  ]},
  {id:"signals",notes:[
    "A timing trial compared two independent devices.",
    "For routine maintenance, the workshop switched both devices off.","",
    "With the narrow filter, the circuit delay increased to 0.5 seconds.",
    "The broad filter was stored before the run.","",
    "The green lamp used 6 watts during the timing trial.",
    "A separate meter recorded room temperature.","",
    "The calibration table reported the median current for twelve runs.",
    "The average was not reported in the calibration table.","",
    "The survey reported the average grade for the morning group.",
    "The afternoon group skipped this survey."
  ].join("\n"),cases:[
    ["With a narrow filter, circuit latency rose to 500 milliseconds.",4,"candidate"],
    ["The green lamp used 6 watts.",7,"candidate"],
    ["The morning group's average grade appears in the survey.",13,"candidate"],
    ["The calibration table gives the median current.",10,"candidate"],
    ["The circuit delay decreased with the narrow filter.",4,"check"],
    ["The green lamp used 6 volts.",7,"check"],
    ["The green lamp did not use 6 watts.",7,"check"],
    ["Kitchen ovens baked wholegrain rye bread.",null,"abstain"],
    ["The orbit crossed Saturn's rings.",null,"abstain"]
  ]}
];
// These two post-change holdout examples were authored separately from the 21 development cases.
const holdout = [
  ["The green lamp measured vehicle traffic outside campus.",null,"abstain"],
  ["A narrow filter made circuit latency higher at 500 milliseconds.",4,"candidate"]
];
const results=[];
for(const set of corpus) for(const [q,expected,status] of set.cases) {
  const actual=engine.search(set.notes,q); const base=engine.baseline(set.notes,q);
  results.push({corpus:set.id,claim:q,expectedLine:expected,expectedStatus:status,
    actualLine:actual.rows[0]?.start ?? null,actualStatus:actual.status,baselineLine:base?.start ?? null});
}
const related=results.filter(row=>row.expectedLine!==null),absent=results.filter(row=>row.expectedLine===null),warn=related.filter(row=>row.expectedStatus==="check");
const count=(data,condition)=>data.filter(condition).length;
const summary={fixtureQueries:results.length,related:related.length,unsupported:absent.length,
  top1Correct:count(related,r=>r.expectedLine===r.actualLine),
  lexicalBaselineTop1Correct:count(related,r=>r.expectedLine===r.baselineLine),
  relatedCoverage:count(related,r=>r.actualLine!==null),unsupportedWithCitation:count(absent,r=>r.actualLine!==null),
  lexicalBaselineUnsupportedWithCitation:count(absent,r=>r.baselineLine!==null),
  warningCount:warn.length,warningsDetected:count(warn,r=>r.actualStatus==="check"),statusCorrect:count(results,r=>r.expectedStatus===r.actualStatus)};
function guard(name,condition){assert.ok(condition,name);return name;}
const guards = [
  guard("remove the unique source and abstain",engine.search("Outside the workshop the grass was wet.","The lamp sensor's median latency fell to 12 milliseconds.").status==="abstain"),
  guard("shift quote line numbers after inserting a heading and a blank",engine.search("Lab notebook\n\n"+sample.source,sample.queries[0][1]).rows[0].start===6),
  guard("do not interpret negation from an unrelated sentence",engine.search(sample.source,sample.queries[0][1]).status==="candidate"),
  guard("detect a quantity mismatch",engine.search(sample.source,"The final battery voltage was 8 volts.").status==="check"),
  guard("distinguish units from matching numerals",engine.search(sample.source,"The final battery voltage was 3 watts.").status==="check"),
  guard("report two equally plausible sources",engine.search("A clock delay decreased.\n\nA clock delay decreased.","The clock delay decreased.").status==="ambiguous"),
  guard("handle CRLF and preserve exact quotes",engine.search("Title\r\n\r\nThe blue lamp used 8 watts.","The blue lamp used 8 watts.").rows[0].text==="The blue lamp used 8 watts."),
  guard("empty input abstains",engine.search("", "").status==="abstain"),
  guard("blank document abstains",engine.search("\n \n","two words").status==="abstain")
];
const holdoutResults=holdout.map(([claim,line,status])=>{
  const actual=engine.search(corpus[1].notes,claim);
  const actualLine=actual.rows[0]?.start ?? null;
  return {claim,expectedLine:line,actualLine,expectedStatus:status,actualStatus:actual.status,pass:line===actualLine&&status===actual.status};
});
const report={holdoutResults,scope:"Hand-authored English synthetic examples with expected labels, created during development. Internal fixtures only; zero study participants. Baseline always returns one literal token-overlap match.",summary,guards,results};
fs.writeFileSync(__dirname+"/evaluation.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(summary)); console.log(JSON.stringify(holdoutResults));console.log(guards.length+" behavioral checks passed");
for(const row of results.filter(r=>r.expectedStatus!==r.actualStatus||r.expectedLine!==r.actualLine)) console.log("Deviation",JSON.stringify(row));
