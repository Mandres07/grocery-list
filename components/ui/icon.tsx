import type { SVGProps } from "react";

export type IconName = "basket" | "home" | "leaf" | "bottle" | "jar" | "check" | "arrow";

const paths: Record<IconName, React.ReactNode> = {
  basket: <><path d="m8 9 4-6 4 6M3 9h18l-2 11H5L3 9ZM9 13v3m6-3v3" /></>,
  home: <><path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8" /></>,
  leaf: <><path d="M20 4C8 2 2 9 6 16s16 3 14-12ZM5 20 16 9M11 14v-4m0 4h5" /></>,
  bottle: <><path d="M9 3h6v5l3 4v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-8l3-4V3ZM9 6h6M6 14h12" /></>,
  jar: <><path d="M7 3h10v4H7zM8 7l-2 3v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10l-2-3M6 12h12M6 17h12" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
