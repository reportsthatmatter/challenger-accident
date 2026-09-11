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
  passes: [isolateDivisionLabels],
});
