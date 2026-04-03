import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditorStore } from "@/store/editorStore";
import type { CommentElement } from "@/types/editor";
import { Check, MessageSquare } from "lucide-react";
import { useState } from "react";

export function CommentsPanel() {
  const { pages, updateElement, setCurrentPage } = useEditorStore();
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const allComments: Array<{ el: CommentElement; pageIdx: number }> = [];
  for (let pi = 0; pi < pages.length; pi++) {
    for (const el of pages[pi].elements) {
      if (el.type === "comment") {
        allComments.push({ el: el as CommentElement, pageIdx: pi });
      }
    }
  }

  function addReply(id: string, text: string) {
    if (!text.trim()) return;
    const existing = pages
      .flatMap((p) => p.elements)
      .find((e) => e.id === id) as CommentElement | undefined;
    if (!existing) return;
    updateElement(
      id,
      {
        replies: [
          ...existing.replies,
          { author: "You", text, timestamp: Date.now() },
        ],
      },
      true,
    );
    setReplyText((prev) => ({ ...prev, [id]: "" }));
  }

  function toggleResolved(el: CommentElement) {
    updateElement(el.id, { resolved: !el.resolved }, true);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <MessageSquare size={14} className="text-muted-foreground" />
        <span className="text-xs font-medium">
          Comments ({allComments.length})
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {allComments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No comments
            </p>
          )}
          {allComments.map(({ el, pageIdx }, idx) => (
            <div
              key={el.id}
              data-ocid={`comments.item.${idx + 1}`}
              className={`border rounded-lg p-2 text-xs space-y-1 transition-colors ${
                el.resolved
                  ? "opacity-50 border-border"
                  : "border-primary/30 bg-primary/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="font-medium text-left w-full cursor-pointer"
                  onClick={() => setCurrentPage(pageIdx)}
                >
                  {el.author} — Page {pageIdx + 1}
                </button>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">
                    {new Date(el.timestamp).toLocaleTimeString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleResolved(el)}
                    className={`p-0.5 rounded ${
                      el.resolved
                        ? "text-green-500"
                        : "text-muted-foreground hover:text-green-500"
                    }`}
                    title={el.resolved ? "Unresolve" : "Resolve"}
                  >
                    <Check size={12} />
                  </button>
                </div>
              </div>
              <p className="text-foreground/80">{el.text}</p>

              {el.replies.length > 0 && (
                <div className="pl-2 border-l border-border space-y-1 mt-1">
                  {el.replies.map((r, j) => (
                    <div key={`${el.id}-reply-${j}`}>
                      <span className="font-medium mr-1">{r.author}:</span>
                      <span>{r.text}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-1 mt-1">
                <Input
                  value={replyText[el.id] || ""}
                  onChange={(e) =>
                    setReplyText((p) => ({ ...p, [el.id]: e.target.value }))
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" && addReply(el.id, replyText[el.id] || "")
                  }
                  placeholder="Reply..."
                  className="h-6 text-xs"
                  data-ocid="comments.reply.input"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => addReply(el.id, replyText[el.id] || "")}
                >
                  Send
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
