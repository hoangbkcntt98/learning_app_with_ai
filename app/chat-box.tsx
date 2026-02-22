"use client";

import { type ClipboardEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS, type SupportedLanguage } from "@/lib/language";

type ChatMessage = {
  id: number | string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

export function ChatBox() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [responseLanguage, setResponseLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const selectedImagePreviewUrl = useMemo(
    () => (selectedImage ? URL.createObjectURL(selectedImage) : null),
    [selectedImage],
  );

  useEffect(() => {
    return () => {
      if (selectedImagePreviewUrl) {
        URL.revokeObjectURL(selectedImagePreviewUrl);
      }
    };
  }, [selectedImagePreviewUrl]);

  function handlePromptPaste(event: ClipboardEvent<HTMLInputElement>) {
    const items = event.clipboardData?.items;
    if (!items?.length) {
      return;
    }

    for (const item of Array.from(items)) {
      if (!item.type.startsWith("image/")) {
        continue;
      }

      const file = item.getAsFile();
      if (!file) {
        continue;
      }

      const extension = file.type.split("/")[1] || "png";
      const namedFile = new File([file], `pasted-image.${extension}`, {
        type: file.type,
      });
      setSelectedImage(namedFile);
      return;
    }
  }

  useEffect(() => {
    async function loadHistory() {
      setError("");
      setIsLoadingHistory(true);
      try {
        const response = await fetch("/api/ai/chat?limit=100&source=ai_chat");
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          setError(body.error ?? "Failed to load chat history.");
          return;
        }

        const body = (await response.json()) as { messages?: ChatMessage[] };
        setMessages(body.messages ?? []);
      } catch {
        setError("Failed to load chat history.");
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadHistory();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if ((!trimmedPrompt && !selectedImage) || isLoading) {
      return;
    }
    await sendChatRequest({
      promptText: trimmedPrompt,
      image: selectedImage,
      language: responseLanguage,
    });
  }

  async function sendChatRequest(params: {
    promptText: string;
    image: File | null;
    // Reuse the shared language union type used by the language selector.
    language: SupportedLanguage;
  }) {
    setError("");
    setIsLoading(true);
    const imageInfo = params.image ? `[Image attached: ${params.image.name}]` : "";
    const optimisticText = imageInfo
      ? `${params.promptText || "Please analyze this image."}\n${imageInfo}`
      : params.promptText;
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      role: "user",
      text: optimisticText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setPrompt("");
    setSelectedImage(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }

    try {
      const formData = new FormData();
      formData.append("prompt", params.promptText);
      formData.append("language", params.language);
      formData.append("source", "ai_chat");
      if (params.image) {
        formData.append("image", params.image);
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Chat request failed.");
        return;
      }

      const body = (await response.json()) as { messages?: ChatMessage[] };
      if (!body.messages || body.messages.length === 0) {
        setError("No response returned.");
        return;
      }
      // Freeze validated messages so TypeScript keeps the non-undefined narrowing.
      const receivedMessages = body.messages;
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((message) => message.id !== optimisticId);
        return [...withoutOptimistic, ...receivedMessages];
      });
    } catch {
      setError("Failed to reach chat service.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-black/10 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60">AI chat</h2>
      <p className="mt-2 text-sm text-black/70">Ask for hints, explanations, or practice questions.</p>

      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-lg border border-black/10 bg-black/[0.02] p-3">
        {isLoadingHistory ? (
          <p className="text-sm text-black/60">Loading chat history...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-black/60">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg px-3 py-2 text-sm ${
                message.role === "user" ? "bg-blue-100 text-blue-950" : "bg-white border border-black/10"
              }`}
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-black/55">
                {message.role === "user" ? "You" : "Assistant"}
              </p>
              <p className="whitespace-pre-wrap">{message.text}</p>
            </div>
          ))
        )}
        {isLoading ? <p className="text-sm text-blue-700">Thinking...</p> : null}
      </div>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <form onSubmit={handleSubmit} className="mt-3 space-y-2">
        <div className="flex items-end gap-2">
          <label className="flex min-w-48 flex-col text-xs">
            <span className="mb-1 font-medium text-black/70">Your language</span>
            <select
              value={responseLanguage}
              onChange={(event) =>
                setResponseLanguage(event.target.value as SupportedLanguage)
              }
              className="rounded-lg border border-black/20 bg-white px-3 py-2 text-sm"
              disabled={isLoading || isLoadingHistory}
            >
              {LANGUAGE_OPTIONS.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            disabled={isLoading || isLoadingHistory}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setSelectedImage(file);
            }}
            className="hidden"
            id="ai-chat-image-upload"
          />
          <label
            htmlFor="ai-chat-image-upload"
            className="cursor-pointer rounded-lg border border-black/20 bg-white px-3 py-2 text-xs font-medium text-black transition hover:bg-black/[0.04]"
          >
            Choose File
          </label>
          <p className="text-xs text-black/60">
            {selectedImage ? selectedImage.name : "No file selected"}
          </p>
        </div>
        {selectedImage ? (
          <div className="space-y-2">
            <p className="text-xs text-black/60">
              Selected: <strong>{selectedImage.name}</strong> ({Math.ceil(selectedImage.size / 1024)} KB)
            </p>
            {selectedImagePreviewUrl ? (
              <div className="relative w-fit">
                <Image
                  src={selectedImagePreviewUrl}
                  alt="Selected preview"
                  width={320}
                  height={240}
                  unoptimized
                  className="max-h-40 w-auto rounded-lg border border-black/15"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    if (imageInputRef.current) {
                      imageInputRef.current.value = "";
                    }
                  }}
                  className="mt-2 rounded-md border border-black/20 px-2 py-1 text-xs"
                >
                  Remove image
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onPaste={handlePromptPaste}
            placeholder="Ask something (optionally with image)..."
            maxLength={2000}
            className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            disabled={isLoading || isLoadingHistory}
          />
          <button
            type="submit"
            disabled={isLoading || isLoadingHistory || (!prompt.trim() && !selectedImage)}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
