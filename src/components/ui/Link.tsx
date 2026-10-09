import { createLink, type LinkComponent } from "@tanstack/react-router";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
} from "react";

type LinkVariant = "text" | "surface" | "control";

type LinkStyleProps = {
  variant?: LinkVariant;
};

const variantClassNames: Record<LinkVariant, string> = {
  text: "c-link c-link--text",
  surface: "c-link c-link--surface",
  control: "c-link c-link--control",
};

function getLinkClassName({
  variant = "text",
  className,
}: LinkStyleProps & { className?: string }) {
  return [variantClassNames[variant], className].filter(Boolean).join(" ");
}

type AppLinkBaseProps = ComponentPropsWithoutRef<"a"> & LinkStyleProps;

const AppLinkBase = forwardRef<HTMLAnchorElement, AppLinkBaseProps>(
  function AppLinkBase({ variant, className, ...props }, ref) {
    return (
      <a
        {...props}
        ref={ref}
        className={getLinkClassName({ variant, className })}
      />
    );
  },
);

const CreatedAppLink = createLink(AppLinkBase);

export const AppLink: LinkComponent<typeof AppLinkBase> = (props) => (
  <CreatedAppLink {...props} />
);

export type AnchorLinkProps = ComponentPropsWithRef<"a"> & LinkStyleProps;

export function AnchorLink({ variant, className, ...props }: AnchorLinkProps) {
  return <a {...props} className={getLinkClassName({ variant, className })} />;
}
