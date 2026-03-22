import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  };

  const active = !disabled && text.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="chat-input-form">
      <div className="chat-input-wrapper">
        <span className="chat-input-prompt">{">"}</span>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); handleInput(); }}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Generating response..." : "Ask a question..."}
          disabled={disabled}
          maxLength={2048}
          rows={1}
          className="chat-input-textarea"
        />
        <button
          type="submit"
          disabled={!active}
          className={`chat-input-send ${active ? "active" : ""}`}
          aria-label="Send"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <style>{`
        .chat-input-form {
          width: 100%;
        }
        .chat-input-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 0;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 4px 6px 4px 14px;
          transition: border-color 0.15s;
        }
        .chat-input-wrapper:focus-within {
          border-color: var(--accent);
        }
        .chat-input-prompt {
          font-family: var(--font-mono);
          color: var(--accent);
          font-size: 15px;
          line-height: 40px;
          user-select: none;
          flex-shrink: 0;
        }
        .chat-input-textarea {
          flex: 1;
          background: none;
          border: none;
          color: var(--text-bright);
          font-family: var(--font-body);
          font-size: 14.5px;
          line-height: 1.5;
          padding: 9px 8px;
          resize: none;
          outline: none;
          min-height: 40px;
          max-height: 160px;
        }
        .chat-input-textarea::placeholder {
          color: var(--text-dim);
        }
        .chat-input-textarea:disabled {
          opacity: 0.5;
        }
        .chat-input-send {
          flex-shrink: 0;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: var(--text-dim);
          border: none;
          border-radius: 4px;
          cursor: default;
          margin-bottom: 3px;
          transition: all 0.15s;
        }
        .chat-input-send.active {
          background: var(--accent);
          color: var(--bg);
          cursor: pointer;
        }
        .chat-input-send.active:hover {
          filter: brightness(1.1);
        }
      `}</style>
    </form>
  );
}
