import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center text-primary hover:text-primary/80 mb-8 text-sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to App
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground">
          <p className="text-sm">Last updated: March 3, 2026</p>

          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p>
              This Privacy Policy describes how <strong className="text-foreground">FisioAccordo Social Content AI</strong> 
              (the "App"), developed and operated by <strong className="text-foreground">Cimmi LLC</strong> ("we", "us", "our"), 
              collects, uses, stores, and protects your personal data when you use our application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Data We Collect</h2>
            <p>When you use the App and connect your Instagram Business or Facebook account, we collect and store the following data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Account information:</strong> Your email address, first name, last name, and clinic/studio name provided during registration.</li>
              <li><strong className="text-foreground">Instagram username:</strong> Your Instagram Business account username.</li>
              <li><strong className="text-foreground">Access tokens:</strong> OAuth access tokens provided by Meta (Instagram/Facebook) to authorize publishing on your behalf.</li>
              <li><strong className="text-foreground">Published content:</strong> Text and image content that you create and publish through the App.</li>
              <li><strong className="text-foreground">Facebook Page information:</strong> Page ID and Page name associated with your Instagram Business account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Data</h2>
            <p>Your data is used exclusively for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Content creation:</strong> To generate AI-powered social media posts based on your inputs.</li>
              <li><strong className="text-foreground">Publishing:</strong> To publish content directly to your connected Instagram Business and/or Facebook Page on your behalf.</li>
              <li><strong className="text-foreground">Account management:</strong> To manage your connection to Instagram/Facebook and allow you to disconnect at any time.</li>
            </ul>
            <p>We do <strong className="text-foreground">not</strong> sell, share, or transfer your data to third parties for advertising or any other purpose.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Data Storage</h2>
            <p>
              All data is stored securely on <strong className="text-foreground">Supabase</strong>, a cloud infrastructure platform with 
              enterprise-grade security, including encryption at rest and in transit. Access tokens are stored in a secure database 
              with Row Level Security (RLS) policies ensuring that only you can access your own data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. When you disconnect your Instagram/Facebook account, 
              the associated access tokens are immediately deleted from our database. Generated content is retained until you 
              delete it or request account deletion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Data Deletion</h2>
            <p>You can request deletion of your data at any time through the following methods:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Disconnect account:</strong> Use the "Disconnect" button in the App to immediately remove your Instagram/Facebook connection and associated tokens.</li>
              <li><strong className="text-foreground">Email request:</strong> Contact us at <a href="mailto:privacy@cimmillc.com" className="text-primary hover:underline">privacy@cimmillc.com</a> to request complete deletion of all your data, including your account and all generated content.</li>
            </ul>
            <p>We will process deletion requests within 30 days of receipt.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Third-Party Services</h2>
            <p>The App integrates with the following third-party services:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-foreground">Meta (Instagram/Facebook):</strong> For OAuth authentication and content publishing. Subject to <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta's Privacy Policy</a>.</li>
              <li><strong className="text-foreground">Supabase:</strong> For secure data storage and authentication. Subject to <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Supabase's Privacy Policy</a>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Your Rights</h2>
            <p>Under applicable data protection laws (including GDPR), you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent at any time</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Contact Us</h2>
            <p>
              For any questions or requests regarding this Privacy Policy or your personal data, please contact us at:
            </p>
            <p className="text-foreground">
              <strong>Cimmi LLC</strong><br />
              Email: <a href="mailto:privacy@cimmillc.com" className="text-primary hover:underline">privacy@cimmillc.com</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
          © 2024 Cimmi LLC. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Privacy;
