import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BillingInvoice } from "@/api/entities";
import { format } from "date-fns";

export default function BillingHistoryModal({ open, onOpenChange, organizationId }) {
  const [invoices, setInvoices] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      if (!open || !organizationId) return;
      setLoading(true);
      const list = await BillingInvoice.filter({ organization_id: organizationId }, "-invoice_date", 50);
      setInvoices(list || []);
      setLoading(false);
    })();
  }, [open, organizationId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Billing History</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-slate-500">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="text-sm text-slate-500">No invoices yet.</div>
          ) : (
            <ul className="divide-y">
              {invoices.map(inv => (
                <li key={inv.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">{format(new Date(inv.invoice_date), "MMM. d, yyyy")}</div>
                    <div className="text-xs text-slate-500 capitalize">{inv.status}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-semibold">
                      {(inv.currency || "USD")} ${(Math.round((inv.amount_cents || 0) / 100)).toLocaleString()}
                    </div>
                    {inv.pdf_url ? (
                      <a href={inv.pdf_url} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm">Download</Button>
                      </a>
                    ) : (
                      <Button variant="outline" size="sm" disabled>Download</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}