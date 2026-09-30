import { AuthDoor } from "@/components/AuthDoor";

/** One way in for everyone: new people are signed up, returning people signed in (components/AuthDoor.tsx). */
export default function Page() {
  return <AuthDoor path="/sign-in" />;
}
