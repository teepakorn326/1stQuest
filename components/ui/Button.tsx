import Link from "next/link";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary: "bg-cta text-cta-ink hover:bg-cta-hover disabled:opacity-60",
  secondary: "bg-surface text-primary border-[1.5px] border-field hover:border-primary disabled:opacity-60",
  ghost: "bg-transparent text-primary hover:text-primary-hover",
};

const shape = "inline-flex items-center justify-center gap-2.5 rounded-[14px] font-bold text-[17px] min-h-[52px] px-5 no-underline transition-colors";

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={clsx(shape, styles[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  href,
  children,
}: {
  variant?: Variant;
  className?: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={clsx(shape, styles[variant], variant === "primary" ? "hover:text-cta-ink" : "hover:text-primary-hover", className)}>
      {children}
    </Link>
  );
}
