// TEMPORARY: always redirect to login. Once token persistence exists, check for a saved session and skip to the role's home if logged in.
import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/login" />;
}
