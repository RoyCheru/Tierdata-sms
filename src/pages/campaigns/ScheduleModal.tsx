import { useState, type FormEvent } from "react";
import { schedulesApi } from "@/api/schedules";
import { useMutation } from "@/hooks/useApi";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  onScheduled: () => void;
}

export function ScheduleModal({ open, onClose, campaignId, onScheduled }: ScheduleModalProps) {
  const [runAt, setRunAt] = useState("");

  const [save, saveState] = useMutation(() => schedulesApi.create({ campaignId, runAt: new Date(runAt).toISOString() }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await save();
    onScheduled();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule campaign"
      size="sm"
      description="Choose a future date and time to send this campaign automatically."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="schedule-form" type="submit" loading={saveState.loading}>
            Schedule
          </Button>
        </>
      }
    >
      <form id="schedule-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {saveState.error && <Alert variant="error">{saveState.error}</Alert>}
        <Input
          label="Send at"
          type="datetime-local"
          value={runAt}
          onChange={(e) => setRunAt(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          required
          autoFocus
        />
      </form>
    </Modal>
  );
}
