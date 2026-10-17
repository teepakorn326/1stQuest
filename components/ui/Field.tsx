import clsx from "clsx";

export const inputClass =
  "w-full h-[52px] px-4 rounded-[14px] border-[1.5px] border-field bg-surface text-[17px] text-ink placeholder:text-ink-3/70 focus:border-primary focus:outline-none";

export function Label({ htmlFor, children, className }: { htmlFor?: string; children: React.ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={clsx("text-base font-bold", className)}>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(inputClass, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "w-full px-4 py-3 rounded-[14px] border-[1.5px] border-field bg-surface text-base leading-snug text-ink resize-none focus:border-primary focus:outline-none",
        props.className,
      )}
    />
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="m-0 rounded-[14px] bg-warm px-4 py-3 text-[15px] text-warm-ink">
      {message}
    </p>
  );
}
