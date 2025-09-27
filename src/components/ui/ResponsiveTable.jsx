import React from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useResponsive } from "@/components/hooks/useResponsive";

export default function ResponsiveTable({ columns = [], data = [], onRowClick }) {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((row, i) => (
          <Card
            key={i}
            className="p-4"
            onClick={() => onRowClick?.(row)}
            role={onRowClick ? "button" : undefined}
          >
            <div className="space-y-2">
              {columns.map((col) => (
                <div key={col.key} className="flex justify-between gap-3">
                  <span className="text-sm text-slate-600">{col.label}:</span>
                  <span className="font-medium text-right">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, i) => (
          <TableRow key={i} onClick={() => onRowClick?.(row)} className={onRowClick ? "cursor-pointer" : ""}>
            {columns.map((col) => (
              <TableCell key={col.key}>
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}