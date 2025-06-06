import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="mb-8 flex items-center">
        <Link href="/">
          <Button variant="outline" size="sm" className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
      </div>

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="lead">
          This Privacy Policy explains how CK Consulting LTD ("we," "our," or "us") collects, uses, and protects your information when you use the CeeK OpenAI API Assistant ("the Service").
        </p>

        <h2>Information We Collect</h2>
        <p>
          We collect only the minimum information necessary to provide you with the Service. This includes:
        </p>
        <ul>
          <li><strong>Account Information:</strong> When you register for an account, we collect your email address and a password. If you use third-party authentication providers (Google or GitHub), we receive basic profile information from these providers as permitted by your privacy settings with them.</li>
          <li><strong>OpenAI API Key:</strong> We store your OpenAI API key to facilitate your use of OpenAI's services through our application. This key is encrypted in our database.</li>
          <li><strong>User-Generated Content:</strong> We store content you create or upload through the Service, including messages, conversations with assistants, and any files you upload.</li>
          <li><strong>Usage Data:</strong> We collect information about how you interact with the Service, such as the features you use and the time spent on the Service.</li>
        </ul>

        <h3>Information We Do Not Collect</h3>
        <p>
          We do not collect any additional personal information beyond what you explicitly provide to us or what is necessary for the functioning of the Service.
        </p>

        <h2>How We Use Your Information</h2>
        <p>
          We use the information we collect for the following purposes:
        </p>
        <ul>
          <li>To provide and maintain the Service</li>
          <li>To authenticate your identity and maintain your account</li>
          <li>To process your requests and interactions with OpenAI's API</li>
          <li>To store your preferences and settings</li>
          <li>To improve and optimize the Service</li>
          <li>To communicate with you about the Service</li>
          <li>To protect the security and integrity of the Service</li>
        </ul>

        <h2>Third-Party Services</h2>
        <p>
          The Service interfaces with several third-party services:
        </p>
        <ul>
          <li><strong>OpenAI:</strong> Your interactions with our Service often involve sending data to OpenAI's API. These interactions are subject to OpenAI's privacy policy and terms of use.</li>
          <li><strong>Authentication Providers:</strong> If you choose to sign in using Google or GitHub, your interaction with these services is governed by their respective privacy policies. We only receive the information these services are configured to share with us.</li>
        </ul>

        <h2>Data Retention</h2>
        <p>
          We retain your data for as long as your account is active or as needed to provide you with the Service. You can request deletion of your account and associated data at any time. However, we may retain certain information as required by law or for legitimate business purposes.
        </p>

        <h2>Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
        </p>

        <h2>Your Rights</h2>
        <p>
          Depending on your location, you may have rights regarding your personal information, including:
        </p>
        <ul>
          <li>The right to access personal information we hold about you</li>
          <li>The right to request correction of inaccurate information</li>
          <li>The right to request deletion of your information</li>
          <li>The right to object to or restrict certain processing of your information</li>
          <li>The right to data portability</li>
        </ul>
        <p>
          To exercise these rights, please contact us using the information provided at the end of this policy.
        </p>

        <h2>Children's Privacy</h2>
        <p>
          The Service is not intended for use by individuals under the age of 16. We do not knowingly collect personal information from children. If we become aware that we have collected personal information from a child without verification of parental consent, we will take steps to remove that information.
        </p>

        <h2>Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and, if the changes are significant, we will provide additional notice such as an email notification. We encourage you to review this Privacy Policy periodically.
        </p>

        <h2>Third-Party Authentication Services</h2>
        <p>
          Users who authenticate via Single Sign-On (Google and GitHub) are subject to the data collection and privacy policies of those providers. We recommend reviewing the privacy policies of these services:
        </p>
        <ul>
          <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
          <li><a href="https://docs.github.com/en/github/site-policy/github-privacy-statement" target="_blank" rel="noopener noreferrer">GitHub Privacy Statement</a></li>
        </ul>

        <h2>OpenAI Policies</h2>
        <p>
          As our Service utilizes OpenAI's API, all users are also subject to OpenAI's policies. You can review OpenAI's privacy policy and terms of use on their website:
        </p>
        <ul>
          <li><a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer">OpenAI Privacy Policy</a></li>
          <li><a href="https://openai.com/policies/terms-of-use" target="_blank" rel="noopener noreferrer">OpenAI Terms of Use</a></li>
        </ul>

        <h2>Contact Us</h2>
        <p>
          If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
        </p>
        <p>
          Email: admin@ckconsulting.ltd
        </p>

        <div className="mt-8 text-sm text-gray-500">
          Last updated: May 17, 2025
        </div>
      </div>
    </div>
  );
}