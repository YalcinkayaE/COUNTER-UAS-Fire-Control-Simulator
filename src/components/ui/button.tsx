import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

const variants = {
  primary: "bg-accent text-accent-fg hover:brightness-110",
  secondary: "border border-line bg-surface-2 text-fg hover:bg-surface",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
} as const;

const sizes = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  asChild?: boolean;
  children?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  asChild = false,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = [
    "inline-flex items-center justify-center gap-2 font-mono font-medium",
    "transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    "disabled:pointer-events-none disabled:opacity-40",
    variants[variant],
    sizes[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: [classes, child.props.className].filter(Boolean).join(" "),
      ...props,
    } as never);
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
