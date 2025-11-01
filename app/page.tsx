'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from './app-layout';
import { MessageSquare, Shield, Globe, Zap, CheckCircle2, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <AppLayout>
      <div className="flex flex-col">
        <section className="container py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Get Instant Help for Your Device Issues
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Safe, step-by-step guidance with expert sources. No risky commands.
              <br />
              We prioritize your privacy and security every step of the way.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/help">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8">
                  Start Instant Help
                </Button>
              </Link>
              <Link href="/knowledge">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8">
                  Browse Knowledge Base
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="container py-16 border-t">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose FixMate?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Shield className="h-10 w-10 mb-2 text-primary" />
                  <CardTitle>Safety First</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    We never auto-run commands. Every action requires your explicit consent, protecting your device and data.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CheckCircle2 className="h-10 w-10 mb-2 text-primary" />
                  <CardTitle>Trustworthy Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Every solution includes citations and a confidence meter, so you know exactly where the guidance comes from.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Globe className="h-10 w-10 mb-2 text-primary" />
                  <CardTitle>Multilingual</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Get help in your language. Currently supporting English and Hindi, with more languages coming soon.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Zap className="h-10 w-10 mb-2 text-primary" />
                  <CardTitle>Instant Answers</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Type your issue and get step-by-step guidance immediately. If we can't solve it, reach a human expert easily.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-10 w-10 mb-2 text-primary" />
                  <CardTitle>Privacy Protected</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Built-in redaction tools ensure sensitive information stays private during support sessions.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Users className="h-10 w-10 mb-2 text-primary" />
                  <CardTitle>Enterprise Ready</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Fleet management, custom policies, and comprehensive analytics for organizations of any size.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container py-16 border-t">
          <div className="mx-auto max-w-3xl text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of users who trust FixMate for their device support needs.
            </p>
            <Link href="/help">
              <Button size="lg" className="text-lg px-8">
                Try It Now
              </Button>
            </Link>
          </div>
        </section>

        <footer className="border-t py-8 mt-16">
          <div className="container">
            <p className="text-center text-sm text-muted-foreground">
              MVP Demo - Mock data only. Full backend integration coming soon.
            </p>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
}
