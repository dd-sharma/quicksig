
import { createPageUrl } from "@/utils";

const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b8706eb327a0a001504a4a/17d93696f_QuickSig_logo.png";

function absoluteUrl(relativePath) {
  try {
    const base = window?.location?.origin || "https://app.quicksig.com";
    return base + relativePath;
  } catch {
    return "https://app.quicksig.com" + relativePath;
  }
}

function button(label, url) {
  return `
    <a href="${url}" style="display:inline-block;padding:12px 18px;background:linear-gradient(90deg,#3b82f6,#2563eb);color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
      ${label}
    </a>
  `;
}

function baseTemplate({ title, contentHtml, ctas = [], unsubscribeUrl }) {
  const manageUrl = absoluteUrl(createPageUrl("Profile"));
  const unsub = unsubscribeUrl || manageUrl;
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
          <tr>
            <td style="padding:20px 24px;border-bottom:1px solid #e5e7eb;">
              <img src="${logoUrl}" alt="QuickSig" width="42" height="42" style="vertical-align:middle;border:0" />
              <span style="font-size:18px;font-weight:700;color:#0f172a;margin-left:10px;vertical-align:middle">QuickSig</span>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <h1 style="margin:0 0 12px 0;font-size:20px;line-height:28px;color:#0f172a;">${title}</h1>
              <div style="font-size:14px;line-height:22px;color:#334155;">
                ${contentHtml}
              </div>
              ${ctas.length ? `<div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;">${ctas.join("")}</div>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #e5e7eb;">
              <div style="font-size:12px;color:#64748b;">
                <div style="margin-bottom:6px;">
                  <a href="${manageUrl}" style="color:#3b82f6;text-decoration:none;">Manage notification preferences</a> • 
                  <a href="${unsub}" style="color:#3b82f6;text-decoration:none;">Unsubscribe</a>
                </div>
                © ${new Date().getFullYear()} QuickSig. All rights reserved.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;
}

// Existing templates kept
export function testCompletionEmail({ test, durationText, totalVisitors, winnerName, upliftPct, confidencePct, unsubscribeUrl }) {
  const resultsUrl = absoluteUrl(createPageUrl(`TestDetail?id=${test.id}`));
  const content = `
    <p>Your A/B test has finished. Here's a quick summary:</p>
    <table width="100%" cellspacing="0" cellpadding="0" style="margin:12px 0;border-collapse:collapse;">
      <tr><td style="padding:8px 0;width:160px;color:#64748b;">Test</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${test.test_name}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">URL</td><td style="padding:8px 0;"><a href="${test.test_url}" style="color:#3b82f6;text-decoration:none;">${test.test_url}</a></td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Duration</td><td style="padding:8px 0;">${durationText}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Total Visitors</td><td style="padding:8px 0;">${totalVisitors.toLocaleString?.() || totalVisitors}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Winning Variant</td><td style="padding:8px 0;font-weight:600;color:#14532d;">${winnerName} (${upliftPct.toFixed(1)}% uplift)</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Confidence</td><td style="padding:8px 0;">${confidencePct.toFixed(1)}%</td></tr>
    </table>
    <p style="margin-top:10px;background:#f8fafc;padding:10px;border-radius:8px;">
      Simple AI interpretation: <strong>${winnerName}</strong> outperformed Control by <strong>${upliftPct.toFixed(0)}%</strong> with high confidence.
    </p>
  `;
  return baseTemplate({
    title: `🎯 Your A/B test '${test.test_name}' has completed!`,
    contentHtml: content,
    ctas: [button("View Full Results", resultsUrl)],
    unsubscribeUrl
  });
}

export function significanceAlertEmail({ test, winnerName, upliftPct, confidencePct, unsubscribeUrl }) {
  const resultsUrl = absoluteUrl(createPageUrl(`TestDetail?id=${test.id}`));
  const endUrl = resultsUrl + "#end-test";
  const content = `
    <p>Your running test has reached statistical significance.</p>
    <table width="100%" cellspacing="0" cellpadding="0" style="margin:12px 0;border-collapse:collapse;">
      <tr><td style="padding:8px 0;width:160px;color:#64748b;">Test</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${test.test_name}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Current Leader</td><td style="padding:8px 0;font-weight:600;color:#14532d;">${winnerName} (${upliftPct.toFixed(1)}% uplift)</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Confidence</td><td style="padding:8px 0;">${confidencePct.toFixed(1)}%</td></tr>
    </table>
  `;
  return baseTemplate({
    title: `✨ '${test.test_name}' has reached statistical significance!`,
    contentHtml: content,
    ctas: [button("View Results", resultsUrl), button("End Test Now", endUrl)],
    unsubscribeUrl
  });
}

export function statusChangeEmail({ test, newStatus, actorName, changedAt, unsubscribeUrl }) {
  const resultsUrl = absoluteUrl(createPageUrl(`TestDetail?id=${test.id}`));
  const statusTitleMap = {
    paused: `⏸️ Test '${test.test_name}' has been paused`,
    running: `▶️ Test '${test.test_name}' is running again`,
    archived: `🗄️ Test '${test.test_name}' has been archived`
  };
  const content = `
    <p>Status update for your test:</p>
    <table width="100%" cellspacing="0" cellpadding="0" style="margin:12px 0;border-collapse:collapse;">
      <tr><td style="padding:8px 0;width:160px;color:#64748b;">Test</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${test.test_name}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Changed By</td><td style="padding:8px 0;">${actorName}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">When</td><td style="padding:8px 0;">${new Date(changedAt).toLocaleString()}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">New Status</td><td style="padding:8px 0;font-weight:600;text-transform:capitalize;">${newStatus}</td></tr>
    </table>
  `;
  return baseTemplate({
    title: statusTitleMap[newStatus] || `Test '${test.test_name}' status changed`,
    contentHtml: content,
    ctas: [button("View Results", resultsUrl)],
    unsubscribeUrl
  });
}

// NEW: Weekly summary email with simple charts
export function weeklySummaryEmail({ user, org, overview, winners, insights, needsAttention, quickLinks, decisionInsights, testsNeedingDecision, orgPatterns, unsubscribeUrl, totalMonthlyImpact = 0, highestImpactTest = null }) {
  const list = (items) => items.length ? `<ul style="margin:8px 0 0 18px;padding:0;">${items.map(i => `<li style="margin:4px 0;">${i}</li>`).join("")}</ul>` : "<p style='color:#64748b;'>No items</p>";
  const progress = (pct) => `<div style="background:#e5e7eb;border-radius:6px;overflow:hidden;height:8px;width:160px;"><div style="height:8px;background:#3b82f6;width:${Math.min(100, Math.max(0, pct))}%;"></div></div>`;
  const spark = (arr=[]) => {
    const blocks = [' ','▂','▃','▄','▅','▆','▇','█'];
    if (!arr.length) return '—';
    const max = Math.max(...arr);
    return arr.map(v => blocks[Math.min(7, Math.floor((v / (max || 1)) * 7))]).join('');
  };

  const financialBlock = (totalMonthlyImpact && totalMonthlyImpact > 0) ? `
  <div style="margin: 20px 0; padding: 15px; background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px;">
    <h3 style="margin: 0 0 10px;">💰 Potential Revenue Impact</h3>
    <p style="margin: 5px 0; font-size: 24px; font-weight: bold;">
      $${Math.round(totalMonthlyImpact).toLocaleString()}/month
    </p>
    <p style="margin: 5px 0; color: #92400e;">
      From implementing your winning tests
    </p>
    ${highestImpactTest ? `
      <p style="margin: 10px 0 0; font-size: 14px;">
        Highest impact: ${highestImpactTest.name} 
        ($${Math.round(highestImpactTest.impact).toLocaleString()}/mo)
      </p>
    ` : ``}
  </div>` : ``;

  const content = `
    <p>Here's your weekly testing summary for <strong>${org?.name || "your workspace"}</strong>.</p>
    <h3 style="margin:16px 0 6px;">1) Overview</h3>
    <table width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 12px;border-collapse:collapse;">
      <tr><td style="padding:6px 0;width:220px;color:#64748b;">Active tests</td><td style="padding:6px 0;">${overview.activeCount} ${overview.activeNames?.length ? `– ${overview.activeNames.join(", ")}` : ""}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Completed this week</td><td style="padding:6px 0;">${overview.completedThisWeek}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Total visitors</td><td style="padding:6px 0;">${(overview.totalVisitors||0).toLocaleString?.() || overview.totalVisitors}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Avg. confidence</td><td style="padding:6px 0;">${(overview.avgConfidence||0).toFixed(1)}% ${progress(overview.avgConfidence||0)}</td></tr>
    </table>

    ${decisionInsights ? `
      <div style="margin: 20px 0; padding: 15px; background: #f0f4ff; border-radius: 8px;">
        <h3 style="margin: 0 0 10px;">📊 Your Decision Style: ${decisionInsights.style}</h3>
        <p style="margin: 5px 0;">You follow recommendations ${decisionInsights.followRate}% of the time</p>
        <p style="margin: 5px 0;">Average decision time: ${Number(decisionInsights.avgDecisionTime || 0).toFixed(1)} hours</p>
        <p style="margin: 10px 0; font-style: italic;">"${decisionInsights.message}"</p>
      </div>
    ` : ''}

    ${financialBlock}

    ${Array.isArray(testsNeedingDecision) && testsNeedingDecision.length > 0 ? `
      <div style="margin: 20px 0; padding: 15px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;">
        <h3 style="margin: 0 0 10px;">✅ Tests Ready for Decision</h3>
        ${testsNeedingDecision.map(t => `
          <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 6px;">
            <strong>${t.name}</strong>
            <p style="margin: 5px 0; color: #059669;">${t.recommendation}</p>
            <p style="margin: 5px 0; font-size: 14px;">Confidence: ${t.confidence}% • ${t.timeEstimate}</p>
            <a href="${t.url}" style="color: #2563eb;">Make Decision →</a>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${orgPatterns ? `
      <div style="margin: 16px 0; padding: 12px; background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="margin: 0 0 10px;">👥 Team Decision Patterns</h3>
        <p style="margin: 5px 0;">Team follow rate: <strong>${orgPatterns.followRate}%</strong></p>
        <p style="margin: 5px 0;">Avg. confidence at decision: <strong>${orgPatterns.avgConfidenceAtDecision}%</strong></p>
        <p style="margin: 5px 0;">Avg. time to decision: <strong>${orgPatterns.avgDecisionTimeHours} hours</strong></p>
      </div>
    ` : ''}

    <h3 style="margin:16px 0 6px;">2) Winners & Insights</h3>
    <p><strong>Top performer:</strong> ${winners.topName || "—"} (${(winners.topUplift||0).toFixed(1)}% uplift, ${(winners.topConfidence||0).toFixed(1)}% confidence)</p>
    <p><strong>Combined uplift:</strong> ${(winners.totalUplift||0).toFixed(1)}%</p>
    <p style="background:#f8fafc;padding:10px;border-radius:8px;margin-top:6px;">AI insight: ${insights.message || "Your headline tests continue to outperform button color tests; prioritize copy this week."}</p>

    <h3 style="margin:16px 0 6px;">3) Needs Attention</h3>
    ${list(needsAttention.items || [])}

    <h3 style="margin:16px 0 6px;">4) Quick Actions</h3>
    ${list((quickLinks || []).map(l => `<a href="${l.url}" style="color:#3b82f6;text-decoration:none;">${l.label}</a>`))}
    <div style="margin-top:10px;">${button("Create New Test", absoluteUrl(createPageUrl("TestsNew")))}</div>

    <div style="margin-top:16px;color:#64748b;">Traffic trend: <span style="font-family:monospace;">${spark(overview.sparkline || [])}</span></div>
  `;
  return baseTemplate({ title: "📊 Your QuickSig Weekly Testing Summary", contentHtml: content, ctas: [], unsubscribeUrl });
}

// NEW: Bulk completion, usage alerts, team, re-engagement
export function bulkCompletionEmail({ user, tests, unsubscribeUrl }) {
  const content = `
    <p>${tests.length} tests completed in the last hour:</p>
    ${tests.map(t => `
      <div style="margin:10px 0;padding:10px;border:1px solid #e5e7eb;border-radius:8px;">
        <div style="font-weight:600;">${t.test_name}</div>
        <div style="color:#64748b;">Winner: ${t.winnerName} (${t.upliftPct.toFixed(1)}% uplift, ${t.confidencePct.toFixed(1)}% confidence)</div>
        <div style="margin-top:8px;">${button("View Results", absoluteUrl(createPageUrl("TestDetail?id="+t.id)))}</div>
      </div>
    `).join("")}
  `;
  return baseTemplate({
    title: `🎯 ${tests.length} tests completed in the last hour`,
    contentHtml: content,
    ctas: [],
    unsubscribeUrl
  });
}

export function usageAlertEmail({ level, used, total, unsubscribeUrl }) {
  const subjects = {
    "50": `📊 You've used ${used.toLocaleString?.() || used} of ${total.toLocaleString?.() || total} monthly visitors`,
    "80": `⚠️ Approaching monthly limit - ${used.toLocaleString?.() || used} of ${total.toLocaleString?.() || total} visitors used`,
    "100": `🛑 Monthly visitor limit reached - tests paused`
  };
  const content = `
    <p>${subjects[level]}</p>
    <p style="margin-top:10px;">Manage your plan or pause low-impact tests to stay within limits.</p>
    ${button("View Plan & Usage", absoluteUrl(createPageUrl("PlanManagement")))}
  `;
  return baseTemplate({ title: subjects[level], contentHtml: content, ctas: [], unsubscribeUrl });
}

