import { CustomerSignInForm } from "@/components/customer/CustomerSignInForm";

export default function PokopiaFunnelSignInPage() {
  return <CustomerSignInForm nextPath="/pokopia/funnel/start" heading="Sign in to continue your Pokopia journey" intro="Use the customer email from checkout. We will send a secure, passwordless sign-in link and return you to the Pokopia funnel." backHref="/pokopia/funnel/start" backLabel="Back to Pokopia funnel" />;
}
