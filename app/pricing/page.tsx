'use client';

import { AppLayout } from '../app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for individual users',
    features: [
      'Instant help chat',
      'Knowledge base access',
      'Community support',
      'Basic troubleshooting',
      '5 tickets per month',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: 'per month',
    description: 'For power users and professionals',
    features: [
      'Everything in Free',
      'Priority support',
      'Screen sharing sessions',
      'Unlimited tickets',
      'Advanced diagnostics',
      '24/7 agent availability',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    description: 'For organizations and teams',
    features: [
      'Everything in Pro',
      'Fleet management dashboard',
      'Custom policies',
      'Dedicated support team',
      'SSO integration',
      'Advanced analytics',
      'SLA guarantees',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <AppLayout>
      <div className="container py-12">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
            <p className="text-lg text-muted-foreground">
              Choose the plan that's right for you. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.popular ? 'border-primary shadow-lg scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period !== 'contact us' && (
                      <span className="text-muted-foreground ml-2">/ {plan.period}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="mt-16 text-center">
            <h2 className="text-2xl font-semibold mb-4">All Plans Include</h2>
            <div className="grid md:grid-cols-4 gap-6 mt-8">
              <Card>
                <CardContent className="pt-6">
                  <p className="font-medium mb-2">Privacy First</p>
                  <p className="text-sm text-muted-foreground">
                    Built-in redaction and data protection
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="font-medium mb-2">Multilingual</p>
                  <p className="text-sm text-muted-foreground">
                    Support in multiple languages
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="font-medium mb-2">Trusted Sources</p>
                  <p className="text-sm text-muted-foreground">
                    Citations and confidence ratings
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="font-medium mb-2">Safe Actions</p>
                  <p className="text-sm text-muted-foreground">
                    Consent-based command execution
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
