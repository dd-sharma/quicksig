export async function shareTest(test) {
  const url = `${window.location.origin}${window.location.pathname.replace(/\/+$/, '')}${window.location.search || ''}#test-${test.id}`;
  try {
    if (navigator.share) {
      await navigator.share({
        title: test.name || "A/B Test",
        text: test.winner ? `Check out this A/B test result: ${test.winner}` : "Check out this A/B test",
        url
      });
    } else {
      await navigator.clipboard.writeText(url);
      // Optionally trigger a toast in caller
    }
  } catch {
    // ignore share/copy errors
  }
}