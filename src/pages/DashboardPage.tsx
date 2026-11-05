import { Link } from "react-router-dom";
import { Users2, Megaphone, MessageSquare, Send } from "lucide-react";
import { analyticsApi } from "@/api/analytics";
import { campaignsApi } from "@/api/campaigns";
import { auditApi } from "@/api/audit";
import { useQuery } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { CampaignStatusBadge } from "@/components/ui/CampaignStatusBadge";
import { actionLabel } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { ChannelBadge } from "@/components/ui/ChannelBadge";
import { formatRelativeTime } from "@/lib/relativeTime";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dashboard/ui/tabs";
import { DistributionBar } from "@/components/dashboard/DistributionBar";
import { reportsApi } from "@/api/reports";
import { DailyChart } from "@/components/reports/DailyChart";
import { Legend } from "@/components/reports/Legend";
import { OutcomeBar } from "@/components/reports/OutcomeBar";
import { Failures } from "@/components/reports/Failures";
import { formatPct, pct } from "@/components/reports/palette";

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}

function KpiCard({ label, value, icon: Icon }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-ink-900">{value.toLocaleString()}</p>
          <p className="text-sm text-ink-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const canViewAudit = can(user?.role, "audit:read");
  const canApprove = can(user?.role, "campaigns:approve");

  const { data, loading, error, refetch } = useQuery(() => analyticsApi.dashboard(), []);
  const waiting = data?.campaigns.waitingApproval ?? 0;
  const canViewReports = can(user?.role, "reports:read");
  const { data: trend } = useQuery(
    () => (canViewReports ? reportsApi.overview(14) : Promise.resolve(null)),
    [canViewReports],
  );
  const { data: recentCampaigns, loading: campaignsLoading } = useQuery(
    () => campaignsApi.list({ limit: 5 }),
    [],
  );
  const { data: recentActivity, loading: activityLoading } = useQuery(
    () => (canViewAudit ? auditApi.list({ limit: 5 }) : Promise.resolve({ data: [], pagination: null })),
    [canViewAudit],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="A live snapshot across customers, campaigns, and delivery."
      />

      {error && (
        <Alert variant="error">
          <div className="flex items-center justify-between gap-3">
            {error}
            <button onClick={refetch} className="font-medium underline underline-offset-2">
              Try again
            </button>
          </div>
        </Alert>
      )}

      {/* Points people who can approve at the work waiting for them. */}
      {data && waiting > 0 && canApprove && (
        <Alert variant="warning">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              <strong>{waiting}</strong>{" "}
              {waiting === 1 ? "campaign is" : "campaigns are"} waiting for approval.
            </span>
            <Link to="/campaigns" className="font-medium underline underline-offset-2">
              Review campaigns
            </Link>
          </div>
        </Alert>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-19" />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total customers" value={data.customers.total} icon={Users2} />
            <KpiCard label="Campaigns" value={data.campaigns.total} icon={Megaphone} />
            <KpiCard label="Messages sent" value={data.messages.sent} icon={Send} />
            <KpiCard label="Delivered" value={data.messages.delivered} icon={MessageSquare} />
          </div>

          {trend && trend.channels.total.messages > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Messages per day</CardTitle>
                  <CardDescription>
                    Last 14 days · {formatPct(pct(trend.channels.total.delivered, trend.channels.total.messages - trend.channels.total.waiting))} delivered
                    {trend.channels.email.messages > 0 &&
                      ` · ${formatPct(pct(trend.channels.email.opened, trend.channels.email.messages))} of emails opened`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Legend />
                  <DailyChart days={trend.daily} />
                </CardContent>
              </Card>
              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>By channel</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {(["sms", "email"] as const).map((channel) =>
                      trend.channels[channel].messages > 0 ? (
                        <div key={channel}>
                          <div className="mb-1.5 flex items-center justify-between text-sm">
                            <ChannelBadge channel={channel} className="font-medium" />
                            <span className="tabular-nums text-ink-500">{trend.channels[channel].messages.toLocaleString()}</span>
                          </div>
                          <OutcomeBar stats={trend.channels[channel]} />
                        </div>
                      ) : null,
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Why messages failed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Failures failures={trend.failures.slice(0, 3)} />
                  </CardContent>
                </Card>
                <Link to="/reports" className="text-sm font-medium text-brand-600 hover:underline">
                  Download a report →
                </Link>
              </div>
            </div>
          )}

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="delivery">Delivery</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Customer status</CardTitle>
                  <CardDescription>{data.customers.total.toLocaleString()} customers total</CardDescription>
                </CardHeader>
                <CardContent>
                  <DistributionBar
                    segments={[
                      { label: "Active", value: data.customers.active, tone: "green" },
                      { label: "Inactive", value: data.customers.inactive, tone: "gray" },
                      { label: "Opted out", value: data.customers.optedOut, tone: "amber" },
                      { label: "Unsubscribed", value: data.customers.unsubscribed, tone: "red" },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Campaign pipeline</CardTitle>
                  <CardDescription>{data.campaigns.total.toLocaleString()} campaigns total</CardDescription>
                </CardHeader>
                <CardContent>
                  <DistributionBar
                    segments={[
                      { label: "Draft", value: data.campaigns.draft, tone: "gray" },
                      { label: "Waiting approval", value: waiting, tone: "amber" },
                      { label: "Approved", value: Math.max(data.campaigns.confirmed - waiting, 0), tone: "green" },
                      { label: "Dispatched", value: data.campaigns.dispatched, tone: "purple" },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="delivery" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Message status</CardTitle>
                  <CardDescription>{data.messages.total.toLocaleString()} messages total</CardDescription>
                </CardHeader>
                <CardContent>
                  <DistributionBar
                    segments={[
                      { label: "Pending", value: data.messages.pending, tone: "amber" },
                      { label: "Sent", value: data.messages.sent, tone: "purple" },
                      { label: "Delivered", value: data.messages.delivered, tone: "green" },
                      { label: "Failed", value: data.messages.failed, tone: "red" },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Imports &amp; schedules</CardTitle>
                  <CardDescription>Bulk imports and queued sends</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xl font-semibold tabular-nums text-ink-900">
                      {data.imports.applied}/{data.imports.total}
                    </p>
                    <p className="text-sm text-ink-500">Imports applied</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold tabular-nums text-ink-900">
                      {data.schedules.pending}/{data.schedules.total}
                    </p>
                    <p className="text-sm text-ink-500">Schedules pending</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent campaigns</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 p-2">
            {campaignsLoading && (
              <div className="flex flex-col gap-2 p-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            )}
            {!campaignsLoading && (!recentCampaigns || recentCampaigns.length === 0) && (
              <EmptyState title="No campaigns yet" description="Create your first campaign to see it here." />
            )}
            {recentCampaigns?.map((campaign) => (
              <Link
                key={campaign.id}
                to={`/campaigns/${campaign.id}`}
                className="flex items-center justify-between gap-3 rounded-lg p-3 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink-900">{campaign.name}</span>
                  <ChannelBadge channel={campaign.channel} className="text-xs text-ink-500" />
                </span>
                <CampaignStatusBadge campaign={campaign} />
              </Link>
            ))}
          </CardContent>
        </Card>

        {canViewAudit && (
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 p-2">
              {activityLoading && (
                <div className="flex flex-col gap-2 p-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              )}
              {!activityLoading && (!recentActivity || recentActivity.length === 0) && (
                <EmptyState title="No activity yet" description="Actions taken across the system will show up here." />
              )}
              {recentActivity?.map((event) => (
                <div key={event.id} className="flex items-center gap-3 rounded-lg p-3">
                  <Avatar label={event.actorLabel} size="sm" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block truncate font-medium text-ink-900">{actionLabel(event.action)}</span>
                    <span className="block truncate text-xs text-ink-500">{event.actorLabel || "Unknown"}</span>
                  </span>
                  <span className="shrink-0 text-xs text-ink-400">{formatRelativeTime(event.occurredAt)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
