"use client";

import { useFormStatus } from "react-dom";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Drop-in replacement for <button type="submit"> that shows a spinner and
 * blocks double-clicks while the Server Action is processing.
 */
export function SubmitButton({ children, className = "", disabled, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
      {...props}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <svg
            className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
