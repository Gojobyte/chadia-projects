"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface Comment {
  id: string;
  contenu: string;
  userId: string;
  userName: string;
  userImage?: string;
  createdAt: Date;
  replies?: Comment[];
}

interface CommentSectionProps {
  documentId?: string;
  taskId?: string;
  projectId: string;
  comments?: Comment[];
  onAddComment?: (content: string, parentId?: string) => void;
}

export function CommentSection({
  comments = [],
  onAddComment,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment?.(newComment);
      setNewComment("");
    }
  };

  const handleReply = (parentId: string) => {
    if (replyContent.trim()) {
      onAddComment?.(replyContent, parentId);
      setReplyContent("");
      setReplyingTo(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* New comment form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Ajouter un commentaire..."
          className="w-full min-h-[80px] p-3 rounded-lg border bg-card text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Commenter
          </button>
        </div>
      </form>

      {/* Comments list */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun commentaire pour le moment
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                  {comment.userName.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{comment.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 mt-0.5 whitespace-pre-wrap">
                    {comment.contenu}
                  </p>
                  <button
                    onClick={() =>
                      setReplyingTo(replyingTo === comment.id ? null : comment.id)
                    }
                    className="text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
                  >
                    Répondre
                  </button>
                </div>
              </div>

              {/* Reply form */}
              {replyingTo === comment.id && (
                <div className="ml-11 flex gap-2">
                  <input
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Votre réponse..."
                    className="flex-1 px-3 py-1.5 text-sm rounded-md border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleReply(comment.id);
                    }}
                  />
                  <button
                    onClick={() => handleReply(comment.id)}
                    disabled={!replyContent.trim()}
                    className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    Envoyer
                  </button>
                </div>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-11 space-y-2">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium shrink-0">
                        {reply.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{reply.userName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(reply.createdAt), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/80 mt-0.5 whitespace-pre-wrap">
                          {reply.contenu}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
