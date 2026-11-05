import { Badge } from "@/components/ui/Badge";
import { campaignStatusTone } from "@/lib/statusTones";
import type { Campaign } from "@/types/entities";

/** The wording for a campaign's status: a confirmed campaign is "Waiting approval" until it has enough approvals. */
export function campaignStatusLabel(campaign: Pick<Campaign, "status" | "approvalState">): string {
  if (campaign.status === "confirmed") {
    if (campaign.approvalState === "waiting") return "Waiting approval";
    if (campaign.approvalState === "approved") return "Approved";
    return "Confirmed";
  }
  return campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1);
}

/** Status badge for a campaign, used on every screen so they all say the same thing. */
export function CampaignStatusBadge({ campaign }: { campaign: Pick<Campaign, "status" | "approvalState"> }) {
  let tone = campaignStatusTone[campaign.status];
  if (campaign.status === "confirmed") {
    if (campaign.approvalState === "waiting") tone = "amber";
    else if (campaign.approvalState === "approved") tone = "green";
  }
  return <Badge tone={tone}>{campaignStatusLabel(campaign)}</Badge>;
}
