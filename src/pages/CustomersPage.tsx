import { useState } from "react";
import { Plus, Pencil, Archive, UserCheck, UserPlus } from "lucide-react";
import { customersApi } from "@/api/customers";
import type { CustomerListParams } from "@/api/customers";
import type { Customer, CustomerStatus, SmsEligibility } from "@/types/entities";
import { useListPage } from "@/hooks/useListPage";
import { useMutation } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Select } from "@/components/ui/Select";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TablePagination } from "@/components/tables/TablePagination";
import { CustomerFormModal } from "@/pages/customers/CustomerFormModal";
import { customerStatusTone, smsEligibilityTone } from "@/lib/statusTones";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/permissions";

/** Whether a customer can be reached on a channel right now (active, and for SMS not opted out). */
function ReachPill({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      title={on ? `Can receive ${label}` : `Cannot receive ${label}`}
      className={
        on
          ? "rounded-md bg-status-green-bg px-1.5 py-0.5 text-xs font-medium text-status-green-text"
          : "rounded-md bg-surface-sunken px-1.5 py-0.5 text-xs text-ink-400 line-through"
      }
    >
      {label}
    </span>
  );
}

export function CustomersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canWrite = can(user?.role, "customers:write");

  const [status, setStatus] = useState<CustomerStatus | "">("");
  const [smsEligibility, setSmsEligibility] = useState<SmsEligibility | "">("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [archiving, setArchiving] = useState<Customer | null>(null);

  const { rows, pagination, loading, error, refetch, setPage, search, onSearchChange } = useListPage<
    Customer,
    Omit<CustomerListParams, "page" | "limit" | "search">
  >({
    fetcher: customersApi.list,
    filters: { status: status || undefined, smsEligibility: smsEligibility || undefined },
  });

  const [archive, archiveState] = useMutation((id: string) => customersApi.archive(id));

  async function handleArchive() {
    if (!archiving) return;
    await archive(archiving.id);
    toast.success(`${archiving.name} was archived and marked opted out of SMS.`);
    setArchiving(null);
    refetch();
  }

  const [activate, activateState] = useMutation((id: string) => customersApi.activate(id));

  async function handleActivate(customer: Customer) {
    await activate(customer.id);
    toast.success(`${customer.name} is active again. Update SMS eligibility if they should receive messages.`);
    refetch();
  }

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <span className="flex items-center gap-3">
          <Avatar label={row.name} size="sm" />
          <span className="max-w-44 truncate font-medium text-ink-900">{row.name}</span>
        </span>
      ),
    },
    { key: "phone", header: "Phone", render: (row) => row.phone },
    { key: "email", header: "Email", render: (row) => <span className="block max-w-52 truncate">{row.email || "-"}</span> },
    {
      key: "reach",
      header: "Can receive",
      render: (row) => (
        <span className="flex items-center gap-1.5">
          <ReachPill label="SMS" on={row.canReceiveSms} />
          <ReachPill label="Email" on={row.canReceiveEmail} />
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} toneMap={customerStatusTone} />,
    },
    {
      key: "eligibility",
      header: "SMS eligibility",
      render: (row) => <StatusBadge status={row.smsEligibility} toneMap={smsEligibilityTone} />,
    },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: "",
            headerClassName: "w-14",
            className: "text-right",
            render: (row: Customer) => (
              <div className="flex justify-end">
                <ActionMenu
                  label={`Actions for ${row.name}`}
                  items={[
                    {
                      label: "Edit",
                      icon: <Pencil className="size-4" aria-hidden="true" />,
                      onClick: () => {
                        setEditing(row);
                        setFormOpen(true);
                      },
                    },
                    {
                      label: "Activate",
                      icon: <UserCheck className="size-4" aria-hidden="true" />,
                      onClick: () => void handleActivate(row),
                      disabled: row.status !== "inactive",
                      loading: activateState.loading,
                    },
                    {
                      label: "Archive",
                      icon: <Archive className="size-4" aria-hidden="true" />,
                      onClick: () => setArchiving(row),
                      danger: true,
                      disabled: row.status !== "active",
                    },
                  ]}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Customers"
        description="Everyone you can reach by SMS or email."
        action={
          canWrite && (
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="size-4" />
              New customer
            </Button>
          )
        }
      />

      <Card>
        <TableToolbar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder="Search by name or phone…"
          filters={
            <>
              <div className="w-40">
                <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as CustomerStatus | "")}>
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>
              <div className="w-48">
                <Select
                  aria-label="Filter by SMS eligibility"
                  value={smsEligibility}
                  onChange={(e) => setSmsEligibility(e.target.value as SmsEligibility | "")}
                >
                  <option value="">All eligibility</option>
                  <option value="eligible">Eligible</option>
                  <option value="opted_out">Opted out</option>
                  <option value="unsubscribed">Unsubscribed</option>
                </Select>
              </div>
            </>
          }
        />
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          loading={loading}
          error={error}
          onRetry={refetch}
          emptyTitle="No customers found"
          emptyDescription="Add your first customer, or import a CSV list to get started."
          emptyAction={
            canWrite && (
              <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
                <UserPlus className="size-4" />
                Add customer
              </Button>
            )
          }
        />
        <TablePagination pagination={pagination} onPageChange={setPage} />
      </Card>

      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        customer={editing}
        onSaved={(isEdit) => {
          setFormOpen(false);
          toast.success(isEdit ? "Customer updated." : "Customer created.");
          refetch();
        }}
      />

      <ConfirmDialog
        open={Boolean(archiving)}
        onClose={() => setArchiving(null)}
        onConfirm={handleArchive}
        loading={archiveState.loading}
        tone="danger"
        title="Archive this customer?"
        description={`${archiving?.name ?? "This customer"} will be marked inactive, excluded from future campaigns, and opted out of SMS. You can reactivate them later from this page.`}
        confirmLabel="Archive customer"
      />
    </div>
  );
}
