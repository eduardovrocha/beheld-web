/**
 * LensMark — the small circular lens used as the landing v5's monogram.
 *
 * Distinct from `LensLogo` (the wider horizontal mark with brackets used
 * in SiteHeader and MeetB3). LensMark is just an outline circle + filled
 * pupil, rendered at small sizes (12–22px) inline with text.
 *
 * Props:
 *   - size:    pixel size (square). Default 22.
 *   - alive:   when true, the pupil pulses (livepulse keyframes, see
 *              index.css). Used in the hero's MachinesPill to signal
 *              "this number is observed live".
 *
 * Colors:
 *   - The ring borrows `--accent` via stroke.
 *   - The pupil fills with `--accent`. When `alive`, it alternates
 *     between `--accent` and `--term-prompt` via the livepulse keyframe.
 */
export function LensMark({
  size = 22,
  alive = false,
}: {
  size?: number;
  alive?: boolean;
}) {
  return (
    <svg
      className="lens-mark"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <circle
        cx={12}
        cy={12}
        r={9}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.4}
      />
      <circle
        className={alive ? "lens-mark-pupil lens-mark-pupil--alive" : "lens-mark-pupil"}
        cx={12}
        cy={12}
        r={3.2}
        fill="var(--accent)"
      />
    </svg>
  );
}