export function teamInviteEmail({ organizationName, inviterName, inviteeEmail, unsubscribeUrl }) {
  const content = `
    <p>👥 You've been invited to join <strong>${organizationName}</strong> on QuickSig by ${inviterName}.</p>
    ${button("Accept Invitation", absoluteUrl(createPageUrl("SettingsTeam")))}
  `;
  return baseTemplate({ title: `👥 You've been invited to join ${organizationName} on QuickSig`, contentHtml: content, ctas: [], unsubscribeUrl });
}

export function teamActivityEmail({ actor, action, test, unsubscribeUrl }) {
  const content = `
    <p><strong>${actor}</strong> ${action} "<strong>${test.test_name}</strong>".</p>
    ${button("View Test", absoluteUrl(createPageUrl("TestDetail?id="+test.id)))}
  `;
  return baseTemplate({ title: `${actor} ${action} "${test.test_name}"`, contentHtml: content, ctas: [], unsubscribeUrl });
}

export function reengagementEmail({ user, tests, unsubscribeUrl }) {
  const content = `
    <p>🤔 Miss your A/B testing insights?</p>
    <p>Here are recent highlights since your last visit:</p>
    ${tests.length ? `<ul>${tests.map(t => `<li>${t.test_name} — Winner: ${t.winnerName || "—"}</li>`).join("")}</ul>` : "<p>No completed tests recently.</p>"}
    <div style="margin-top:10px;">${button("Log in to QuickSig", absoluteUrl(createPageUrl("Dashboard")))}</div>
  `;
  return baseTemplate({ title: "🤔 Miss your A/B testing insights?", contentHtml: content, ctas: [], unsubscribeUrl });
}
