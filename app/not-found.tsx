'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppLayout } from './app-layout';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <AppLayout>
      <div className="container py-20">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-8">
            <h1 className="text-9xl font-bold text-muted-foreground">404</h1>
            <h2 className="text-2xl font-semibold mt-4 mb-2">Page Not Found</h2>
            <p className="text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => window.history.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Link href="/">
              <Button>
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
