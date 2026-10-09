import type { ComponentPropsWithRef } from "react";

type IconButtonVariant = "surface" | "ghost";
type IconButtonSize = "sm" | "md";

export type IconButtonProps = Omit<
  ComponentPropsWithRef<"button">,
  "aria-label"
> & {
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
};

const variantClassNames: Record<IconButtonVariant, string> = {
  surface: "c-icon-button--surface",
  ghost: "c-icon-button--ghost",
};

const sizeClassNames: Record<IconButtonSize, string> = {
  sm: "c-icon-button--sm",
  md: "c-icon-button--md",
};

export function IconButton({
  "aria-label": ariaLabel,
  variant = "ghost",
  size = "md",
  type = "button",
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={ariaLabel}
      className={[
        "c-icon-button",
        variantClassNames[variant],
        sizeClassNames[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
