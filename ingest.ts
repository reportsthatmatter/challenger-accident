import { pipeline, type BodyPass } from "@rtm/ingest";

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
 * this report's own structure. Each is walked back into the paragraph before
 * it — the same printed text, no longer read as a heading — rather than
 * merged with unrelated neighbours or invented over.
 */
const FAKE_HEADINGS = new Set(
  [
    "FIGURE",
    "SEGMENT FIGURE",
    "MORTON THIOKOL FIGURE",
    "MORTON THIOKOL",
    "LEFT'SOLID ROCKET BOOSTER I",
    "STATISTICS FOR EACH BOOSTER FRUSTRUM",
    "I/ FORWARO SEGMENT PROPELLANT",
    ". SRM AFT CENTER",
    "WEIGHT",
    "AFT SKIRT",
    "FORWARO SEGMENT",
    "CENTER SEGMENT",
    "SOLID ROCKET MOTOR PRINCIPAL STEPS I N THE EVOLUTION, FLIGHT AND RECONDITIONING OF SOLID ROCKET MOTORS",
    "PROGRAH DIRECTION BY",
    "1 DEFINE PROGRAM REQUIREMENTS AND VERIFY",
    "CONTRACTOR DESIGN DESIGN THE MOTOR TO MEET ALL PERFORMANC REQUIREMENTS DURING ALL ANTICIPATED",
    "PROCURE MATERIALS AND COMPONENTS, PRODU AND ASSEMBLE AN OPERATIONAL MOTOR IN",
    "MORTON THIOKOL ROHR INDUSTRIES PARKER SEAL COMPANY",
    "REVIEW AND DECISION ON LAUNCH, IGNITE",
    "MORTON THIOKOL REFURBISHMENT RESTORE COMPONENTS IN ACCORDANCE WITH",
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
    "W I L L NOT 1 SEAL",
    "TABLE I1 PRINCIPAL PARTICIPANTS IN THE TELECONFERENCE",
    "OK.134",
    // Appendix material (reportsthatmatter-c1y): a letterhead and stray OCR
    // noise picked out of reprinted exhibits.
    "TXIOKOL CHEMICAL CORPORATION",
    "C. Bunhr 20 I",
    "I INCHEU J",
  ].map((text) => text.replace(/\s+/g, " ").trim())
);

const demoteFakeHeadings: BodyPass = {
  name: "demoteFakeHeadings",
  stage: "body",
  run(lines) {
    const out: string[] = [];
    for (const line of lines) {
      const collapsed = line.replace(/\s+/g, " ").trim();
      if (!FAKE_HEADINGS.has(collapsed)) {
        out.push(line);
        continue;
      }
      // Walk back past any blank line to the paragraph above and weld this
      // line onto its tail, so it reads as the printed text always was —
      // part of the surrounding prose — rather than standing alone.
      let last = out.length - 1;
      while (last >= 0 && !out[last].trim()) last--;
      if (last < 0) {
        out.push(line);
        continue;
      }
      out.length = last + 1;
      out[last] = `${out[last].replace(/\s+$/, "")} ${collapsed}`;
    }
    return out;
  },
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
  passes: [isolateDivisionLabels, demoteFakeHeadings],
});
