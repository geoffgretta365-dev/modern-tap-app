import { SignUpForm } from "@/components/sign-up-form";
import { authEmailRedirect } from "@/lib/auth-redirects";

export default function Page() {
  return <SignUpForm emailRedirectTo={authEmailRedirect("signup")} />;
}
