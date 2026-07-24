import { headers } from "next/headers";
import { AuthForm } from "@/components/auth-form";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { MapView } from "@/components/map-view";
import { auth } from "@/composition/auth";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return <AuthForm />;
  }

  return (
    <AuthenticatedShell
      user={{ email: session.user.email, name: session.user.name }}
    >
      <MapView />
    </AuthenticatedShell>
  );
}
