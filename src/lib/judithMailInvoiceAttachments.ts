/** Pure helpers for Judith AI email attachments. No accounting or payment operations. */
export type JudithAttachmentKind = "invoice-candidate" | "image" | "pdf" | "other";

export type JudithMailAttachment = {
  id: string;
  filename: string | null;
  mime_type: string | null;
  storage_path: string | null;
  byte_size?: number | null;
};

const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"]);

export function supportedJudithAttachment(attachment: JudithMailAttachment): boolean {
  return Boolean(attachment.storage_path && attachment.mime_type && ALLOWED.has(attachment.mime_type.toLowerCase()));
}

/** Filename is only a hint. Content inspection is required before classifying an invoice. */
export function classifyJudithAttachment(attachment: JudithMailAttachment): JudithAttachmentKind {
  if (!supportedJudithAttachment(attachment)) return "other";
  const name = (attachment.filename || "").toLocaleLowerCase("de-AT");
  const mime = attachment.mime_type!.toLowerCase();
  if (/(rechnung|invoice|faktura|gutschrift)/i.test(name)) return "invoice-candidate";
  return mime === "application/pdf" ? "pdf" : "image";
}

/** Never create public URLs for private mail attachments. */
export async function getJudithAttachmentSignedUrl(
  attachment: JudithMailAttachment,
  createSignedUrl: (path: string, expiresIn: number) => Promise<{ data?: { signedUrl?: string } | null; error?: { message: string } | null }>,
): Promise<string> {
  if (!supportedJudithAttachment(attachment)) throw new Error("Anhang nicht verfügbar");
  // Caller must verify authenticated access to the mail and business before signing.
  const { data, error } = await createSignedUrl(attachment.storage_path!, 60);
  if (error || !data?.signedUrl) throw new Error("Anhang konnte nicht geöffnet werden");
  return data.signedUrl;
}
