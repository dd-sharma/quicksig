import React from "react";
import SmartHint from "./SmartHint";
import ProgressiveDisclosureService from "@/components/services/ProgressiveDisclosureService";

export default function FeatureDiscovery({ context }) {
  const [hint, setHint] = React.useState(null);
  React.useEffect(() => {
    // Weekly cadence
    const last = localStorage.getItem("qs_feature_discovery_last");
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    if (last && Date.now() - new Date(last).getTime() < weekMs) return;

    // Simple sample discovery: promote Projects after 5 tests, Segmentation after results, Exports after 3 completed
    if ((context.tests_created || 0) >= 5 && !context.used_projects) {
      setHint({
        id: "discover_projects",
        category: "advanced_features",
        message: "Organize your experiments with Projects. Create one to group related tests.",
        style: "card",
        dismissible: true,
        actionLabel: "Go to Projects",
        actionTo: "Projects"
      });
    } else if (context.has_results && context.never_used_segmentation) {
      setHint({
        id: "discover_segmentation",
        category: "advanced_features",
        message: "Slice results by device and source with Segmentation to uncover hidden wins.",
        style: "card",
        dismissible: true,
        actionLabel: "Open a test",
        actionTo: "TestHistory"
      });
    } else if ((context.tests_completed || 0) >= 3 && !context.used_exports) {
      setHint({
        id: "discover_exports",
        category: "advanced_features",
        message: "Export summaries and raw data for deeper analysis or sharing.",
        style: "card",
        dismissible: true,
        actionLabel: "Export Center",
        actionTo: "ExportCenter"
      });
    }
  }, [context]);

  if (!hint) return null;

  return (
    <SmartHint
      hint={hint}
      onDismiss={async () => {
        await ProgressiveDisclosureService.dismiss(hint.id);
        localStorage.setItem("qs_feature_discovery_last", new Date().toISOString());
        setHint(null);
      }}
      onAction={() => {
        if (hint.actionTo) window.location.href = `/${hint.actionTo}`;
      }}
      style={hint.style}
    />
  );
}