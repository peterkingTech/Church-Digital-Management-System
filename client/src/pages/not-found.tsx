import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center text-center p-8 max-w-md">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6 text-destructive">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold font-display text-foreground mb-4">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          We couldn't find the page you were looking for. It might have been removed or doesn't exist.
        </p>
        <Link href="/">
          <Button className="btn-primary rounded-xl px-8">Return Home</Button>
        </Link>
      </div>
    </div>
  );
}
