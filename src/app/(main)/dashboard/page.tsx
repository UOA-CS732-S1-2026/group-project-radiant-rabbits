import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Dashboard from "@/components/ui/dashboard";
import PageContainer from "@/components/ui/PageContainer";

export default async function DashboardPage() {
  const session = await getServerSession(options);

  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="mt-6 mx-5 mb-6 border-2 border-gray-200 border-spacing-2 rounded-lg shadow-lg">
      <Dashboard />
    </div>
  );
}
