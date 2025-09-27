import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PaymentMethodModal({ open, onOpenChange, organization, onSave }) {
  const [brand, setBrand] = React.useState(organization?.payment_method?.brand || "Visa");
  const [last4, setLast4] = React.useState(organization?.payment_method?.last4 || "");
  const [expMonth, setExpMonth] = React.useState(organization?.payment_method?.exp_month ? String(organization.payment_method.exp_month) : "");
  const [expYear, setExpYear] = React.useState(organization?.payment_method?.exp_year ? String(organization.payment_method.exp_year) : "");

  React.useEffect(() => {
    if (open) {
      setBrand(organization?.payment_method?.brand || "Visa");
      setLast4(organization?.payment_method?.last4 || "");
      setExpMonth(organization?.payment_method?.exp_month ? String(organization.payment_method.exp_month) : "");
      setExpYear(organization?.payment_method?.exp_year ? String(organization.payment_method.exp_year) : "");
    }
  }, [open, organization]);

  const handleSave = () => {
    const payload = {
      brand,
      last4: last4.slice(-4),
      exp_month: Number(expMonth) || null,
      exp_year: Number(expYear) || null
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Method</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Card Brand</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Visa">Visa</SelectItem>
                <SelectItem value="Mastercard">Mastercard</SelectItem>
                <SelectItem value="Amex">Amex</SelectItem>
                <SelectItem value="Discover">Discover</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Last 4 digits</Label>
            <Input value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(-4))} placeholder="1234" maxLength={4} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Expiry Month</Label>
              <Input value={expMonth} onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0,2))} placeholder="MM" />
            </div>
            <div>
              <Label>Expiry Year</Label>
              <Input value={expYear} onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0,4))} placeholder="YYYY" />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            We store only non-sensitive card details (brand, last 4, and expiry). Your card number is never stored and will be securely added when we integrate payments.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}