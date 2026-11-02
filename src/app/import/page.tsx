import { redirect } from "next/navigation";

/** Importing is an admin task now; it lives at /admin/new. */
export default function ImportPage() {
  redirect("/admin/new");
}
