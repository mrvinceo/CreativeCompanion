import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Palette, Camera, Music, FileText, Sparkles, ArrowRight } from 'lucide-react';
import refynLogoPath from '@assets/Asset 8@4x_1751642744375.png';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header - GiffGaff Style Dark */}
      <header className="bg-gray-900 text-white px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#85c875' }}
            >
              <img 
                src={refynLogoPath} 
                alt="Refyn" 
                className="w-8 h-6 object-contain"
              />
            </div>
            <span className="text-xl font-bold">Refyn</span>
          </div>
          <Button 
            onClick={() => window.location.href = '/auth'}
            className="bg-primary hover:bg-primary/90 text-black font-bold px-6"
          >
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="flex-1 flex items-center justify-center px-6 py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto text-center">
            {/* Large Logo with Background */}
            <div className="mb-8 flex justify-center">
              <div 
                className="w-32 h-32 rounded-3xl flex items-center justify-center shadow-2xl"
                style={{ backgroundColor: '#85c875' }}
              >
                <img 
                  src={refynLogoPath} 
                  alt="Refyn" 
                  className="w-20 h-16 object-contain"
                />
              </div>
            </div>
            
            <h1 className="text-6xl font-bold text-black mb-6">
              Get AI feedback on your
              <span className="block text-primary mt-2">creative work</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Upload photography, art, music, writing, or any creative project and get personalized feedback to improve your skills.
            </p>
            <Button 
              size="lg" 
              className="text-lg px-8 py-4 bg-primary hover:bg-primary/90 text-black font-bold shadow-lg"
              onClick={() => window.location.href = '/auth'}
            >
              Start creating <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center text-black mb-4">
              Creative mediums we support
            </h2>
            <p className="text-center text-gray-600 mb-12 text-lg">
              Get specialized AI feedback for any creative project
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 bg-gradient-to-br from-primary to-yellow-400 text-black border-0 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
                <Camera className="w-8 h-8 mb-4" />
                <h3 className="font-bold text-lg mb-2">Photography</h3>
                <p className="text-sm opacity-90">Composition, lighting, and technical critique</p>
              </Card>
              
              <Card className="p-6 bg-gradient-to-br from-secondary to-pink-400 text-white border-0 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
                <Palette className="w-8 h-8 mb-4" />
                <h3 className="font-bold text-lg mb-2">Visual Arts</h3>
                <p className="text-sm opacity-90">Painting, drawing, and illustration feedback</p>
              </Card>
              
              <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-400 text-white border-0 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
                <Music className="w-8 h-8 mb-4" />
                <h3 className="font-bold text-lg mb-2">Music</h3>
                <p className="text-sm opacity-90">Composition and production analysis</p>
              </Card>
              
              <Card className="p-6 bg-gradient-to-br from-purple-500 to-violet-400 text-white border-0 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
                <FileText className="w-8 h-8 mb-4" />
                <h3 className="font-bold text-lg mb-2">Writing</h3>
                <p className="text-sm opacity-90">Stories, poetry, and creative content</p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">
              Ready to improve your creative work?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of creators getting AI-powered feedback
            </p>
            <Button 
              size="lg" 
              className="text-lg px-8 py-4 bg-primary hover:bg-primary/90 text-black font-bold shadow-lg"
              onClick={() => window.location.href = '/auth'}
            >
              Get started for free <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 text-center py-4">
        <p>© Ryzomi 2025</p>
      </footer>
    </div>
  );
}