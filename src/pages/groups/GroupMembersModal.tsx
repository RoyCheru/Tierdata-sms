import { useEffect, useState } from "react";
import { Search, Trash2, UserPlus } from "lucide-react";
import { groupsApi } from "@/api/groups";
import { customersApi } from "@/api/customers";
import type { Customer, Group, GroupMembers } from "@/types/entities";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { SpinnerBlock } from "@/components/ui/Spinner";

interface GroupMembersModalProps {
  group: Group | null;
  onClose: () => void;
  canWrite: boolean;
}

export function GroupMembersModal({ group, onClose, canWrite }: GroupMembersModalProps) {
  const [members, setMembers] = useState<GroupMembers | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [results, setResults] = useState<Customer[]>([]);
  const [busyCustomerId, setBusyCustomerId] = useState<string | null>(null);

  function loadMembers(groupId: string) {
    setLoading(true);
    setError(null);
    groupsApi
      .members(groupId)
      .then(setMembers)
      .catch(() => setError("Couldn't load members. Please try again."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (group) loadMembers(group.id);
    else {
      setMembers(null);
      setQuery("");
      setResults([]);
    }
  }, [group]);

  useEffect(() => {
    if (!group || !debouncedQuery) {
      setResults([]);
      return;
    }
    customersApi
      .list({ search: debouncedQuery, limit: 5 })
      .then(({ data }) => setResults(data))
      .catch(() => setResults([]));
  }, [group, debouncedQuery]);

  async function handleAdd(customerId: string) {
    if (!group) return;
    setBusyCustomerId(customerId);
    try {
      await groupsApi.addMember(group.id, customerId);
      setQuery("");
      setResults([]);
      loadMembers(group.id);
    } finally {
      setBusyCustomerId(null);
    }
  }

  async function handleRemove(customerId: string) {
    if (!group) return;
    setBusyCustomerId(customerId);
    try {
      await groupsApi.removeMember(group.id, customerId);
      loadMembers(group.id);
    } finally {
      setBusyCustomerId(null);
    }
  }

  const existingIds = new Set(members?.members.map((m) => m.customerId));

  return (
    <Modal
      open={Boolean(group)}
      onClose={onClose}
      title={group ? `Members · ${group.name}` : "Members"}
      description={members ? `${members.count} customer${members.count === 1 ? "" : "s"} in this group` : undefined}
    >
      {canWrite && (
        <div className="mb-4">
          <Input
            icon={<Search className="size-4" />}
            placeholder="Search customers to add…"
            aria-label="Search customers to add"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {results.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 rounded-lg border border-border-subtle p-1">
              {results.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-surface-hover">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{customer.name}</p>
                    <p className="text-xs text-ink-500">{customer.phone}</p>
                  </div>
                  {existingIds.has(customer.id) ? (
                    <span className="text-xs text-ink-400">Already added</span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={busyCustomerId === customer.id}
                      onClick={() => void handleAdd(customer.id)}
                    >
                      <UserPlus className="size-4" aria-hidden="true" />
                      Add
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && <SpinnerBlock label="Loading members…" />}
      {error && <Alert variant="error">{error}</Alert>}
      {!loading && !error && members && members.members.length === 0 && (
        <EmptyState title="No members yet" description="Add customers to this group using the search above." />
      )}
      {!loading && members && members.members.length > 0 && (
        <div className="flex flex-col divide-y divide-border-subtle">
          {members.members.map((member) => (
            <div key={member.customerId} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-ink-900">{member.name}</p>
                <p className="text-xs text-ink-500">{member.phone}</p>
              </div>
              {canWrite && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${member.name} from group`}
                  loading={busyCustomerId === member.customerId}
                  onClick={() => void handleRemove(member.customerId)}
                >
                  <Trash2 className="size-4 text-status-red-text" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
