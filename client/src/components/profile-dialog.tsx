import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { User, X, Upload } from 'lucide-react';
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

export function ProfileDialog({ children }: ProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      let profileImageUrl = data.profileImageUrl;
      
      // Upload image if a new file was selected
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const uploadResponse = await apiRequest('POST', '/api/upload-profile-image', formData);
        const uploadData = await uploadResponse.json();
        profileImageUrl = uploadData.url;
      }

      const response = await apiRequest('PUT', '/api/profile', {
        ...data,
        profileImageUrl,
      });
      return response.json();
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