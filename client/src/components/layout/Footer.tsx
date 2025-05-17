import React from "react";
import { Link } from "wouter";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-6 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-gray-400">
              © {currentYear} CK Consulting LTD. All rights reserved.
            </p>
          </div>
          <div className="flex space-x-6">
            <Link href="/terms">
              <a className="text-sm text-gray-400 hover:text-white transition-colors">
                Terms of Use
              </a>
            </Link>
            <Link href="/privacy">
              <a className="text-sm text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </a>
            </Link>
            <a 
              href="https://openai.com/policies" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              OpenAI Policies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}