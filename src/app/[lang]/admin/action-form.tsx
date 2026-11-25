"use client";

import { useActionState } from "react";
import type { ActionState } from "./action-state";

export type FormMessages = {
  errors: Record<string, string>; // code -> text; may contain {taken}
  fields: Record<string, string>; // field key -> label
  day: string;
  saved: string;
};

/** "title.ru" -> "Title (RU)"; "itinerary.3.title.ky" -> "Day 3: Day title (KY)". */
function fieldLabel(key: string, m: FormMessages) {
  const parts = key.split(".");
  const lang = (s?: string) => (s && ["en", "ru", "ky"].includes(s) ? ` (${s.toUpperCase()})` : "");
  if (parts[0] === "itinerary") return `${m.day} ${parts[1]}: ${m.fields[parts[2]] ?? parts[2]}${lang(parts[3])}`;
  return `${m.fields[parts[0]] ?? parts[0]}${lang(parts[1])}`;
}

export function ActionForm({
  action,
  messages,
  className,
  children,
  showSaved = true,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  messages: FormMessages;
  className?: string;
  children: React.ReactNode;
  showSaved?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const text = state?.error
    ? (messages.errors[state.error] ?? state.error).replace("{taken}", String(state.taken ?? ""))
    : null;
  return (
    <form action={formAction} className={className} aria-busy={pending}>
      {children}
      {text && (
        <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">
          {text}
          {state?.fields?.length ? `: ${state.fields.map((f) => fieldLabel(f, messages)).join(", ")}` : ""}
        </p>
      )}
      {showSaved && state?.ok && <p role="status" className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">{messages.saved}</p>}
    </form>
  );
}
