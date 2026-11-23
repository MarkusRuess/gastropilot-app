/** Judith AI mail attachment helpers. No bookkeeping or payment operations. */
export type MailAttachment = {
  id: string;
  message_id: string;
  filename: string | null;
  mime_type: string | null;
  storage_path: string | null;
  byte_size: number | null;
};

export type AttachmentKind = "pdf" | "image" | "unsupported";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
export function attachmentKind(a: Pick<MailAttachment, "mime_type">): AttachmentKind {
  const mime = (a.mime_type ?? "").toLowerCase().split(";")[0].trim();
  if (mime === "application/pdf") return "pdf";
  if (IMAGE_TYPES.has(mime)) return "image";
  return "unsupported";
}

export function attachmentLabel(a: Pick<MailAttachment, "filename" | "mime_type">): string {
  return a.filename?.trim() || (attachmentKind(a) === "pdf" ? "Dokument.pdf" : "Anhang");
}

export function canPreview(a: Pick<MailAttachment, "mime_type" | "storage_path">): boolean {
  return Boolean(a.storage_path) && attachmentKind(a) !== "unsupported";
}

/**
 * IMPORTANT: Invoke only from a user-authenticated server endpoint after checking
 * message ownership, company isolation and authorization.
 * Storage bucket "judith-ai-attachments" MUST remain private.
 * Never send a service-role key to the browser.
 */
export interface AttachmentAccessService {
  getSignedReadUrl(attachmentId: string, ttlSeconds: number): Promise<string>;
}

export async function getAttachmentPreviewUrl(
  service: AttachmentAccessService,
  attachment: MailAttachment,
): Promise<string> {
  if (!canPreview(attachment)) throw new Error("Anhang kann nicht angezeigt werden");
  return service.getSignedReadUrl(attachment.id, 60);
}

/** No automatic printing: browser print is initiated by the employee. */
export function printAttachmentFromWindow(fileWindow: Window | null): void {
  if (!fileWindow) throw new Error("Bitte Pop-ups für den Dokumentendruck erlauben");
  fileWindow.focus();
  fileWindow.print();
}

export type ExtractedInvoiceForReview = {
  attachmentId: string;
  supplier: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  netAmount: number | null;
  vatAmount: number | null;
  grossAmount: number | null;
  lineItems: Array<{ description: string; quantity: number | null; unit: string | null; netUnitPrice: number | null }>;
  requiresReview: true;
};

/** Extraction results are NOT bookkeeping entries and never trigger payments. */
export function requireInvoiceReview(
  invoice: Omit<ExtractedInvoiceForReview, "requiresReview">,
): ExtractedInvoiceForReview {
  return { ...invoice, requiresReview: true };
}
