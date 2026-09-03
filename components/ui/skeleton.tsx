import { cn } from "@/lib/utils";

/**
 * Minimal loading placeholder. Hand-rolled (not `npx shadcn add skeleton`) — a
 * pulsing block on the DESIGN.md `surface-sunken` token is all any caller needs.
 * Decorative: wrap groups of these in an element that carries the real
 * `aria-busy` / accessible "loading" label.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-sunken", className)}
      {...props}
    />
  );
}

export { Skeleton };
