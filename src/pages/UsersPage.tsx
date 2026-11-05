import { useEffect, useState, type FormEvent } from "react";
import { Mail, Plus, UserX } from "lucide-react";
import { usersApi } from "@/api/users";
import type { AppUser, Role } from "@/types/entities";
import { useListPage } from "@/hooks/useListPage";
import { useMutation } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { TablePagination } from "@/components/tables/TablePagination";
import { userStatusTone } from "@/lib/statusTones";

const ROLES: Role[] = ["admin", "manager", "communicator", "viewer"];

function roleName(role: Role): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function UsersPage() {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<AppUser | null>(null);
  const { rows, pagination, loading, error, refetch, setPage, search, onSearchChange } = useListPage<AppUser>({
    fetcher: usersApi.list,
  });

  const [updateRole, updateRoleState] = useMutation((id: string, role: Role) => usersApi.updateRole(id, role));
  const [resendInvite, resendState] = useMutation((id: string) => usersApi.resendInvite(id));
  const [deactivate, deactivateState] = useMutation((id: string) => usersApi.deactivate(id));

  async function handleRoleChange(user: AppUser, role: Role) {
    await updateRole(user.id, role);
    toast.success(`${user.email || user.phone}'s role is now ${role}.`);
    refetch();
  }

  async function handleResendInvite(user: AppUser) {
    await resendInvite(user.id);
    toast.success(`Invitation sent to ${user.email}.`);
  }

  async function handleDeactivate() {
    if (!deactivating) return;
    await deactivate(deactivating.id);
    toast.success(`${deactivating.email || deactivating.phone} was deactivated.`);
    setDeactivating(null);
    refetch();
  }

  const columns: Column<AppUser>[] = [
    {
      key: "email",
      header: "User",
      render: (row) => (
        <span className="flex items-center gap-3">
          <Avatar label={row.email || row.phone} size="sm" />
          <span className="max-w-64 truncate font-medium text-ink-900">
            {row.email || "-"}
            {row.id === currentUser?.userId && <span className="ml-2 text-xs font-normal text-ink-400">(you)</span>}
          </span>
        </span>
      ),
    },
    { key: "phone", header: "Phone", render: (row) => row.phone || "-" },
    {
      key: "role",
      header: "Role",
      headerClassName: "w-52",
      render: (row) => (
        <Select
          aria-label={`Change role for ${row.email || row.phone}`}
          value={row.role}
          onChange={(e) => void handleRoleChange(row, e.target.value as Role)}
          disabled={updateRoleState.loading || row.status !== "active" || row.id === currentUser?.userId}
          title={row.id === currentUser?.userId ? "You can't change your own role" : undefined}
          className="w-44"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {roleName(r)}
            </option>
          ))}
        </Select>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} toneMap={userStatusTone} /> },
    {
      key: "actions",
      header: "",
      headerClassName: "w-24",
      className: "text-right",
      render: (row) =>
        row.status === "active" && (
          <div className="flex justify-end gap-1">
            {row.email && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Resend invite to ${row.email}`}
                title="Resend invite email"
                disabled={resendState.loading}
                onClick={() => void handleResendInvite(row)}
              >
                <Mail className="size-4" aria-hidden="true" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Deactivate ${row.email || row.phone}`}
              onClick={() => setDeactivating(row)}
            >
              <UserX className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Team members who can access this system, with OTP-only login."
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            New user
          </Button>
        }
      />

      <Card>
        <TableToolbar search={search} onSearchChange={onSearchChange} searchPlaceholder="Search users…" />
        <DataTable columns={columns} data={rows} rowKey={(row) => row.id} loading={loading} error={error} onRetry={refetch} />
        <TablePagination pagination={pagination} onPageChange={setPage} />
      </Card>

      <UserFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(created) => {
          setFormOpen(false);
          if (created.inviteSent) {
            toast.success(`User created. An invitation was emailed to ${created.email}.`);
          } else if (created.email) {
            toast.error("User created, but the invitation email couldn't be sent. Use the envelope button to resend it.");
          } else {
            toast.success("User created. With no email on file, no invitation was sent - they can sign in with a one-time code by phone.");
          }
          refetch();
        }}
      />

      <ConfirmDialog
        open={Boolean(deactivating)}
        onClose={() => setDeactivating(null)}
        onConfirm={handleDeactivate}
        loading={deactivateState.loading}
        tone="danger"
        title="Deactivate this user?"
        description={`${deactivating?.email || deactivating?.phone || "This user"} will immediately lose access and won't be able to request new login codes.`}
        confirmLabel="Deactivate user"
      />
    </div>
  );
}

function UserFormModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (created: AppUser & { inviteSent: boolean }) => void;
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("viewer");

  useEffect(() => {
    if (open) {
      setEmail("");
      setPhone("");
      setRole("viewer");
    }
  }, [open]);

  const [save, saveState] = useMutation(() => usersApi.create({ email, phone, role }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const created = await save();
    onSaved(created);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New user"
      description="Login is OTP-only. If you add an email, the user is sent an invitation to sign in."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="user-form" type="submit" loading={saveState.loading}>
            Create user
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {saveState.error && <Alert variant="error">{saveState.error}</Alert>}
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          hint="At least one of email or phone is required."
          autoFocus
        />
        <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" />
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)} required>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {roleName(r)}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}
