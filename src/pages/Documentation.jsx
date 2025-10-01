
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Rocket, Wrench, Plug, Bug, HelpCircle, Code2 } from "lucide-react";
import Breadcrumbs from "@/components/docs/Breadcrumbs";
import VideoCards from "@/components/docs/VideoCards";

// Update section links to flat pages
const sections = [
  {
    title: "Quick Start Guide",
    desc: "Get set up in 5 minutes with the basic snippet.",
    icon: Rocket,
    to: createPageUrl("DocsInstallationGuide")
  },
  {
    title: "Installation Guides",
    desc: "WordPress, Shopify, Wix, Squarespace and more.",
    icon: Wrench,
    to: createPageUrl("DocsInstallationGuide")
  },
  {
    title: "Integration Methods",
    desc: "Different ways to add QuickSig to your site.",
    icon: Plug,
    to: createPageUrl("DocsInstallationGuide")
  },
  {
    title: "Troubleshooting",
    desc: "Fix common issues and verify your setup.",
    icon: Bug,
    to: createPageUrl("DocsTroubleshooting")
  },
  {
    title: "FAQ",
    desc: "Answers to frequently asked questions.",
    icon: HelpCircle,
    to: createPageUrl("DocsFAQ")
  },
  {
    title: "API Reference",
    desc: "Deep dive into endpoints and usage.",
    icon: Code2,
    to: createPageUrl("ApiDocs")
  }
];

export default function Documentation() {
  return (
    <div className="p-6 max-w-7xl mx-auto text-base">
      <Breadcrumbs items={[
        { label: "Home", to: createPageUrl("Dashboard") },
        { label: "Documentation" }
      ]} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Documentation</h1>
        <p className="text-slate-600 mt-1">Everything you need to get started with QuickSig</p>
        <div className="mt-4">
          <Link to={createPageUrl("DocsInstallationGuide")}> {/* This also needs to be updated based on the "flat pages" logic if it's pointing to a doc page */}
            <Button className="bg-blue-600 hover:bg-blue-700">
              <BookOpen className="w-4 h-4 mr-2" />
              View Installation Guide
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((s) => (
          <Link key={s.title} to={s.to}>
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <s.icon className="w-5 h-5" />
                  </span>
                  {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{s.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-3">Video Tutorials</h2>
        <VideoCards />
      </div>
    </div>
  );
}
