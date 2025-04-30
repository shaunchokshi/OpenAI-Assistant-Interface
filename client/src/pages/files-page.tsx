import React from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import FileManager from "@/components/files/FileManager";

export default function FilesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-6 bg-background">
          <div className="max-w-6xl mx-auto">
            <FileManager />
          </div>
        </main>
      </div>
    </div>
  );
}