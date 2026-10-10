import { layoutPageJoins, quoteListRunOns, pageBreakContinuations, pipeline, type BodyPass, shiftedPages, quoteRunOn, visionStructure, parenFolios, foliosInStep, hyphenFragments, divisionLabels } from "@rtm/ingest";

/**
 * The Committee sets each Issue/Finding/Recommendation label on its own
 * line, with no blank line and no indent to mark it as a break — identical
 * to an ordinary continuation line. Nothing downstream can tell "Recommend-
 * ations" apart from the tail of the sentence above it or the head of the
 * paragraph below, so it silently welds onto whichever paragraph happens to
 * be open when the parser reaches it (reportsthatmatter-9zk). A blank line
 * is the one signal the parser already treats as a hard paragraph break, so
 * inserting one on each side turns the label back into what it printed as:
 * a heading standing alone.
 */
const DIVISION_LABEL = /^(Recommendations?|Findings?|Issue(\s+([0-9]{1,2}|[IVXLC]{1,4}))?)$/;

const isolateDivisionLabels: BodyPass = {
  name: "isolateDivisionLabels",
  stage: "body",
  run(lines) {
    const out: string[] = [];
    for (const line of lines) {
      if (DIVISION_LABEL.test(line.trim())) {
        if (out.length && out[out.length - 1].trim()) out.push("");
        out.push(line);
        out.push("");
      } else {
        out.push(line);
      }
    }
    return out;
  },
};

/**
 * Section headings mis-extracted from captions and OCR garble
 * (reportsthatmatter-c1y).
 *
 * The report's own contents (p. iii) lists only its ten top-level chapters —
 * "V. THE ACCIDENT", "VII. CASING JOINT DESIGN" — and not one of its many
 * subsections, unlike the PSI report's fully granular listing, so
 * `listedHeadings()` cannot recover this report's structure: tested here, it
 * drops from 221 headings to 12, taking real chapters ("SOLID ROCKET
 * MOTORS", "EXTERNAL TANK", "TECHNICAL ISSUES") with it. And the contents
 * text itself is too OCR-mangled to fix that — several top-level entries run
 * together on one line with no leaders at all ("11. CONCLUSIONS 111.
 * C~MPILATION OF ISSUES..."), so there is no clean list to extract even for
 * the chapters it does name.
 *
 * These exact lines are captions, table titles, a flowchart's box labels
 * (the "MORTON THIOKOL" repeats), and OCR noise that happen to stand alone
 * on their own line, checked against the surrounding text: none of them is
 * this report's own structure, and none reads as prose either — a bare
 * "FIGURE" or "OK.134" is furniture belonging to an image or a running head
 * that OCR left behind, the same kind of thing `runningFurniture` already
 * drops elsewhere. Welding one onto whichever paragraph happened to be
 * nearby only produced a second, uglier fake heading when that neighbour was
 * itself another caption (the SRM flowchart's labels sit one after another
 * with no real prose between them), so these are dropped outright, like
 * furniture, not merged.
 */
const FAKE_HEADINGS = new Set(
  [
    "FIGURE",
    "SEGMENT",
    "MORTON THIOKOL",
    "ROHR INDUSTRIES",
    "PARKER SEAL COMPANY",
    "LEFT'SOLID ROCKET BOOSTER I",
    "STATISTICS FOR EACH BOOSTER FRUSTRUM",
    "I/ FORWARO SEGMENT PROPELLANT",
    ". SRM AFT CENTER",
    "WEIGHT",
    "AFT SKIRT",
    "FORWARO",
    "CENTER",
    "SOLID ROCKET MOTOR PRINCIPAL STEPS I N THE EVOLUTION, FLIGHT AND RECONDITIONING OF SOLID ROCKET MOTORS",
    "PROGRAH DIRECTION BY",
    "1 DEFINE PROGRAM REQUIREMENTS AND VERIFY",
    "CONTRACTOR DESIGN DESIGN THE MOTOR TO MEET ALL PERFORMANC REQUIREMENTS DURING ALL ANTICIPATED",
    "PROCURE MATERIALS AND COMPONENTS, PRODU AND ASSEMBLE AN OPERATIONAL MOTOR IN",
    "ROHR INDUSTRIES PARKER SEAL COMPANY",
    "REVIEW AND DECISION ON LAUNCH, IGNITE",
    "REFURBISHMENT RESTORE COMPONENTS IN ACCORDANCE WITH",
    "TABLE I.-FLIGHT READINESS REVIEWS",
    "OPELLANT INSULAT -< TPPER STEEL ASING STEEL",
    "A, JOINT I M MORYAL ALIGNMENT (NO GAPS BETYEEN O-RINGS AND TAME) TANG P PRESSURE POINT LOCKING",
    "B . JO I NT POTATED (OUT OF ALIGNFENTI -\\7 PROPELLPNT PRESSUPE",
    "ROCKETMOTORS",
    "LOCKHEED SHUTTLE PROCESSING CONTRACT-AWARD FEE HISTORY",
    "GENERIC TEMPLATE (CIR 7.7 MO)",
    "ORGANIZATION A N D POLICY MANAGEMENT",
    ". PRIMARY EEATED",
    "UPSTREAM WRONG) POSITION",
    "DOWNSTREAM SECONDARY",
    "DOWNSTREAM (PROPER) POSIT ION )I; FIGUREVII-1",
    "-SPAC I NG",
    "W I L L NOT",
    "1 SEAL",
    "TABLE I1 PRINCIPAL PARTICIPANTS IN THE TELECONFERENCE",
    "OK.134",
    // A chronology entry, not a heading: "November 19, 1973.-In its report to
    // NASA Administrator James" / "Fletcher, the Solid Rocket Motor Source
    // Evaluation Board (SEB)" / "evaluated the proposals..." is one sentence
    // split at the line wrap (reportsthatmatter-c1y).
    "Fletcher, the Solid Rocket Motor Source Evaluation Board (SEB)",
    // Appendix material (reportsthatmatter-c1y): a letterhead and stray OCR
    // noise picked out of reprinted exhibits.
    "TXIOKOL CHEMICAL CORPORATION",
    "C. Bunhr 20 I",
    "I INCHEU J",
  ].map((text) => text.replace(/\s+/g, " ").trim())
);

