import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="mb-8 flex items-center">
        <Link href="/">
          <Button variant="outline" size="sm" className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Terms of Use</h1>
      </div>

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <h2>Acceptance of Terms</h2>
        <p>
          By accessing or using the CeeK OpenAI API Assistant ("the Service"), you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use the Service.
        </p>

        <h2>Description of Service</h2>
        <p>
          CeeK OpenAI API Assistant is a web application that provides users with tools to interact with OpenAI's API and assistants, create and manage assistants, upload files, and facilitate conversational AI experiences.
        </p>

        <h2>User Accounts</h2>
        <p>
          To use the Service, you must create an account with a valid email address and password or use third-party authentication providers like Google or GitHub. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.
        </p>
        <p>
          Users who authenticate via Single Sign-On (Google and GitHub) are subject to the data collection and privacy policies of those providers in addition to these terms.
        </p>

        <h2>API Keys and User Data</h2>
        <p>
          The Service requires users to provide their own OpenAI API key to function. You are responsible for keeping your API key secure and managing your usage costs directly with OpenAI. We do not bear responsibility for charges incurred on your OpenAI account through your use of the Service.
        </p>

        <h2>Content and Conduct</h2>
        <p>
          You retain ownership of any content you create or upload through the Service. However, you agree not to use the Service to:
        </p>
        <ul>
          <li>Violate any laws or regulations</li>
          <li>Infringe on the intellectual property rights of others</li>
          <li>Create, upload, or share content that is harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable</li>
          <li>Attempt to gain unauthorized access to the Service or its related systems</li>
          <li>Use the Service in a manner that could damage, disable, or impair the functioning of the Service</li>
        </ul>

        <h2>OpenAI Policies</h2>
        <p>
          As this Service interfaces with OpenAI's API, all users are subject to OpenAI's own terms, policies, and usage guidelines, which can be found on OpenAI's website. Any content generated through our Service using OpenAI's models must comply with OpenAI's content policies.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          The code for this app is available under the terms of the MIT License at the GitHub repository <a href="https://github.com/shaunchokshi/OpenAI-Assistant-Interface" target="_blank" rel="noopener noreferrer">https://github.com/shaunchokshi/OpenAI-Assistant-Interface</a>. The license does not include any rights to any brand assets or any other assets of CK Services LLC and/or any trade names, subsidiaries, etc. of CK Services LLC.
        </p>
        <p>
          The copyright holder of the app is CK Services LLC d.b.a. CK Consulting, a registered business in Maryland, United States of America. For any inquiries or data requests, please contact admin@ckservicesllc.com.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we disclaim all warranties, expressed or implied, including but not limited to implied warranties of merchantability and fitness for a particular purpose.
        </p>
        <p>
          We shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages resulting from your use of the Service or inability to use the Service.
        </p>

        <h2>Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless CK Consulting LTD, its officers, directors, employees, and agents from any claims, damages, or expenses (including reasonable attorney fees) arising from your use of the Service, your violation of these Terms, or your violation of any rights of a third party.
        </p>

        <h2>Modification of Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. Updated terms will be posted on the Service, and your continued use of the Service after such changes constitutes your acceptance of the modified Terms.
        </p>

        <h2>Termination</h2>
        <p>
          We reserve the right to terminate or suspend your account and access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users of the Service, us, or third parties, or for any other reason.
        </p>

        <h2>Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which CK Consulting LTD operates, without regard to its conflict of law provisions.
        </p>

        <h2>Contact Information</h2>
        <p>
          If you have any questions about these Terms, please contact us at admin@ckconsulting.ltd.
        </p>

        <div className="mt-8 text-sm text-gray-500">
          Last updated: May 17, 2025
        </div>
      </div>
    </div>
  );
}
