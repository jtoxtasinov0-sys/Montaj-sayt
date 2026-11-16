"use client";

import { Check, Copy, Loader2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormAction } from "@/lib/action-types";
import { cn } from "@/lib/utils";

export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  confirmText,
  hideMessage,
}: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirmText?: string;
  hideMessage?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
      {!hideMessage && state?.message && (
        <p
          key={state.at}
          role="status"
          className={cn(
            "fade-up mt-3 rounded-xl px-3 py-2 text-sm",
            state.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
          )}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({
  children,
  className,
  variant = "primary",
  size,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "ghost" | "danger" | "light";
  size?: "sm" | "lg";
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={cn("btn", `btn-${variant}`, size && `btn-${size}`, className)}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text.replace(/\s/g, ""));
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {}
      }}
    >
      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      {copied ? done : label}
    </button>
  );
}
