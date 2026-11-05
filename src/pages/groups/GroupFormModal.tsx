import { useEffect, useState, type FormEvent } from "react";
import { groupsApi } from "@/api/groups";
import { useMutation } from "@/hooks/useApi";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function GroupFormModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
    }
  }, [open]);

  const [save, saveState] = useMutation(() => groupsApi.create({ name, description }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await save();
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New group"
      description="Groups let you target campaigns at a specific set of customers."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="group-form" type="submit" loading={saveState.loading}>
            Create group
          </Button>
        </>
      }
    >
      <form id="group-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {saveState.error && <Alert variant="error">{saveState.error}</Alert>}
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </form>
    </Modal>
  );
}
