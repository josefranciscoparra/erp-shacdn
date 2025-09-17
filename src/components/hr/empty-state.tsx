import { Button } from "@/components/ui/button";
import Link from "next/link";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({ icon, title, description, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-12 text-muted-foreground">
      {icon ? <div className="mb-4 text-muted-foreground/50">{icon}</div> : null}
      <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">{title}</h3>
      {description ? <p className="mb-4 max-w-prose">{description}</p> : null}
      {actionHref && actionLabel ? (
        <Button asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

