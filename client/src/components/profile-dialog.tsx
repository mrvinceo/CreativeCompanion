import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, X, Upload, Crown, ExternalLink, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const INTERESTS = [
  'portrait photography', 'landscape photography', 'photo-journalism', 'fine art',
  'painting', 'drawing', 'textile art', 'sculpture', 'poetry writing', 'prose writing',
  'printmaking', 'architecture', 'weaving', 'knitting', 'embroidery', 'fashion design',
  'graphic design', 'digital illustration', 'animation', 'calligraphy', 'collage',
  'ceramics', 'pottery', 'jewellery making', 'short stories', 'novels',
  'creative non-fiction', 'screenwriting', 'playwriting', 'journaling', 'memoir writing',
  'dance', 'music', 'singing', 'songwriting', 'theatre', 'acting', 'magic',
  'stand-up comedy', 'puppetry', 'culinary arts', 'garden design', 'bookbinding',
  'woodworking', 'furniture design', 'interior design', 'miniature art',
  'music composition', 'music theory', 'film making'
];

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  artistStatement: z.string().max(2500, 'Artist statement must be under 500 words').optional(),
  interests: z.array(z.string()).max(10, 'Select up to 10 interests'),
  profileImageUrl: z.string().url().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileDialogProps {
  children: React.ReactNode;
}

interface SubscriptionData {
  subscriptionPlan: 'free' | 'standard' | 'premium' | 'academic';
  subscriptionStatus?: string;
  conversationsThisMonth: number;
  conversationLimit: number;
  isAcademic: boolean;
}

