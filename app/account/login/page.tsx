import { CustomerSignInForm } from "@/components/customer/CustomerSignInForm";

export default function CustomerLoginPage() {
  return <CustomerSignInForm nextPath="/library" heading="Sign in to your library" intro="Use the email from your checkout. We will send a secure, passwordless sign-in link." backHref="/library" backLabel="Back to Library" />;
}
