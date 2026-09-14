import Link from "next/link";
import type { ComponentProps } from "react";

type ActionLinkProps = ComponentProps<typeof Link> & {
  variant?: "primary" | "secondary" | "text";
};

export function ActionLink({ className = "", variant = "primary", ...props }: ActionLinkProps) {
  return <Link className={`action-link action-link--${variant} ${className}`.trim()} {...props} />;
}