const dropCaptionHeadings: BodyPass = {
  name: "dropCaptionHeadings",
  stage: "body",
  run(lines) {
    const out: string[] = [];
    for (const line of lines) {
      const collapsed = line.replace(/\s+/g, " ").trim();
      // Strip a leading list/speaker marker ("2.", "D.", "1.") the same way
      // a numbered heading's own marker is read, so a caption is matched
      // whether or not one happens to be glued in front of it.
      const bare = collapsed.replace(/^(?:\([a-z0-9]{1,3}\)|[A-Za-z0-9]{1,3}\.)\s+/, "");
      if (FAKE_HEADINGS.has(collapsed) || FAKE_HEADINGS.has(bare)) continue;
      // A caption's removal can leave two blank lines where one stood on
      // each side of it; collapse the pair back to the single break a real
      // paragraph gap always is.
      if (!line.trim() && out.length && !out[out.length - 1].trim()) continue;
      out.push(line);
    }
    return out;
  },
};

/**
 * The GPO's signature mark. Every sixteenth page of the print run carries the
 * printing order at its foot — "64-420 0 - 86 - 5", with the signature number
 * last, OCR'd as "1 1" or "I?" in places. It is neither text nor a page
 * number, so nothing else removes it, and left in it ended a paragraph with
 * the order number or opened the continuation that followed it
 * ("64-420 0 - 86 - 9 ria relative to temperatures"). Eight in the whole
 * report, and the shape (reportsthatmatter-nen) occurs nowhere in the prose.
 */
const GPO_SIGNATURE = /^\s*64-420\s+0\s*-\s*86\s*-\s*(?:\d+(?:\s\d)?|I\?)\s*$/;

const dropGpoSignatures: BodyPass = {
  name: "dropGpoSignatures",
  stage: "body",
  run: (lines) => lines.filter((line) => !GPO_SIGNATURE.test(line)),
};

/**
 * How this report is built. Owned by the report: every decision that shaped
 * its text is named here, and the passes it composes are library code, so a
 * fix to a shared pass reaches every report that calls it.
 */
export default pipeline({
  id: "challenger-accident",
  title: "Investigation of the Challenger Accident",
  authors: "Committee on Science and Technology, U.S. House of Representatives",
  published_at: "October 1986",
  source_url: "https://www.govinfo.gov/app/details/GPO-CRPT-99hrpt1016",
  repo: ".",
  // Order is semantic: footnote numbering and page indices run continuously
  // across volumes, so reordering changes the output.
  volumes: [
    { path: "archive/GPO-CRPT-99hrpt1016-challenger-accident-1986.pdf", sha256: "eb04493120feaf98e1944634260a2ab8b81339308a2c665a9414853652a8560e" },
  ],
  passes: [
    // A paragraph run over a page break that opens on a capital, a digit or a
    // quotation mark (or follows a full stop on a justified page) joins when the
    // layout says it runs on: no first-line indent, same face (reportsthatmatter-38s.10).
    // A scan: its OCR layer sizes consecutive lines a point apart.
    layoutPageJoins({ scanned: true }),
    quoteListRunOns(), isolateDivisionLabels, dropCaptionHeadings, dropGpoSignatures, pageBreakContinuations(), shiftedPages(), quoteRunOn(),
    // Folios: "(3)" at the foot of the Conclusions and chapter openers is the page's number, and the OCR'd
    // figure and test-report pages of the appendices read digits of their garble as a folio ("2", "0", "77"):
    // those out of step with the pages round them are dropped, and the pages numbered from their neighbours
    // (reportsthatmatter-uw50).
    // Words broken at a line end that the document writes whole nowhere ("investiga- tions"): closed when the head is no word (reportsthatmatter-pt6).
    hyphenFragments(),
    // A lone "Findings" or "Issue" line is a division label, a heading (reportsthatmatter-liv).
    divisionLabels(),
    parenFolios(), foliosInStep(),
    // Block structure from a vision model's reading of the page images (granite-docling, committed in
    // reference/vision/ by reportsthatmatter-kyj3), on the pages where it agrees with this scan's own
    // text layer: at least 80% of a page's blocks verified word for word (lenient setting), no notes or
    // section headings lost. The words stay the text layer's; every other page keeps the pipeline's
    // reading (reportsthatmatter-jsqw).
    visionStructure({
      dir: import.meta.dirname,
      pack: { path: "reference/vision/doctags.jsonl.gz", sha256: "055e487376badb44899054f5507e64ba58eb51caf3e12f11b57fafa721a4aa61" },
    }),
  ],
});
