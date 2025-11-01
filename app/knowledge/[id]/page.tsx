'use client';

import { AppLayout } from '../../app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ThumbsUp, ThumbsDown, Share2, Bookmark, Eye, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { mockKBArticles } from '@/lib/mock-data';

export default function ArticlePage({ params }: { params: { id: string } }) {
  const article = mockKBArticles.find(a => a.id === `kb-${params.id}`) || mockKBArticles[0];

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-4xl">
          <Link href="/knowledge">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Knowledge Base
            </Button>
          </Link>

          <article>
            <div className="mb-8">
              <Badge className="mb-4">{article.category}</Badge>
              <h1 className="text-4xl font-bold mb-4">
                {article.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span>Last updated: {article.lastUpdated}</span>
                <span>•</span>
                <span>Version {article.version}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{article.views.toLocaleString()} views</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Confidence Score:</span>
                <div className="relative w-48 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-primary transition-all"
                    style={{ width: `${article.confidence}%` }}
                  />
                </div>
                <Badge variant="secondary">{article.confidence}%</Badge>
              </div>
            </div>

            <Card className="mb-8">
              <CardContent className="pt-6">
                <div className="prose prose-slate max-w-none">
                  <h2 className="text-2xl font-semibold mb-4">Overview</h2>
                  <p className="text-muted-foreground mb-6">
                    WiFi connectivity problems are among the most common issues users face. This guide
                    will walk you through systematic troubleshooting steps to restore your connection.
                  </p>

                  <h2 className="text-2xl font-semibold mb-4 mt-8">Step 1: Basic Checks</h2>
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Verify that WiFi is enabled on your device</li>
                    <li>Check if airplane mode is turned off</li>
                    <li>Ensure you're in range of your router</li>
                    <li>Confirm other devices can connect to the network</li>
                  </ul>

                  <h2 className="text-2xl font-semibold mb-4 mt-8">Step 2: Restart Your Devices</h2>
                  <p className="text-muted-foreground mb-4">
                    Often, a simple restart can resolve connectivity issues:
                  </p>
                  <ol className="list-decimal pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Restart your computer</li>
                    <li>Power cycle your router (unplug for 30 seconds)</li>
                    <li>Wait for the router to fully restart before reconnecting</li>
                  </ol>

                  <h2 className="text-2xl font-semibold mb-4 mt-8">Step 3: Update Network Drivers</h2>
                  <p className="text-muted-foreground mb-4">
                    Outdated drivers can cause connection problems:
                  </p>
                  <ol className="list-decimal pl-6 space-y-2 text-muted-foreground mb-6">
                    <li>Open Device Manager (search in Start menu)</li>
                    <li>Expand "Network adapters"</li>
                    <li>Right-click your WiFi adapter and select "Update driver"</li>
                    <li>Choose "Search automatically for drivers"</li>
                  </ol>

                  <h2 className="text-2xl font-semibold mb-4 mt-8">Citations & Sources</h2>
                  <div className="bg-muted p-4 rounded-lg space-y-3">
                    {article.citations.map((citation, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <ExternalLink className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-medium"
                          >
                            {citation.title}
                          </a>
                          <div className="text-muted-foreground text-xs mt-0.5">{citation.source}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Was this helpful?</span>
                <Button variant="outline" size="sm">
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Yes
                </Button>
                <Button variant="outline" size="sm">
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  No
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="ghost" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </AppLayout>
  );
}
