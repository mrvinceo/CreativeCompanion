import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Crown, MessageSquare, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionData {
  subscriptionPlan: 'free' | 'standard' | 'premium' | 'academic';
  subscriptionStatus?: string;
  conversationsThisMonth: number;
  conversationLimit: number;
  isAcademic: boolean;
}

export function SubscriptionStatus() {
  const [upgrading, setUpgrading] = useState(false);
  const { toast } = useToast();

  const { data: subscription, isLoading } = useQuery<SubscriptionData>({
    queryKey: ['/api/subscription'],
  });

  const handleUpgrade = async (plan: 'standard' | 'premium') => {
    try {
      setUpgrading(true);
      const response = await apiRequest('POST', '/api/create-subscription', { plan });
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      let title = "Upgrade failed";
      let description = "Please try again later";
      
      if (error.message?.includes('503') || error.message?.includes('configuration incomplete')) {
        title = "Payment system unavailable";
        description = "Payment processing is being configured. Please contact support for manual upgrade.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    } finally {
      setUpgrading(false);
    }
  };

  if (isLoading || !subscription) {
    return (
      <Card className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
          <div className="h-2 bg-slate-200 rounded w-full"></div>
        </div>
      </Card>
    );
  }

  const usagePercentage = (subscription.conversationsThisMonth / subscription.conversationLimit) * 100;
  const isNearLimit = usagePercentage >= 80;
  const hasExceededLimit = subscription.conversationsThisMonth >= subscription.conversationLimit;

  const getPlanBadge = () => {
    if (subscription.isAcademic) return <Badge className="bg-blue-500 text-white">Academic</Badge>;
    if (subscription.subscriptionPlan === 'premium') return <Badge className="bg-purple-500 text-white">Premium</Badge>;
    if (subscription.subscriptionPlan === 'standard') return <Badge className="bg-green-500 text-white">Standard</Badge>;
    return <Badge variant="secondary">Free</Badge>;
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-medium">Monthly Usage</span>
        </div>
        {getPlanBadge()}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Conversations used</span>
          <span className={hasExceededLimit ? "text-red-600 font-medium" : ""}>
            {subscription.conversationsThisMonth} / {subscription.conversationLimit}
          </span>
        </div>
        <Progress 
          value={Math.min(usagePercentage, 100)} 
          className={`h-2 ${hasExceededLimit ? 'bg-red-100' : isNearLimit ? 'bg-orange-100' : ''}`}
        />
        {hasExceededLimit && (
          <p className="text-xs text-red-600">
            Monthly limit reached. Upgrade to continue getting AI feedback.
          </p>
        )}
        {isNearLimit && !hasExceededLimit && (
          <p className="text-xs text-orange-600">
            You're approaching your monthly limit.
          </p>
        )}
      </div>

      {subscription.isAcademic ? (
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-800">
            <Crown className="w-4 h-4 inline mr-1" />
            You have academic access with 50 conversations per month.
          </p>
        </div>
      ) : subscription.subscriptionPlan === 'free' && (
        <div className="space-y-3 pt-2 border-t">
          <h4 className="font-medium text-sm">Upgrade for more feedback</h4>
          <div className="grid gap-3">
            <div className="p-3 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h5 className="font-medium">Standard</h5>
                  <p className="text-xs text-slate-600">30 conversations/month</p>
                </div>
                <span className="text-lg font-bold">£10</span>
              </div>
              <Button 
                size="sm" 
                onClick={() => handleUpgrade('standard')}
                disabled={upgrading}
                className="w-full"
              >
                {upgrading ? 'Processing...' : 'Upgrade'}
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
            
            <div className="p-3 border rounded-lg bg-purple-50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h5 className="font-medium">Premium</h5>
                  <p className="text-xs text-slate-600">50 conversations/month</p>
                </div>
                <span className="text-lg font-bold">£15</span>
              </div>
              <Button 
                size="sm" 
                onClick={() => handleUpgrade('premium')}
                disabled={upgrading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {upgrading ? 'Processing...' : 'Upgrade'}
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}