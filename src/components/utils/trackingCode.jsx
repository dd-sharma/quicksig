export function dynamicizeTrackingCode(code) {
  const origin = window?.location?.origin || "";
  if (typeof code !== "string") return code;
  // Replace any hardcoded app.quicksig.com references with the current origin
  return code.replaceAll("https://app.quicksig.com", origin);
}