import { redirect } from "next/navigation";

// La page Notre mission est devenue la home. /mission redirige donc vers /
// pour ne pas casser les liens externes existants.
export default function MissionRedirect(): never {
  redirect("/");
}
