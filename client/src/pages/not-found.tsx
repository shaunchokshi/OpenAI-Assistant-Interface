import React from "react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-xl mb-8">The page you are looking for does not exist.</p>
      <Link href="/">
        <a className="bg-primary text-white px-6 py-3 rounded-md hover:bg-primary/90 transition-colors">
          Return to Home
        </a>
      </Link>
    </div>
  );
}