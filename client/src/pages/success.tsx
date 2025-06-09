import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

export default function Success() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Invalidate subscription data to refresh user's plan
    queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
    
    toast({
      title: "Payment successful!",
      description: "Your subscription has been activated. You now have access to more conversations.",
    });
  }, [toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-slate-600">
            Your subscription has been activated and you now have access to more AI feedback conversations.
          </p>
        </div>
        
        <div className="space-y-4">
          <Button 
            onClick={() => setLocation('/')}
            className="w-full"
            size="lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to App
          </Button>
          
          <p className="text-sm text-slate-500">
            Your subscription will automatically renew each month. You can manage your subscription through your account settings.
          </p>
        </div>
      </Card>
    </div>
  );
}