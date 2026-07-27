"use client";

import { Button } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
  confirmMessage: string;
} & VariantProps<typeof buttonVariants>;

/**
 * A submit button that asks for confirmation before allowing its parent form
 * to submit. Used for destructive admin actions (delete service / barber).
 */
export function ConfirmButton({ children, confirmMessage, variant, size }: Props) {
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </Button>
  );
}
