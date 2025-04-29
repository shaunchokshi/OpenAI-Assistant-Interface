import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import UserTable from "@/components/users/UserTable";

export default function UsersPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-6 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">User Management</h1>
            <UserTable />
          </div>
        </main>
      </div>
    </div>
  );
}
