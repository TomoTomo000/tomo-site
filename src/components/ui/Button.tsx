import { createLink, type LinkComponent } from "@tanstack/react-router";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
} from "react";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "sm" | "md" | "lg";

type ButtonStyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const baseClassName = "c-button";

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "c-button--primary",
  secondary: "c-button--secondary",
};

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "c-button--sm",
  md: "c-button--md",
  lg: "c-button--lg",
};

function getButtonClassName({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleProps & { className?: string }) {
  return [
    baseClassName,
    variantClassNames[variant],
    sizeClassNames[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export type ButtonProps = ComponentPropsWithRef<"button"> & ButtonStyleProps;

export function Button({
  variant,
  size,
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={getButtonClassName({ variant, size, className })}
    />
  );
}

type ButtonLinkBaseProps = ComponentPropsWithoutRef<"a"> & ButtonStyleProps;

const ButtonLinkBase = forwardRef<HTMLAnchorElement, ButtonLinkBaseProps>(
  function ButtonLinkBase({ variant, size, className, ...props }, ref) {
    return (
      <a
        {...props}
        ref={ref}
        className={getButtonClassName({ variant, size, className })}
      />
    );
  },
);

const CreatedButtonLink = createLink(ButtonLinkBase);

export const ButtonLink: LinkComponent<typeof ButtonLinkBase> = (props) => (
  <CreatedButtonLink {...props} />
);
