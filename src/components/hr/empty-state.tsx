import Link from "next/link";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({ icon, title, description, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className="text-muted-foreground flex flex-col items-center py-12 text-center">
      {icon ? <div className="text-muted-foreground/50 mb-4">{icon}</div> : null}
      <h3 className="text-foreground mb-2 text-base font-semibold sm:text-lg">{title}</h3>
      {description ? <p className="mb-4 max-w-prose">{description}</p> : null}
      {actionHref && actionLabel ? (
        <Button asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
