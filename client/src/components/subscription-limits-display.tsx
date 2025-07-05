import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileImage, MessageSquare, Upload, Crown } from 'lucide-react';

interface SubscriptionData {
  subscriptionPlan: 'free' | 'standard' | 'premium' | 'academic';
  subscriptionStatus?: string;
  conversationsThisMonth: number;
  conversationLimit: number;
  isAcademic: boolean;
}

export function SubscriptionLimitsDisplay() {
  const { data: subscription } = useQuery<SubscriptionData>({
    queryKey: ['/api/subscription'],
  });

  if (!subscription) return null;

  const getLimits = () => {
    if (subscription.isAcademic) {
      return {
        maxFiles: 15,
        maxFileSize: '100MB',
        maxReplies: 15,
        maxImprovedVersions: 10
      };
    }
    
    switch (subscription.subscriptionPlan) {
      case 'premium':
        return {
          maxFiles: 15,
          maxFileSize: '100MB',
          maxReplies: 15,
          maxImprovedVersions: 10
        };
      case 'standard':
        return {
          maxFiles: 10,
          maxFileSize: '80MB',
          maxReplies: 8,
          maxImprovedVersions: 5
        };
      default: // free
        return {
          maxFiles: 5,
          maxFileSize: '30MB',
          maxReplies: 3,
          maxImprovedVersions: 2
        };
    }
  };

  const limits = getLimits();

  const getPlanBadge = () => {
    if (subscription.isAcademic) return <Badge className="bg-blue-500 text-white">Academic</Badge>;
    if (subscription.subscriptionPlan === 'premium') return <Badge className="bg-purple-500 text-white">Premium</Badge>;
    if (subscription.subscriptionPlan === 'standard') return <Badge className="bg-green-500 text-white">Standard</Badge>;
    return <Badge variant="secondary">Free</Badge>;
  };

  return (
    <Card className="p-4 space-y-4 border-0 shadow-sm bg-gradient-to-r from-slate-50 to-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Crown className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-black">Plan Limits</span>
        </div>
        {getPlanBadge()}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <FileImage className="w-3 h-3 text-slate-500" />
          <span className="text-slate-600">Max {limits.maxFiles} files/conversation</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Upload className="w-3 h-3 text-slate-500" />
          <span className="text-slate-600">Max {limits.maxFileSize} per file</span>
        </div>
        
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3 h-3 text-slate-500" />
          <span className="text-slate-600">Max {limits.maxReplies} replies</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Crown className="w-3 h-3 text-slate-500" />
          <span className="text-slate-600">Max {limits.maxImprovedVersions} improved versions</span>
        </div>
      </div>
    </Card>
  );
}