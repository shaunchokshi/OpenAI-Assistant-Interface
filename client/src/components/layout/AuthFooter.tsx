import React from "react";
import { Link } from "wouter";

export default function AuthFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-4 text-center lg:text-left lg:absolute lg:bottom-0 lg:left-0 lg:right-0 lg:w-1/2">
      <div className="px-6">
        <div className="flex flex-col lg:flex-row lg:justify-between items-center">
          <div className="mb-2 lg:mb-0">
            <p className="text-xs text-gray-400">
              © {currentYear} CK Consulting LTD
            </p>
          </div>
          <div className="flex space-x-4">
            <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-300 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-300 transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}