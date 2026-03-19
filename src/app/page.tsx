import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          InnerCircle
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          A small-circle social platform. Share moments with your closest
          friends, pinned to the places they happened.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/login">Sign In</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/register">Create Account</Link>
        </Button>
      </div>
    </div>
  );
}
