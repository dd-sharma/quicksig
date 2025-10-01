import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Projects() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
        <Button variant="outline">Add Project</Button>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          Manage different websites/apps and group your tests by project.
        </CardContent>
      </Card>
    </div>
  );
}