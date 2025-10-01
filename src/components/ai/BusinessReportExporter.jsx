import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { UploadPrivateFile, CreateFileSignedUrl, SendEmail } from "@/api/integrations";
import { generateBusinessReport } from "@/api/functions";

export default function BusinessReportExporter({ test, interpretation, metrics = {} }) {
  const [email, setEmail] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const downloadPdf = async () => {
    setIsBusy(true);
    try {
      const { data } = await generateBusinessReport({
        testName: test?.test_name,
        interpretation,
        metrics
      });
      const blob = new Blob([data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${test?.test_name || "test"}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      setIsBusy(false);
    }
  };

  const emailPdf = async () => {
    if (!email) return;
    setIsBusy(true);
    try {
      // Generate PDF
      const { data } = await generateBusinessReport({
        testName: test?.test_name,
        interpretation,
        metrics
      });
      const blob = new Blob([data], { type: "application/pdf" });
      const file = new File([blob], `${test?.test_name || "test"}_report.pdf`, { type: "application/pdf" });
      // Upload privately and sign
      const { file_uri } = await UploadPrivateFile({ file });
      const { signed_url } = await CreateFileSignedUrl({ file_uri, expires_in: 3600 });
      // Send email with link
      await SendEmail({
        to: email,
        subject: `QuickSig Report: ${test?.test_name}`,
        body: `Your business report is ready.\n\nDownload: ${signed_url}\n\nSummary: ${interpretation?.executiveSummary || ""}`
      });
      alert("Report emailed successfully.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label>Send to email</Label>
            <Input placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button onClick={emailPdf} disabled={isBusy || !email}>Email Report</Button>
          <Button variant="outline" onClick={downloadPdf} disabled={isBusy}>Download PDF</Button>
        </div>
      </CardContent>
    </Card>
  );
}