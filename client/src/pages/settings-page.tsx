import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import AssistantConfig from "@/components/settings/AssistantConfig";

export default function SettingsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-6 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Settings</h1>
            <AssistantConfig />
          </div>
        </main>
      </div>
    </div>
  );
}
