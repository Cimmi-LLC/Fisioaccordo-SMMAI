import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center text-primary hover:text-primary/80 mb-8 text-sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to App
        </Link>

        <div className="bg-card rounded-lg border border-border p-8 space-y-8">
          <div className="flex items-center gap-3 justify-center">
            <FileText className="h-8 w-8 text-primary" />
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
              <p className="text-muted-foreground mt-2">Last updated: March 3, 2026</p>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Service Description</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              POST PER I SOCIAL 2-IG ("the Service") is a social media content generation platform 
              operated by Cimmi LLC. The Service allows users to create, manage, and publish content 
              to social media platforms including Instagram and Facebook through the Meta API integration.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Eligibility and Requirements</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              To use the Service, you must:
            </p>
            <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1 ml-2">
              <li>Be at least 18 years old</li>
              <li>Have a valid Instagram Business or Creator account linked to a Facebook Page (for publishing features)</li>
              <li>Create an account with a valid email address</li>
              <li>Comply with Meta's Platform Terms and Community Guidelines</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. User Responsibilities</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You are solely responsible for the content you create and publish through the Service. 
              You agree not to use the Service to generate or distribute content that is illegal, 
              harmful, threatening, abusive, defamatory, or otherwise objectionable. You must comply 
              with all applicable laws and the terms of service of any connected social media platforms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Intellectual Property</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The Service, including its design, features, and underlying technology, is the exclusive 
              property of Cimmi LLC. Copying, reproduction, reverse engineering, or replication of any 
              part of the platform without prior written authorization is strictly prohibited. Content 
              you create using the Service remains your property.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. API Integrations</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The Service integrates with third-party APIs, including the Meta Graph API. We are not 
              responsible for changes to third-party APIs that may affect the functionality of the Service. 
              Your use of connected platforms is subject to their respective terms of service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Limitation of Liability</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The Service is provided "as is" without warranties of any kind, either express or implied. 
              Cimmi LLC shall not be liable for any indirect, incidental, special, consequential, or 
              punitive damages arising from your use of the Service, including but not limited to loss 
              of data, loss of revenue, or interruption of service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Account Termination</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We reserve the right to suspend or terminate your account at any time if you violate these 
              Terms of Service. You may also delete your account at any time by contacting us. Upon 
              termination, your data will be handled in accordance with our Privacy Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">8. Changes to Terms</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We may update these Terms of Service from time to time. Continued use of the Service 
              after changes constitutes acceptance of the updated terms. We will notify users of 
              significant changes via email or through the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">9. Contact</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              For questions about these Terms, contact us at:{' '}
              <a href="mailto:privacy@fisioaccordo.com" className="text-primary hover:underline">privacy@fisioaccordo.com</a>
            </p>
          </section>

          <div className="pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Cimmi LLC. All rights reserved. |{' '}
              <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
