"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Check,
  Headphones,
  ImageIcon,
  ImagePlus,
  Languages,
  Loader2,
  Pencil,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { WriteWithAiModal } from "@/components/admin/WriteWithAiModal";
import { compressImageForUpload } from "@/lib/compress-image";
import { FIELD_LIMITS } from "@/lib/field-limits";
import { cn } from "@/lib/utils";
import { MarkdownMessage } from "./MarkdownMessage";
import {
  deleteAdminSupportMessage,
  editAdminSupportMessage,
  getAdminSupportAttachmentUrl,
  getAdminSupportTicket,
  isTicketOpen,
  normalizeAttachments,
  sendAdminSupportMessage,
  supportSenderLabel,
  translateSupportMessage,
  uploadSupportAttachment,
  type SupportMessage,
  type SupportTicket,
} from "@/services/support";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const POLL_MS = 5000;

type Props = {
  ticketId: string;
  onTicketUpdate?: (ticket: SupportTicket) => void;
};

function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Attachment preview"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
}

function AttachmentImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getAdminSupportAttachmentUrl(path);
      if (cancelled) return;
      if (!result.ok) setFailed(true);
      else setUrl(result.url);
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (failed) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <ImageIcon className="w-4 h-4" />
        Image unavailable
      </div>
    );
  }
  if (!url) return <div className="h-24 rounded-lg bg-black/10 animate-pulse" />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full rounded-lg border border-white/20 overflow-hidden mt-2 cursor-zoom-in"
      >
        <img src={url} alt="" className="w-full max-h-48 object-contain bg-black/20" />
      </button>
      {open && <ImageLightbox url={url} onClose={() => setOpen(false)} />}
    </>
  );
}

type BubbleProps = {
  message: SupportMessage;
  editing: boolean;
  editText: string;
  busy: boolean;
  onStartEdit: (m: SupportMessage) => void;
  onEditTextChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (m: SupportMessage) => void;
};

