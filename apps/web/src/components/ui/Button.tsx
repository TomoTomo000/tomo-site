import type { ComponentPropsWithRef } from "react";
type Props = ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
};
export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  ...props
}: Props) {
  return (
    <button
      {...props}
      type={type}
      className={[
        "c-button",
        "c-button--" + variant,
        "c-button--" + size,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
