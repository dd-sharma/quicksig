
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Code, 
  Copy, 
  ExternalLink, 
  AlertCircle, 
  Globe,
  Webhook,
  Key,
  FileText
} from 'lucide-react';

export default function ApiDocs() {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">API Documentation</h1>
        <p className="text-slate-600">
          Learn how QuickSig's tracking API works and how to integrate it with your applications.
        </p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <h3 className="font-medium text-yellow-900">Development Documentation</h3>
          </div>
          <p className="text-yellow-800 text-sm">
            This documentation shows how the QuickSig API would work in a production environment. 
            These endpoints are not currently accessible in the Base44 platform but demonstrate the intended functionality.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Navigation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <a href="#authentication" className="block text-blue-600 hover:text-blue-700">Authentication</a>
              <a href="#tracking" className="block text-blue-600 hover:text-blue-700">Tracking Events</a>
              <a href="#visitors" className="block text-blue-600 hover:text-blue-700">Visitor Assignment</a>
              <a href="#conversions" className="block text-blue-600 hover:text-blue-700">Conversion Tracking</a>
              <a href="#webhooks" className="block text-blue-600 hover:text-blue-700">Webhooks</a>
              <a href="#sdks" className="block text-blue-600 hover:text-blue-700">SDKs</a>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-8">
          {/* Authentication */}
          <Card id="authentication">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600">
                All API requests require authentication using your organization's API key in the request headers.
              </p>
              
              <div className="bg-slate-900 text-slate-100 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">HEADERS</span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => copyToClipboard('Authorization: Bearer YOUR_API_KEY\nContent-Type: application/json')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <pre className="text-sm">
{`Authorization: Bearer YOUR_API_KEY
Content-Type: application/json`}
                </pre>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> API keys can be generated in your organization settings. 
                  Keep them secure and never expose them in client-side code.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tracking Events */}
          <Card id="tracking">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Tracking Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="assignment" className="w-full">
                <TabsList>
                  <TabsTrigger value="assignment">Visitor Assignment</TabsTrigger>
                  <TabsTrigger value="conversion">Conversion</TabsTrigger>
                  <TabsTrigger value="pageview">Page View</TabsTrigger>
                </TabsList>
                
                <TabsContent value="assignment" className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className="bg-green-100 text-green-800">POST</Badge>
                      <code className="text-sm">https://app.quicksig.com/api/track</code>
                    </div>
                    
                    <p className="text-slate-600 mb-4">
                      Track when a visitor is assigned to a test variant.
                    </p>
                    
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">REQUEST BODY</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => copyToClipboard(`{
  "testId": "test_abc123",
  "visitorId": "visitor_xyz789",
  "variantId": "variant_def456",
  "event": "variant_assigned",
  "timestamp": "2024-01-15T10:30:00Z",
  "userAgent": "Mozilla/5.0...",
  "referrer": "https://google.com",
  "url": "https://yoursite.com/landing"
}`)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <pre className="text-sm">
{`{
  "testId": "test_abc123",
  "visitorId": "visitor_xyz789",
  "variantId": "variant_def456",
  "event": "variant_assigned",
  "timestamp": "2024-01-15T10:30:00Z",
  "userAgent": "Mozilla/5.0...",
  "referrer": "https://google.com",
  "url": "https://yoursite.com/landing"
}`}
                      </pre>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="conversion" className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className="bg-green-100 text-green-800">POST</Badge>
                      <code className="text-sm">https://app.quicksig.com/api/track</code>
                    </div>
                    
                    <p className="text-slate-600 mb-4">
                      Track when a visitor completes a goal or conversion.
                    </p>
                    
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">REQUEST BODY</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => copyToClipboard(`{
  "testId": "test_abc123",
  "visitorId": "visitor_xyz789",
  "variantId": "variant_def456",
  "event": "conversion",
  "timestamp": "2024-01-15T10:35:00Z",
  "goalType": "purchase",
  "value": 49.99,
  "currency": "USD",
  "url": "https://yoursite.com/thank-you"
}`)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <pre className="text-sm">
{`{
  "testId": "test_abc123",
  "visitorId": "visitor_xyz789",
  "variantId": "variant_def456",
  "event": "conversion",
  "timestamp": "2024-01-15T10:35:00Z",
  "goalType": "purchase",
  "value": 49.99,
  "currency": "USD",
  "url": "https://yoursite.com/thank-you"
}`}
                      </pre>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="pageview" className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className="bg-green-100 text-green-800">POST</Badge>
                      <code className="text-sm">https://app.quicksig.com/api/track</code>
                    </div>
                    
                    <p className="text-slate-600 mb-4">
                      Track page views for visitor engagement analysis.
                    </p>
                    
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">REQUEST BODY</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => copyToClipboard(`{
  "testId": "test_abc123",
  "visitorId": "visitor_xyz789",
  "variantId": "variant_def456",
  "event": "page_view",
  "timestamp": "2024-01-15T10:32:00Z",
  "url": "https://yoursite.com/pricing",
  "title": "Pricing Plans",
  "referrer": "https://yoursite.com/features"
}`)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <pre className="text-sm">
{`{
  "testId": "test_abc123",
  "visitorId": "visitor_xyz789",
  "variantId": "variant_def456",
  "event": "page_view",
  "timestamp": "2024-01-15T10:32:00Z",
  "url": "https://yoursite.com/pricing",
  "title": "Pricing Plans",
  "referrer": "https://yoursite.com/features"
}`}
                      </pre>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Test Management API */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Test Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Get Test Configuration</h4>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-100 text-blue-800">GET</Badge>
                  <code className="text-sm">https://app.quicksig.com/api/tests/{"{testId}"}</code>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  Retrieve test configuration including variants and traffic allocation.
                </p>
                
                <div className="bg-slate-900 text-slate-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">CURL EXAMPLE</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(`curl -X GET "https://app.quicksig.com/api/tests/test_abc123" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <pre className="text-sm">
{`curl -X GET "https://app.quicksig.com/api/tests/test_abc123" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Get Test Results</h4>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-100 text-blue-800">GET</Badge>
                  <code className="text-sm">https://app.quicksig.com/api/tests/{"{testId}"}/results</code>
                </div>
                <p className="text-sm text-slate-600">
                  Retrieve test results including visitor counts, conversions, and statistical significance.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Webhooks */}
          <Card id="webhooks">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600">
                QuickSig can send real-time notifications to your application when important events occur.
              </p>

              <div>
                <h4 className="font-medium mb-3">Test Completed Webhook</h4>
                <p className="text-sm text-slate-600 mb-3">
                  Sent when a test reaches statistical significance or is manually completed.
                </p>
                
                <div className="bg-slate-900 text-slate-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">WEBHOOK PAYLOAD</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(`{
  "event": "test.completed",
  "testId": "test_abc123",
  "testName": "Homepage Headline Test",
  "completedAt": "2024-01-15T15:30:00Z",
  "results": {
    "winner": {
      "variantId": "variant_def456",
      "variantName": "Variant A",
      "conversionRate": 0.045,
      "confidence": 0.95
    },
    "totalVisitors": 1247,
    "totalConversions": 52
  }
}`)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <pre className="text-sm">
{`{
  "event": "test.completed",
  "testId": "test_abc123",
  "testName": "Homepage Headline Test",
  "completedAt": "2024-01-15T15:30:00Z",
  "results": {
    "winner": {
      "variantId": "variant_def456",
      "variantName": "Variant A",
      "conversionRate": 0.045,
      "confidence": 0.95
    },
    "totalVisitors": 1247,
    "totalConversions": 52
  }
}`}
                  </pre>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">Webhook Configuration</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Configure webhook URLs in your organization settings</li>
                  <li>• Webhooks are signed with HMAC-SHA256 for security</li>
                  <li>• Failed deliveries are retried up to 3 times with exponential backoff</li>
                  <li>• Verify webhook signatures to ensure authenticity</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* SDKs */}
          <Card id="sdks">
            <CardHeader>
              <CardTitle>SDKs & Libraries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600">
                Official QuickSig SDKs for popular programming languages and frameworks.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-lg">
                  <h4 className="font-medium mb-2">JavaScript/React</h4>
                  <p className="text-sm text-slate-600 mb-3">
                    Easy integration for web applications and React components.
                  </p>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded text-sm">
                    <code>npm install @quicksig/js-sdk</code>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-lg">
                  <h4 className="font-medium mb-2">Python</h4>
                  <p className="text-sm text-slate-600 mb-3">
                    Server-side integration for Python applications.
                  </p>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded text-sm">
                    <code>pip install quicksig</code>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-lg">
                  <h4 className="font-medium mb-2">Node.js</h4>
                  <p className="text-sm text-slate-600 mb-3">
                    Server-side tracking and test management for Node applications.
                  </p>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded text-sm">
                    <code>npm install @quicksig/node-sdk</code>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-lg">
                  <h4 className="font-medium mb-2">PHP</h4>
                  <p className="text-sm text-slate-600 mb-3">
                    Integration for PHP web applications and Laravel.
                  </p>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded text-sm">
                    <code>composer require quicksig/php-sdk</code>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <h5 className="font-medium mb-2">Quick Start Example (JavaScript)</h5>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg text-sm">
                  <pre>
{`import QuickSig from '@quicksig/js-sdk';

const quicksig = new QuickSig('YOUR_API_KEY');

// Assign visitor to test
const assignment = await quicksig.assignVisitor('test_abc123');

// Track conversion
await quicksig.trackConversion('test_abc123', assignment.visitorId, {
  goalType: 'signup',
  value: 0
});`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rate Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Rate Limits & Best Practices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Rate Limits</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Tracking API: 1,000 requests per minute per API key</li>
                  <li>• Management API: 100 requests per minute per API key</li>
                  <li>• Webhook deliveries: 50 per minute per endpoint</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Best Practices</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Batch multiple events when possible to reduce API calls</li>
                  <li>• Implement exponential backoff for failed requests</li>
                  <li>• Cache test configurations to minimize management API calls</li>
                  <li>• Use client-side tracking for page views and user interactions</li>
                  <li>• Send server-side events for sensitive conversions (purchases, signups)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
