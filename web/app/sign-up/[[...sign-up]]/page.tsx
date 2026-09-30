import { AuthDoor } from "@/components/AuthDoor";

/** The same way in as /sign-in (components/AuthDoor.tsx): the landing page's "Try it free" buttons lead here. */
export default function Page() {
  return <AuthDoor path="/sign-up" />;
}
