export function getFilenameFromContentDisposition(contentDisposition) {
  if (!contentDisposition) return "";

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    const rawFilename = utf8Match[1].replaceAll('"', "").trim();
    try {
      return decodeURIComponent(rawFilename);
    } catch {
      return rawFilename;
    }
  }

  const fallbackMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return fallbackMatch?.[1]?.trim() || "";
}

export function downloadBlob(response, fallbackName) {
  const contentType = response.headers?.["content-type"] || "application/octet-stream";
  const blob = new Blob([response.data], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename =
    getFilenameFromContentDisposition(response.headers?.["content-disposition"]) ||
    fallbackName ||
    "document";

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
