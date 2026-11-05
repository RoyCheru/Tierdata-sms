import { useEffect, useState, type FormEvent } from "react";
import { customersApi } from "@/api/customers";
import type { Customer, SmsEligibility } from "@/types/entities";
import { useMutation } from "@/hooks/useApi";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSaved: (isEdit: boolean) => void;
}

export function CustomerFormModal({ open, onClose, customer, onSaved }: CustomerFormModalProps) {
  const isEdit = Boolean(customer);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [smsEligibility, setSmsEligibility] = useState<SmsEligibility>("eligible");

  useEffect(() => {
    if (open) {
      setName(customer?.name ?? "");
      setPhone(customer?.phone ?? "");
      setEmail(customer?.email ?? "");
      setSmsEligibility(customer?.smsEligibility ?? "eligible");
    }
  }, [open, customer]);

  const [save, saveState] = useMutation(async () => {
    if (isEdit && customer) {
      await customersApi.update(customer.id, { name, phone, email });
      if (smsEligibility !== customer.smsEligibility) {
        await customersApi.updateSmsEligibility(customer.id, smsEligibility);
      }
    } else {
      await customersApi.create({ name, phone, email });
    }
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await save();
    onSaved(isEdit);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit customer" : "New customer"}
      description={isEdit ? "Update contact details or SMS eligibility." : "Add a new contact to your customer list."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="customer-form" type="submit" loading={saveState.loading}>
            {isEdit ? "Save changes" : "Create customer"}
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {saveState.error && <Alert variant="error">{saveState.error}</Alert>}
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
          autoFocus
        />
        <Input
          label="Phone number"
          placeholder="+2547XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          autoComplete="tel"
          required
        />
        <Input
          label="Email (optional)"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          hint="Needed to include this customer in email campaigns."
        />
        {isEdit && (
          <Select
            label="SMS eligibility"
            value={smsEligibility}
            onChange={(e) => setSmsEligibility(e.target.value as SmsEligibility)}
            hint="Controls whether this customer can be included in future campaigns."
          >
            <option value="eligible">Eligible</option>
            <option value="opted_out">Opted out</option>
            <option value="unsubscribed">Unsubscribed</option>
          </Select>
        )}
      </form>
    </Modal>
  );
}
