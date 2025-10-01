export async function downloadFile(data, filename, type = "application/octet-stream") {
  try {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.target = "_self";
    // Do not append to DOM; most browsers allow click without insertion
    a.click();

    // Revoke object URL on next tick to avoid memory leaks
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);

    return true;
  } catch (error) {
    console.error("downloadFile error:", error);
    return false;
  }
}