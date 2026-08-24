import { redirect } from "next/navigation";

/** La antigua ruta /work ahora es una sección de la home. */
export default function WorkPage(): never {
  redirect("/#work");
}
