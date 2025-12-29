import Link from 'next/link';
import { Shield, Cloud, Lock, TrendingUp, CheckCircle, Zap } from 'lucide-react';

// Force dynamic rendering for this page to work with standalone mode
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Cloud Copilot</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-8">
            <Zap className="h-4 w-4" />
            Multi-Cloud Governance Platform
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Secure Your Cloud
            <span className="text-primary"> Infrastructure</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Enterprise-grade governance, security, and compliance across AWS, Azure, and GCP.
            Monitor, audit, and protect your multi-cloud environment from a single platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-primary text-primary-foreground rounded-lg text-lg font-semibold hover:opacity-90 transition-opacity inline-flex items-center justify-center"
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 border-2 border-border rounded-lg text-lg font-semibold hover:bg-accent/10 transition-colors inline-flex items-center justify-center"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need for Cloud Security
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive security and governance tools designed for modern cloud infrastructure
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Cloud className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Multi-Cloud Support</h3>
            <p className="text-muted-foreground">
              Unified management for AWS, Azure, and GCP from a single dashboard. Connect all your cloud accounts seamlessly.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Security Posture</h3>
            <p className="text-muted-foreground">
              Continuous monitoring and assessment of your security posture with real-time alerts and recommendations.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Compliance Management</h3>
            <p className="text-muted-foreground">
              Automated compliance checks for SOC 2, HIPAA, PCI-DSS, and more. Generate audit reports instantly.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-warning" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Cost Optimization</h3>
            <p className="text-muted-foreground">
              Identify unused resources, optimize spending, and get recommendations to reduce cloud costs by up to 40%.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-info/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-info" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Audit Logging</h3>
            <p className="text-muted-foreground">
              Complete audit trail of all activities with advanced search and filtering. Meet regulatory requirements.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Alerts</h3>
            <p className="text-muted-foreground">
              Real-time notifications for security incidents, policy violations, and critical events via email and Slack.
            </p>
          </div>
        </div>
      </section>

      {/* Cloud Providers Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Works With Your Cloud Providers
          </h2>
          <p className="text-lg text-muted-foreground">
            Seamless integration with the world's leading cloud platforms
          </p>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20">
          <div className="text-center">
            <div className="text-6xl mb-2">☁️</div>
            <div className="text-sm font-medium text-muted-foreground">Amazon AWS</div>
          </div>
          <div className="text-center">
            <div className="text-6xl mb-2">🔷</div>
            <div className="text-sm font-medium text-muted-foreground">Microsoft Azure</div>
          </div>
          <div className="text-center">
            <div className="text-6xl mb-2">🌐</div>
            <div className="text-sm font-medium text-muted-foreground">Google Cloud</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-2xl p-12 md:p-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Secure Your Cloud?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of companies that trust Cloud Copilot to manage their cloud security and governance
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground rounded-lg text-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Start Your Free Trial
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-bold">Cloud Copilot</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Enterprise cloud governance and security platform
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/login" className="hover:text-primary">Features</Link></li>
                <li><Link href="/login" className="hover:text-primary">Pricing</Link></li>
                <li><Link href="/login" className="hover:text-primary">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/login" className="hover:text-primary">About</Link></li>
                <li><Link href="/login" className="hover:text-primary">Blog</Link></li>
                <li><Link href="/login" className="hover:text-primary">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/login" className="hover:text-primary">Privacy</Link></li>
                <li><Link href="/login" className="hover:text-primary">Terms</Link></li>
                <li><Link href="/login" className="hover:text-primary">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground">
            © 2025 Cloud Governance Copilot. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
