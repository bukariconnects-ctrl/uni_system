const BLOCKED_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".scr",
  ".pif",
  ".ps1",
  ".vbs",
  ".vbe",
  ".js",
  ".jse",
  ".wsf",
  ".wsh",
  ".sh",
  ".bash",
  ".csh",
  ".dll",
  ".sys",
  ".drv",
  ".inf",
  ".reg",
  ".app",
  ".action",
  ".command",
  ".workflow",
]);

const BLOCKED_MIME_TYPES = new Set([
  "application/x-msdownload",
  "application/x-executable",
  "application/x-dosexec",
  "application/x-msdos-program",
  "application/x-msi",
  "application/x-bat",
  "application/x-sh",
  "application/x-shellscript",
  "application/x-httpd-php",
  "application/vnd.microsoft.portable-executable",
]);

const ALLOWED_MIME_PREFIXES = [
  "image/",
  "video/",
  "audio/",
  "text/",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/zip",
  "application/x-rar",
  "application/json",
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(
  fileName: string,
  mimeType: string,
  maxSizeBytes?: number,
  fileSize?: number
): FileValidationResult {
  const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `نوع الملف "${ext}" غير مسموح به لأسباب أمنية`,
    };
  }

  if (BLOCKED_MIME_TYPES.has(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `نوع MIME "${mimeType}" غير مسموح به`,
    };
  }

  const isAllowedMime = ALLOWED_MIME_PREFIXES.some((prefix) =>
    mimeType.toLowerCase().startsWith(prefix)
  );

  if (!isAllowedMime && mimeType !== "application/octet-stream") {
    return {
      valid: false,
      error: `نوع الملف "${mimeType}" غير مدعوم`,
    };
  }

  if (maxSizeBytes && fileSize && fileSize > maxSizeBytes) {
    const maxMB = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `حجم الملف يتجاوز الحد المسموح (${maxMB} ميجابايت)`,
    };
  }

  return { valid: true };
}

export function validateUploadMime(mimeType: string): boolean {
  if (BLOCKED_MIME_TYPES.has(mimeType.toLowerCase())) return false;
  return ALLOWED_MIME_PREFIXES.some((prefix) =>
    mimeType.toLowerCase().startsWith(prefix)
  );
}
