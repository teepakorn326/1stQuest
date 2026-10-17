// Line icons from the Wish Circle design (24px grid, 1.8 stroke).
type P = { size?: number; className?: string };
const base = (size = 24) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const BookIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z" /><path d="M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" /></svg>
);
export const HomeIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" /></svg>
);
export const HeartIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" /></svg>
);
export const PeopleIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 19c0-3 3-5 6-5s6 2 6 5" /><path d="M15 14.5c3 0 6 1.5 6 4.5" /></svg>
);
export const InfoIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
);
export const PlusIcon = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth={2} className={className}><path d="M12 5v14M5 12h14" /></svg>
);
export const ChevronRight = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth={2} className={className}><path d="M9 5l7 7-7 7" /></svg>
);
export const ChevronLeft = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth={2} className={className}><path d="M15 5l-7 7 7 7" /></svg>
);
export const CameraIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
);
export const ChevronDown = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth={2} className={className}><path d="M6 9l6 6 6-6" /></svg>
);

const CATEGORY_PATHS: Record<string, React.ReactNode> = {
  places: (<><path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M3 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /></>),
  tastes: (<><path d="M4 11h16a8 8 0 0 1-16 0z" /><path d="M8 7c0-1 1-1 1-2M12 7c0-1 1-1 1-2M16 7c0-1 1-1 1-2" /></>),
  people: (<><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 19c0-3 3-5 6-5s6 2 6 5" /><path d="M15 14.5c3 0 6 1.5 6 4.5" /></>),
  music: (<><path d="M9 18V6l11-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>),
  nature: (<><path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" /><path d="M5 19l8-8" /></>),
  legacy: (<><path d="M6 4h11a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2z" /><path d="M6 18a2 2 0 0 1 2-2h11" /></>),
};

export const CategoryIcon = ({ category, size, className }: P & { category: string }) => (
  <svg {...base(size)} className={className}>{CATEGORY_PATHS[category] ?? CATEGORY_PATHS.places}</svg>
);

export const CloseIcon = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth={2} className={className}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const ChatIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 5h16v11H9l-5 4z" /></svg>
);
export const EyeIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const LockIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
export const MicIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
);
export const SendIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 12l16-8-6 16-2-7z" /></svg>
);
export const CheckIcon = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth={2.2} className={className}><path d="M5 12l5 5 9-10" /></svg>
);
export const AlertIcon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></svg>
);
