/**
 * The HimaVolt lockup, themed.
 *
 * Two prepared assets rather than a CSS filter. The previous approach applied
 * `dark:brightness-0 dark:invert` to an OPAQUE logo, which blackens every pixel
 * and flips the whole rectangle to a solid white box in dark mode. That bug had
 * already been copy-pasted into two headers, hence this one component.
 *
 * - light: the full-colour lockup
 * - dark:  the one-colour lockup with its brown backing plate removed, so the
 *          artwork sits on the navbar instead of looking like a sticker
 *
 * Both assets are trimmed so the artwork fills the full canvas height and they
 * share an aspect ratio (4.73 / 4.71). That is what keeps the two themes the
 * same visual size — an earlier build cropped the dark one to its backing
 * plate, leaving the artwork inset and rendering it 19% smaller than light at
 * the same CSS height.
 */
export default function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/logo-mark.png"
        alt="HimaVolt"
        width={607}
        height={128}
        className={`${className} dark:hidden`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/logo-mark-dark.png"
        alt="HimaVolt"
        width={594}
        height={128}
        className={`hidden ${className} dark:block`}
      />
    </>
  );
}
