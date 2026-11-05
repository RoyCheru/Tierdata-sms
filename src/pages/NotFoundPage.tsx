import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function NotFoundPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-surface-app">
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist."
        action={
          <Link to="/">
            <Button variant="secondary">Back to dashboard</Button>
          </Link>
        }
      />
    </div>
  );
}
