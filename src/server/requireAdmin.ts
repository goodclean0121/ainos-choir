import "server-only";
import { redirect } from "next/navigation";
import { getAdmin, type Admin } from "./admin";

export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
