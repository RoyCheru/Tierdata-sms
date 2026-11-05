import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { groupsApi } from "@/api/groups";
import type { Group } from "@/types/entities";
import { useListPage } from "@/hooks/useListPage";
import { useToast } from "@/hooks/useToast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TablePagination } from "@/components/tables/TablePagination";
import { GroupFormModal } from "@/pages/groups/GroupFormModal";
import { GroupMembersModal } from "@/pages/groups/GroupMembersModal";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/permissions";

export function GroupsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canWrite = can(user?.role, "groups:write");

  const [formOpen, setFormOpen] = useState(false);
  const [membersGroup, setMembersGroup] = useState<Group | null>(null);

  const { rows, pagination, loading, error, refetch, setPage, search, onSearchChange } = useListPage<Group>({
    fetcher: groupsApi.list,
  });

  const columns: Column<Group>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => <span className="font-medium text-ink-900">{row.name}</span>,
      className: "max-w-56 truncate",
    },
    { key: "description", header: "Description", render: (row) => row.description || "-", className: "max-w-72 truncate" },
    {
      key: "actions",
      header: "",
      headerClassName: "w-32",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setMembersGroup(row)}>
            <Users className="size-4" aria-hidden="true" />
            Members
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Groups"
        description="Organize customers into lists you can target with campaigns."
        action={
          canWrite && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              New group
            </Button>
          )
        }
      />

      <Card>
        <TableToolbar search={search} onSearchChange={onSearchChange} searchPlaceholder="Search groups…" />
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          loading={loading}
          error={error}
          onRetry={refetch}
          emptyTitle="No groups found"
          emptyDescription="Create a group to organize customers for targeted campaigns."
          emptyAction={
            canWrite && (
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="size-4" />
                New group
              </Button>
            )
          }
        />
        <TablePagination pagination={pagination} onPageChange={setPage} />
      </Card>

      <GroupFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          toast.success("Group created.");
          refetch();
        }}
      />

      <GroupMembersModal group={membersGroup} onClose={() => setMembersGroup(null)} canWrite={canWrite} />
    </div>
  );
}
