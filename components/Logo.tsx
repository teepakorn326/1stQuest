/** The 1stQuest logo: a rising sun with a "1" on a green horizon (redrawn as SVG from the brand image). */
export function LogoMark({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={Math.round((size * 770) / 1040)}
      viewBox="200 40 1040 770"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="1stQuest"
      className={className}
    >
      <g stroke="#FFB547" strokeWidth="56">
        <path d="M720 78v98M320 256l64 64M1120 256l-64 64" />
      </g>
      <path d="M320 736a400 400 0 0 1 800 0z" fill="#FFB547" />
      <path d="M672 488l64-48v240" stroke="#2C2B38" strokeWidth="64" />
      <path d="M240 760h960" stroke="#5FC998" strokeWidth="48" />
    </svg>
  );
}
