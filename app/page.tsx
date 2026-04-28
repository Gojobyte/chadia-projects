import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Bienvenue, {session.user.name}
        </h1>
        <p className="text-slate-500 mb-8">Role : {session.user.role}</p>

        <div className="bg-white rounded-xl shadow p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">CHADIA Projects</h2>
          <p className="text-slate-600">Le dashboard arrive dans l&apos;Epic 2. Pour l&apos;instant, l&apos;infrastructure est en place !</p>
        </div>
      </div>
    </div>
  );
}
