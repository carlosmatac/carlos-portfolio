import { redirect } from "next/navigation";

/** Contacto ya no tiene página propia: vive dentro de About. */
export default function ContactPage(): never {
  redirect("/#about");
}
