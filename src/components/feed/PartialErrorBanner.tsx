import { Button } from "@/components/ui/button";

interface PartialErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export function PartialErrorBanner({ message, onRetry }: PartialErrorBannerProps) {
  return (
    <div className="mx-4 mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load more.</p>
        <Button
          variant="secondary"
          size="sm"
          shape="pill"
          onClick={onRetry}
        >
          Retry
        </Button>
      </div>
    </div>
  );
}
