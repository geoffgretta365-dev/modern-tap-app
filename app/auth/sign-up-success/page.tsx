import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="w-full">
      <div className="w-full">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Thank you for signing up!
              </CardTitle>
              <CardDescription>Check your email to confirm</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You&apos;ve successfully signed up. Please check your email to
                confirm your account and continue to business setup. Open the link in the same browser where you signed up.
              </p>
            <p className="mt-4 text-sm"><Link className="font-semibold text-[#0f766e] underline" href="/auth/login">Already confirmed? Sign in</Link></p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
