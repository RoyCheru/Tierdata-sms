import { NAV_ITEMS } from "@/components/layout/nav";

export function resolvePageTitle(pathname: string): string {
  const exact = NAV_ITEMS.find((item) => (item.end ? item.to === pathname : pathname === item.to));
  if (exact) return exact.label;

  const prefixMatch = NAV_ITEMS.filter((item) => item.to !== "/" && pathname.startsWith(item.to)).sort(
    (a, b) => b.to.length - a.to.length,
  )[0];

  return prefixMatch?.label ?? "TierData SMS";
}
