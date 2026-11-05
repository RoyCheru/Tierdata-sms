import type { Campaign } from "@/types/entities";

/**
 * What to show for who a campaign goes to. For a group audience that is the
 * group's name; `groupName` is undefined while it is still loading. A group
 * campaign whose group no longer exists (deleting a group clears the link)
 * says so rather than showing a blank.
 */
export function audienceLabel(campaign: Pick<Campaign, "audienceType" | "groupId">, groupName?: string): string {
  if (campaign.audienceType !== "group") return "All customers";
  if (groupName) return groupName;
  return campaign.groupId ? "Group" : "Deleted group";
}