function MessageBubble({
  message,
  editing,
  editText,
  busy,
  onStartEdit,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: BubbleProps) {
  const isSupportSide = message.role === "staff" || message.role === "system" || message.role === "ai";
  const isAi = message.role === "ai";
  // Only our-side messages (staff / AI / system) can be edited or deleted;
  // member messages are never touched.
  const canManage = isSupportSide;
  const label = supportSenderLabel(message.role, message.sender);
  const attachments = normalizeAttachments(message.attachments);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // On-demand English translation of a foreign-language message (admin only).
  const [translated, setTranslated] = useState<{ text: string; lang: string | null } | null>(null);
  const [translating, setTranslating] = useState(false);
  async function toggleTranslate() {
    if (translated) {
      setTranslated(null); // showing translation → hide it (back to original)
      return;
    }
    const body = message.body?.trim();
    if (!body) return;
    setTranslating(true);
    try {
      const res = await translateSupportMessage(body);
      if (res.ok) setTranslated({ text: res.translatedText, lang: res.detectedSourceLang });
      else toast.error(res.error || "Couldn't translate this message.");
    } catch {
      toast.error("Couldn't translate this message.");
    } finally {
      setTranslating(false);
    }
  }

  // Grow the editor to fit its content so it mirrors the bubble height instead
  // of a fixed, scrollable box.
  useLayoutEffect(() => {
    const el = taRef.current;
    if (!editing || !el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [editing, editText]);

  // Focus the editor when it opens WITHOUT scrolling - `autoFocus` (and a plain
  // .focus()) would jump the thread to bring the textarea into view.
  useEffect(() => {
    if (editing) taRef.current?.focus({ preventScroll: true });
  }, [editing]);

  return (
    <div className={cn("flex gap-3", isSupportSide ? "flex-row-reverse" : "")}>
      <div
        className={cn(
          "w-8 h-8 rounded-full grid place-items-center flex-shrink-0",
          isSupportSide ? "bg-purple-dim text-purple" : "bg-purple text-white",
        )}
      >
        {isSupportSide ? <Headphones className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>
      <div className={cn("group max-w-[min(80%,520px)]", editing && "w-full", isSupportSide ? "text-right" : "")}>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 px-1 flex items-center gap-1.5 flex-wrap">
          <span>{label}</span>
          {isAi && <span className="rounded bg-purple-dim px-1 py-0.5 text-purple font-bold">AI</span>}
          <span className="opacity-40">·</span>
          <span>
            {new Date(message.created_at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {message.body && !editing && (
            <button
              type="button"
              onClick={toggleTranslate}
              disabled={translating}
              className="inline-flex h-5 items-center gap-1 rounded px-1 text-muted-foreground opacity-70 hover:bg-purple-dim hover:text-purple hover:opacity-100 disabled:opacity-50 transition"
              title={translated ? "Show original" : "Translate to English"}
              aria-label={translated ? "Show original" : "Translate to English"}
            >
              {translating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
              <span className="text-[10px] font-semibold normal-case tracking-normal">
                {translated ? "Original" : "Translate"}
              </span>
            </button>
          )}
          {canManage && !editing && (
            <span className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
              <button
                type="button"
                onClick={() => onStartEdit(message)}
                disabled={busy}
                className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-purple-dim hover:text-purple disabled:opacity-50"
                title="Edit message"
                aria-label="Edit message"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(message)}
                disabled={busy}
                className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-red-dim hover:text-red disabled:opacity-50"
                title="Delete message"
                aria-label="Delete message"
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </button>
            </span>
          )}
        </div>
        <div
          className={cn(
            "rounded-xl px-4 py-2.5 text-sm leading-relaxed text-left",
            isSupportSide ? "bg-purple text-white" : "bg-surface-soft text-foreground border border-border",
          )}
        >
          {editing ? (
            <div className="space-y-2">
              {/* Transparent, borderless textarea so the bubble itself just
                  becomes editable in place - same colour, same padding, no box. */}
              <textarea
                ref={taRef}
                value={editText}
                onChange={(e) => onEditTextChange(e.target.value)}
                maxLength={FIELD_LIMITS.ticketMessage}
                rows={1}
                className="w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-inherit leading-relaxed focus:outline-none focus:ring-0"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancelEdit}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-60"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={onSaveEdit}
                  disabled={busy || !editText.trim()}
                  className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-xs font-semibold text-white hover:bg-white/30 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {message.body ? <MarkdownMessage text={message.body} /> : null}
              {translated && (
                <div
                  className={cn(
                    "mt-2 border-t pt-2",
                    isSupportSide ? "border-white/25" : "border-border",
                  )}
                >
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-70">
                    English{translated.lang ? ` · from ${translated.lang.toUpperCase()}` : ""}
                  </div>
                  <MarkdownMessage text={translated.text} />
                </div>
              )}
              {attachments.map((att) => (att.path ? <AttachmentImage key={att.path} path={att.path} /> : null))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SupportChatThread({ ticketId, onTicketUpdate }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageIdRef = useRef(0);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [writeAiOpen, setWriteAiOpen] = useState(false);

  const canReply = ticket ? isTicketOpen(ticket.status) : false;

  // Grow the reply box with content (capped) instead of staying single-line tall.
  useLayoutEffect(() => {
    const el = replyRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), 200)}px`;
  }, [input]);

  const mergeMessages = useCallback((incoming: SupportMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const msg of incoming) map.set(msg.id, msg);
      const merged = [...map.values()].sort((a, b) => a.id - b.id);
      lastMessageIdRef.current = merged[merged.length - 1]?.id ?? lastMessageIdRef.current;
      return merged;
    });
  }, []);

  const loadThread = useCallback(
    async (initial = false) => {
      const since = initial ? undefined : lastMessageIdRef.current || undefined;
      const result = await getAdminSupportTicket(ticketId, since);
      if (!result.ok) {
        if (initial) setError(result.error);
        return;
      }
      if (initial) {
        setTicket(result.ticket);
        setMessages(result.messages);
        lastMessageIdRef.current = result.messages[result.messages.length - 1]?.id ?? 0;
        onTicketUpdate?.(result.ticket);
      } else {
        mergeMessages(result.messages);
        if (result.ticket) {
          setTicket(result.ticket);
          onTicketUpdate?.(result.ticket);
        }
      }
    },
    [ticketId, mergeMessages, onTicketUpdate],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      await loadThread(true);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadThread]);

  useEffect(() => {
    const id = window.setInterval(() => void loadThread(false), POLL_MS);
    return () => window.clearInterval(id);
  }, [loadThread]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function clearImage() {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Use a PNG, JPG, WEBP or GIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be 5 MB or smaller.");
      return;
    }
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function startEdit(m: SupportMessage) {
    setEditingId(m.id);
    setEditText(m.body ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function saveEdit() {
    if (editingId == null) return;
    const body = editText.trim();
    if (!body) return;
    setBusyId(editingId);
    try {
      const result = await editAdminSupportMessage(ticketId, editingId, body);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const updated = result.message;
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, body: updated.body } : m)));
      cancelEdit();
    } finally {
      setBusyId(null);
    }
  }

  async function removeMessage(m: SupportMessage) {
    if (!window.confirm("Delete this message? This can't be undone.")) return;
    setBusyId(m.id);
    try {
      const result = await deleteAdminSupportMessage(ticketId, m.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
      if (editingId === m.id) cancelEdit();
    } finally {
      setBusyId(null);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if ((!body && !imageFile) || sending || !canReply) return;

    setSending(true);
    try {
      let imagePath: string | null = null;
      if (imageFile) {
        const prepared = await compressImageForUpload(imageFile);
        const upload = await uploadSupportAttachment(prepared);
        if (!upload.ok) {
          toast.error(upload.error);
          return;
        }
        imagePath = upload.imagePath;
      }

      const result = await sendAdminSupportMessage(ticketId, { body: body || "Shared an image", imagePath });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setInput("");
      clearImage();
      mergeMessages([result.message]);
      await loadThread(false);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-6 h-6 animate-spin text-purple" />
      </div>
    );
  }

  if (error || !ticket) {
    return <div className="rounded-xl border border-red/20 bg-red-dim p-6 text-sm text-red">{error ?? "Ticket not found."}</div>;
  }

  return (
    <div className="flex flex-col min-h-[480px]">
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto rounded-xl border border-border bg-surface p-4",
          messages.length === 0 ? "grid place-items-center" : "space-y-4",
        )}
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              editing={editingId === msg.id}
              editText={editText}
              busy={busyId === msg.id}
              onStartEdit={startEdit}
              onEditTextChange={setEditText}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}
              onDelete={removeMessage}
            />
          ))
        )}
      </div>

      {!canReply ? (
        <p className="mt-3 text-xs text-muted-foreground text-center">This ticket is closed. Reopen to reply.</p>
      ) : (
        <form onSubmit={handleSend} className="mt-3 space-y-2 rounded-xl border border-border bg-surface p-3">
          {imagePreview && (
            <div className="relative rounded-lg border border-border overflow-hidden bg-background max-w-xs">
              <img src={imagePreview} alt="" className="w-full max-h-32 object-contain bg-black/20" />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 end-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-surface/90 border border-border"
                aria-label="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setWriteAiOpen(true)}
              disabled={sending}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-purple/30 bg-purple-dim text-purple text-xs font-semibold hover:bg-purple/10 transition disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Write with AI
            </button>
          </div>
          <div className="flex gap-2 items-end">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={sending}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface hover:border-purple/40 transition disabled:opacity-60"
              aria-label="Attach image"
            >
              <ImagePlus className="w-4 h-4 text-purple" />
            </button>
            <textarea
              ref={replyRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!sending && (input.trim() || imageFile)) {
                    e.currentTarget.form?.requestSubmit();
                  }
                }
              }}
              maxLength={FIELD_LIMITS.ticketMessage}
              placeholder="Write a reply…"
              disabled={sending}
              rows={1}
              className="flex-1 min-h-11 bg-surface border border-border rounded-lg px-4 py-2.5 text-sm leading-5 focus:outline-none focus:border-purple/50 disabled:opacity-60 resize-none overflow-y-auto"
            />
            <button
              type="submit"
              disabled={sending || (!input.trim() && !imageFile)}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 px-4 py-2.5 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-60"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={onPickImage}
            className="sr-only"
          />
        </form>
      )}

      <WriteWithAiModal
        open={writeAiOpen}
        onClose={() => setWriteAiOpen(false)}
        initialDraft={input}
        onInsert={(text) => {
          setInput(text.slice(0, FIELD_LIMITS.ticketMessage));
          setWriteAiOpen(false);
        }}
      />
    </div>
  );
}
