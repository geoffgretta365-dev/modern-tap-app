import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { authEmailRedirect } from "@/lib/auth-redirects";

export default function Page() {
  return <ForgotPasswordForm emailRedirectTo={authEmailRedirect("recovery")} />;
}