export function ProfileDialog({ children }: ProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [upgrading, setUpgrading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscription } = useQuery<SubscriptionData>({
    queryKey: ['/api/subscription'],
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      artistStatement: '',
      interests: [],
      profileImageUrl: '',
    },
  });

  // Load user data when dialog opens
  useEffect(() => {
    if (open && user) {
      form.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        artistStatement: user.artistStatement || '',
        interests: user.interests || [],
        profileImageUrl: user.profileImageUrl || '',
      });
      setImagePreview(user.profileImageUrl || '');
    }
  }, [open, user, form]);

  const handleUpgrade = async (plan: 'standard' | 'premium') => {
    try {
      setUpgrading(true);
      const response = await apiRequest('POST', '/api/create-subscription', { plan });
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        title: "Upgrade failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelling(true);
      const response = await apiRequest('POST', '/api/cancel-subscription');
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Subscription cancelled",
          description: "Your subscription will end at the next billing cycle.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
      }
    } catch (error: any) {
      toast({
        title: "Cancellation failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      console.log('Starting profile update with data:', data);
      let profileImageUrl = data.profileImageUrl;
      
      // Upload image if a new file was selected
      if (imageFile) {
        console.log('Uploading image file...');
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const uploadResponse = await apiRequest('POST', '/api/upload-profile-image', formData);
        const uploadData = await uploadResponse.json();
        profileImageUrl = uploadData.url;
        console.log('Image uploaded, URL:', profileImageUrl);
      }

      console.log('Sending profile update request...');
      const response = await apiRequest('PUT', '/api/profile', {
        ...data,
        profileImageUrl,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Profile update failed:', errorData);
        throw new Error(errorData.message || 'Profile update failed');
      }
      
      const result = await response.json();
      console.log('Profile update successful:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
      setOpen(false);
      setImageFile(null);
      setImagePreview('');
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: 'File too large',
          description: 'Please select an image under 5MB.',
          variant: 'destructive',
        });
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addInterest = (interest: string) => {
    const currentInterests = form.getValues('interests');
    if (!currentInterests.includes(interest) && currentInterests.length < 10) {
      form.setValue('interests', [...currentInterests, interest]);
    }
  };

  const removeInterest = (interest: string) => {
    const currentInterests = form.getValues('interests');
    form.setValue('interests', currentInterests.filter(i => i !== interest));
  };

  const onSubmit = (data: ProfileFormData) => {
    console.log('Form submitted with data:', data);
    console.log('Form errors:', form.formState.errors);
    updateProfileMutation.mutate(data);
  };

  const selectedInterests = form.watch('interests') || [];
  const availableInterests = INTERESTS.filter(interest => !selectedInterests.includes(interest));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and creative interests.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center space-x-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={imagePreview} />
                <AvatarFallback>
                  <User className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
              <div>
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </span>
                  </Button>
                </label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <p className="text-xs text-slate-500 mt-1">
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Artist Statement */}
            <FormField
              control={form.control}
              name="artistStatement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artist Statement</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe your artistic practice, inspiration, and creative philosophy..."
                      className="min-h-[120px]"
                      maxLength={2500}
                    />
                  </FormControl>
                  <FormDescription>
                    Tell others about your creative work and artistic vision (max 500 words).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Interests */}
            <div className="space-y-4">
              <div>
                <FormLabel>Creative Interests</FormLabel>
                <FormDescription>
                  Select up to 10 areas that represent your creative interests and practice.
                </FormDescription>
              </div>

              {/* Selected Interests */}
              {selectedInterests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected ({selectedInterests.length}/10):</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedInterests.map((interest) => (
                      <Badge key={interest} variant="secondary" className="text-xs">
                        {interest}
                        <button
                          type="button"
                          onClick={() => removeInterest(interest)}
                          className="ml-2 hover:bg-slate-300 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Interests */}
              {selectedInterests.length < 10 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Add interests:</p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {availableInterests.map((interest) => (
                      <Button
                        key={interest}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addInterest(interest)}
                        className="text-xs h-7"
                      >
                        {interest}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Subscription Management */}
            <Separator />
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-medium">Subscription</h4>
                <p className="text-sm text-muted-foreground">
                  Manage your Refyn subscription plan
                </p>
              </div>

              {subscription && (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-600" />
                      <span className="font-medium">Current Plan</span>
                    </div>
                    {subscription.isAcademic ? (
                      <Badge className="bg-blue-500 text-white">Academic</Badge>
                    ) : subscription.subscriptionPlan === 'premium' ? (
                      <Badge className="bg-purple-500 text-white">Premium</Badge>
                    ) : subscription.subscriptionPlan === 'standard' ? (
                      <Badge className="bg-green-500 text-white">Standard</Badge>
                    ) : (
                      <Badge variant="secondary">Free</Badge>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground mb-4">
                    {subscription.conversationsThisMonth} / {subscription.conversationLimit} conversations used this month
                  </div>

                  {/* Upgrade Options for Free Users (but not academic users) */}
                  {subscription.subscriptionPlan === 'free' && !subscription.isAcademic && (
                    <div className="space-y-3">
                      <div className="grid gap-3">
                        <div className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h5 className="font-medium">Standard</h5>
                              <p className="text-xs text-muted-foreground">30 conversations/month + 2 improved versions per conversation</p>
                            </div>
                            <span className="text-lg font-bold">£10/mo</span>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleUpgrade('standard')}
                            disabled={upgrading}
                            className="w-full"
                          >
                            {upgrading ? 'Processing...' : 'Upgrade to Standard'}
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                        
                        <div className="p-3 border rounded-lg bg-purple-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h5 className="font-medium">Premium</h5>
                              <p className="text-xs text-muted-foreground">50 conversations/month + 5 improved versions per conversation</p>
                            </div>
                            <span className="text-lg font-bold">£15/mo</span>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleUpgrade('premium')}
                            disabled={upgrading}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                          >
                            {upgrading ? 'Processing...' : 'Upgrade to Premium'}
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Upgrade/Downgrade Options for Paid Users */}
                  {(subscription.subscriptionPlan === 'standard' || subscription.subscriptionPlan === 'premium') && !subscription.isAcademic && (
                    <div className="space-y-3">
                      {subscription.subscriptionPlan === 'standard' && (
                        <div className="p-3 border rounded-lg bg-purple-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h5 className="font-medium">Upgrade to Premium</h5>
                              <p className="text-xs text-muted-foreground">50 conversations/month + 5 improved versions per conversation</p>
                            </div>
                            <span className="text-lg font-bold">£15/mo</span>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleUpgrade('premium')}
                            disabled={upgrading}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                          >
                            {upgrading ? 'Processing...' : 'Upgrade to Premium'}
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      )}

                      <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                        <div className="flex items-start gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                          <div>
                            <h5 className="font-medium text-red-800">Cancel Subscription</h5>
                            <p className="text-xs text-red-600">Your subscription will end at the next billing cycle</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={handleCancelSubscription}
                          disabled={cancelling}
                          className="w-full"
                        >
                          {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Academic User Info */}
                  {subscription.isAcademic && (
                    <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                      <div className="flex items-center gap-2 text-blue-800">
                        <Crown className="w-4 h-4" />
                        <span className="text-sm font-medium">Academic Access</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        You have academic access with enhanced features. Contact support for any changes.
                      </p>
                    </div>
                  )}
                </Card>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}