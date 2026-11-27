(function(root) {
  "use strict";
  const STOP = new Set("a an the it of on in to from for there with as than at is are was were be been had has have does did do by before after this that its their but and or when even into one which while during per".split(" "));
  const ALIASES = new Map();
  for (const group of ["increase increased increases increasing higher rose larger greater", "decrease decreased decreases decreasing lower fell smaller reduced", "unchanged stable identical equal", "double doubles doubled twice twofold", "trial trials", "repeat repeats repeated replicate replicates", "sample samples sampled", "median medians", "average averages mean means", "delay delays latency", "temperature temperatures", "voltage voltages", "sensor sensors", "queue queues", "battery batteries", "lamp lamps", "no none not never", "always every all invariably", "sometimes occasionally some may might could", "initial beginning start", "final ending end"]) {
    const words = group.split(" ");
    for (const word of words) ALIASES.set(word, words[0]);
  }
  function tokens(text) {
    const words = text.toLowerCase().normalize("NFKC").match(/[\p{L}]+|\d+(?:\.\d+)?/gu) || [];
    return words.filter(w => !STOP.has(w)).map(w => ALIASES.get(w) || w);
  }
  function passages(text) {
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    const spans = [];
    for (let i = 0; i < lines.length;) {
      if (!lines[i].trim()) { i++; continue; }
      const start = i;
      while (i < lines.length && lines[i].trim()) i++;
      const length = i - start;
      for (let j = start; j < i; j += 2) {
        const end = Math.min(i, j + 3);
        spans.push({start: j + 1, end, text: lines.slice(j, end).join("\n")});
        if (end === i || length <= 3) break;
      }
    }
    return spans;
  }
  function quantities(text) {
    const regex = /(?<![\w.])([+−-]?(?:\d+(?:\.\d+)?|\.\d+))\s*((?:milliseconds?|seconds?|minutes?|hours?|volts?|watts?|degrees?|ms|s|v|w)\b|%)/gi;
    const units = {ms: ["s", .001], millisecond:["s",.001], s:["s",1], second:["s",1], minute:["s",60], hour:["s",3600], volt:["v",1], v:["v",1], watt:["w",1], w:["w",1], degree:["degree",1], "%":["%",1]};
    return Array.from(text.matchAll(regex), hit => {
      const raw = hit[2].toLowerCase();
      const key = units[raw] ? raw : raw.replace(/s$/, "");
      const [dimension, factor] = units[key];
      return [dimension, Number(hit[1].replace("−", "-"))*factor];
    });
  }
  function conflicts(query, text, q, d) {
    const reasons = [];
    if (q.has("always") && !d.has("always")) reasons.push("The claim uses universal wording that this passage does not establish.");
    const textNeg = d.has("no"), queryNeg = q.has("no");
    if (textNeg !== queryNeg) reasons.push("The claim and passage use different negation. Check what each negation modifies.");
    if ((q.has("increase") && d.has("decrease") && !d.has("increase")) || (q.has("decrease") && d.has("increase") && !d.has("decrease")))
      reasons.push("The directions of change differ.");
    const facts = quantities(text);
    for (const [dimension, value] of quantities(query)) {
      if (!facts.some(([u,n]) => u === dimension && Math.abs(n - value) < 1e-8)) {
        reasons.push("A stated quantity or unit is missing or different in the passage."); break;
      }
    }
    if (q.has("average") && d.has("median") && !d.has("average") || q.has("median") && d.has("average") && !d.has("median"))
      reasons.push("The claim and passage name different summary statistics.");
    return reasons;
  }
  function search(source, query) {
    const docs = passages(source);
    const q = new Set(tokens(query));
    const docTerms = docs.map(doc => new Set(tokens(doc.text)));
    const weights = new Map([...q].map(term => [term, 1 + Math.log((1 + docs.length) / (1 + docTerms.filter(doc => doc.has(term)).length))]));
    const total = [...weights.values()].reduce((a,b) => a+b,0) || 1;
    const rows = docs.map((doc,i) => {
      const d = docTerms[i];
      const sentences = doc.text.split(/(?:\n+|(?<=[.!?])\s+)/).filter(Boolean);
      let anchor = doc.text;
      let anchorCoverage = -1;
      for (const sentence of sentences) {
        const terms = new Set(tokens(sentence));
        const coverage = [...q].reduce((sum,term) => sum + (terms.has(term) ? weights.get(term) : 0), 0);
        if (coverage > anchorCoverage) { anchor = sentence; anchorCoverage = coverage; }
      }
      const shared = [...q].filter(term => d.has(term));
      const covered = shared.reduce((s,t) => s + weights.get(t),0) / total;
      const score = covered * (.91 + .09 * shared.length / Math.max(d.size,1));
      return {...doc, score, covered, matches:shared, reasons:conflicts(query, anchor, q, new Set(tokens(anchor)))};
    }).sort((a,b) => b.score-a.score || a.start-b.start);
    const top = rows[0];
    // A few shared topic words can point to a passage even when the claim's
    // distinguishing concepts are missing from the entire source.
    const unseen = [...q].filter(term => !docTerms.some(terms => terms.has(term))).length;
    const noveltyMismatch = top && unseen >= 2 && unseen / q.size >= .30 && top.covered < .55;
    if (noveltyMismatch || !top || top.matches.length < 2 || top.covered < .39) return {status:"abstain", rows:[]};
    const candidates = rows.filter(r => r.matches.length >= 2 && r.covered >= .39);
    const tied = candidates.some(r => (r.end < top.start || r.start > top.end) && top.score-r.score <= .025);
    return {status:tied ? "ambiguous" : top.reasons.length ? "check" : "candidate", rows:candidates.slice(0,3)};
  }
  function baseline(source, query) {
    const raw = text => new Set(text.toLowerCase().match(/[a-z]+|\d+/g) || []);
    const q = raw(query);
    return passages(source).map(doc => {
      const terms = raw(doc.text);
      return {...doc, value:[...q].filter(w => terms.has(w)).length};
    }).sort((a,b) => b.value-a.value || a.start-b.start)[0];
  }
  const api = {passages,search,baseline};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MarginEvidence = api;
})(globalThis);
