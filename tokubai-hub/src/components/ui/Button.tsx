import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100",
  danger: "inline-flex items-center justify-center rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100",
};

export default function Button({
  variant = "primary",
  fullWidth,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
