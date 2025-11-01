'use client';

import Link from 'next/link';
import { AppLayout } from '../app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, BookOpen, Laptop, Smartphone, Wifi, HardDrive } from 'lucide-react';

const mockArticles = [
  {
    id: '1',
    title: 'How to Fix WiFi Connection Issues on Windows',
    description: 'Step-by-step guide to troubleshoot and resolve common WiFi problems.',
    category: 'Network',
    icon: Wifi,
    views: 1243,
  },
  {
    id: '2',
    title: 'MacBook Battery Draining Fast - Solutions',
    description: 'Learn how to optimize battery life and identify power-hungry apps.',
    category: 'Hardware',
    icon: Laptop,
    views: 892,
  },
  {
    id: '3',
    title: 'iPhone Storage Full - What to Delete',
    description: 'Free up space on your iPhone without losing important data.',
    category: 'Mobile',
    icon: Smartphone,
    views: 2104,
  },
  {
    id: '4',
    title: 'External Hard Drive Not Recognized',
    description: 'Troubleshoot detection issues with external storage devices.',
    category: 'Hardware',
    icon: HardDrive,
    views: 756,
  },
  {
    id: '5',
    title: 'How to Speed Up a Slow Computer',
    description: 'Performance optimization tips for Windows and Mac computers.',
    category: 'Performance',
    icon: Laptop,
    views: 3421,
  },
  {
    id: '6',
    title: 'Android Phone Won\'t Turn On',
    description: 'Diagnose and fix power issues on Android devices.',
    category: 'Mobile',
    icon: Smartphone,
    views: 1567,
  },
];

export default function KnowledgeBasePage() {
  return (
    <AppLayout>
      <div className="container py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4">Knowledge Base</h1>
            <p className="text-lg text-muted-foreground mb-6">
              Browse our collection of guides and troubleshooting articles.
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search for solutions..."
                className="pl-10 h-12 text-base"
              />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Popular Articles</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {mockArticles.map((article) => {
                const Icon = article.icon;
                return (
                  <Link key={article.id} href={`/knowledge/${article.id}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <Icon className="h-8 w-8 text-primary mb-2" />
                          <Badge variant="secondary">{article.category}</Badge>
                        </div>
                        <CardTitle className="text-xl">{article.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-base mb-4">
                          {article.description}
                        </CardDescription>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <BookOpen className="h-4 w-4" />
                          <span>{article.views.toLocaleString()} views</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
