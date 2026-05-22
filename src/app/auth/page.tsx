import { AuthClient } from "@/components/AuthClient";
import { Suspense } from "react";

export default function AuthPage() {
  return (
    <Suspense fallback={<section className="panel narrow"><p>Loading sign-in...</p></section>}>
      <AuthClient />
    </Suspense>
  );
}
