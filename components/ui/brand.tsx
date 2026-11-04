import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import { Icon } from "./icon";

export function Brand() {
  return <Link href="/" aria-label={`${APP_NAME}, inicio`} className="brand-link">
    <span className="brand-mark"><Icon name="basket" className="brand-icon" /></span>
    <span>{APP_NAME}</span>
  </Link>;
}
