import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Palette, Lightbulb, Users, Zap } from 'lucide-react';
import { RefynLogo } from '@/components/refyn-logo';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <RefynLogo size={40} showTitle={true} />
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <RefynLogo size={80} showTitle={true} showSubtitle={true} className="mb-8 justify-center" />
            <h1 className="text-5xl title text-foreground mb-6">
              AI-Powered Automated Feedback for
              <span className="text-primary"> Creatives and Hobbyists</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Upload your photography, paintings, music, films, or any creative project and receive personalised AI feedback to refine your artistic vision.
            </p>
            <Button 
              size="lg" 
              className="text-lg px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => window.location.href = '/api/login'}
            >
              Get Started
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
              Specialized AI Tutors for Every Creative Medium
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Palette className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Visual Arts</h3>
                <p className="text-sm text-slate-600">Photography, painting, drawing, illustration, and graphic design</p>
              </Card>
              
              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Media & Film</h3>
                <p className="text-sm text-slate-600">Video production, cinematography, and visual storytelling</p>
              </Card>
              
              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Music & Audio</h3>
                <p className="text-sm text-slate-600">Composition, performance, and production feedback</p>
              </Card>
              
              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Writing</h3>
                <p className="text-sm text-slate-600">Creative writing, storytelling, and literary analysis</p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 bg-slate-900 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              Ready to Elevate Your Creative Work?
            </h2>
            <p className="text-xl text-slate-300 mb-8">
              Join Refyn and get expert feedback powered by Google Gemini 2.0
            </p>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => window.location.href = '/api/login'}
            >
              Get Started Free
            </Button>
          </div>
        </section>
      </main>
      <p>© Paul Vincent 2025</p>
    </div>
  );
}