import type { SVGProps } from "react";
import basket from "@/styles/basket.json";

export type IconName = "menu-toggle" | "edit" | "trash" | "history" | "folder" | "user" | "users" | "lock" | "filter" | "plus" | "basket" | "home" | "leaf" | "bottle" | "jar" | "check" | "arrow" | "menu" | "close";

const paths: Record<IconName, React.ReactNode> = {
  edit: <><path d="m14 5 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14v6ZM12 20h8" /></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" /></>,
  history: <><path d="M3 11a9 9 0 1 1 3 8M3 4v7h7M12 7v5l3 2" /></>,
  folder: <path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v2" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  filter: <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  "menu-toggle": <><path d="M4 12h16" className="morph-line-first" /><path d="M4 12h16" className="morph-line-middle" /><path d="M4 12h16" className="morph-line-last" /></>,
  basket: <path d={basket.path} />,
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
