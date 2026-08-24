import { redirect } from "next/navigation";

/** La antigua ruta /about ahora es una sección de la home. */
export default function AboutPage(): never {
  redirect("/#about");
}
