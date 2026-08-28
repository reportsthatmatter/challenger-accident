# Investigation of the Challenger Accident

Report of the Committee on Science and Technology, U.S. House of
Representatives, 99th Congress, 2nd Session — H. Rept. 99-1016, October 1986.

The congressional investigation into the loss of the Space Shuttle Challenger
on 28 January 1986, conducted alongside the Presidential (Rogers) Commission.

## Materials

`archive/GPO-CRPT-99hrpt1016-challenger-accident-1986.pdf` — from
https://www.govinfo.gov/content/pkg/GPO-CRPT-99hrpt1016/pdf/GPO-CRPT-99hrpt1016.pdf

The NASA scan of the Rogers Commission report (NTRS 19860015255) was also
checked and rejected: its OCR is poor ("Presidential Conimissiun", "Sfiace
Shuttle", letter-spaced words throughout). The GPO text layer is clean.

## License

Work of the United States federal government — public domain.

## Rebuilding the text

`full.md` is generated, never hand-edited. `ingest.ts` is the whole recipe —
which PDFs, in what order, with what metadata, and which pipeline passes.

```bash
pnpm install
pnpm exec tsx ../reportsthatmatter/scripts/ingest/cli.ts run challenger-accident
```

Corrections to the text go in `corrections.yaml`, never into `full.md`. Each
must match exactly once or the build fails naming it. `baseline.json` is the
regression digest: if a pipeline change moves this report's output, it fails
until the baseline moves with it after the diff has been read.

The pipeline itself is [`@rtm/ingest`](https://github.com/reportsthatmatter/ingest),
pinned in `package.json` — improvements are adopted here deliberately, with a
diff, rather than arriving unannounced.
