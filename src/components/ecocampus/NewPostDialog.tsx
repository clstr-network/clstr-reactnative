
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Share, ListChecks, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createSharedItem, createItemRequest, uploadSharedItemImage } from '@/lib/ecocampus-api';
import { useProfile } from '@/contexts/ProfileContext';

// Query keys for consistent cache management
const ECOCAMPUS_QUERY_KEYS = {
  sharedItems: ['ecocampus', 'shared-items'] as const,
  itemRequests: ['ecocampus', 'item-requests'] as const,
  mySharedItems: (userId: string | undefined) => ['ecocampus', 'my-shared-items', userId] as const,
  myItemRequests: (userId: string | undefined) => ['ecocampus', 'my-item-requests', userId] as const,
};

interface NewPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Form validation schemas
const shareItemSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters' }),
  type: z.enum(['donate', 'sell', 'rent']),
  price: z.string().optional(),
  rentUnit: z.enum(['day', 'week', 'month']).optional(),
  category: z.string(),
  location: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.type !== 'donate') {
    const numericPrice = Number(data.price);
    if (!data.price || Number.isNaN(numericPrice) || numericPrice <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['price'],
        message: 'Price is required and must be greater than 0',
      });
    }
  }

  if (data.type === 'rent' && !data.rentUnit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rentUnit'],
      message: 'Select a rent unit',
    });
  }
});

const requestItemSchema = z.object({
  item: z.string().min(3, { message: 'Item name must be at least 3 characters' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters' }),
  urgency: z.enum(['urgent', 'regular']),
  condition: z.enum(['used', 'any']),
});

type ShareItemForm = z.infer<typeof shareItemSchema>;
type RequestItemForm = z.infer<typeof requestItemSchema>;

const NewPostDialog = ({ open, onOpenChange }: NewPostDialogProps) => {
  const [mode, setMode] = useState<'choose' | 'share' | 'request'>('choose');
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useProfile();

  const invalidateEcoCampus = () => {
    queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.sharedItems });
    queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.itemRequests });
    queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.mySharedItems(profile?.id) });
    queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.myItemRequests(profile?.id) });
  };

  // Share item form
  const shareForm = useForm<ShareItemForm>({
    resolver: zodResolver(shareItemSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'donate',
      price: '',
      rentUnit: 'day',
      category: '',
      location: '',
    },
  });

  // Request item form
  const requestForm = useForm<RequestItemForm>({
    resolver: zodResolver(requestItemSchema),
    defaultValues: {
      item: '',
      description: '',
      urgency: 'regular',
      condition: 'any',
    },
  });

  const handleClose = () => {
    setMode('choose');
    shareForm.reset();
    requestForm.reset();
    setPreviewImages([]);
    setImageFiles([]);
    onOpenChange(false);
  };

  const onShareSubmit = async (data: ShareItemForm) => {
    setIsSubmitting(true);
    
    try {
      // Upload image to Supabase storage if present
      let imageUrl: string | null = null;
      if (imageFiles.length > 0) {
        try {
          imageUrl = await uploadSharedItemImage(imageFiles[0]);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          toast({
            title: "Warning",
            description: "Image upload failed, proceeding without image.",
            variant: "destructive",
          });
        }
      }

      // Format the data for the API
      const formattedData = {
        title: data.title,
        description: data.description,
        price: data.type === 'donate' ? '' : (data.price?.trim() || ''),
        share_type: data.type,
        rent_unit: data.type === 'rent' ? data.rentUnit : undefined,
        category: data.category,
        location: data.location,
        status: 'available' as const,
        image: imageUrl ?? undefined,
      };
      
      await createSharedItem(formattedData);
      invalidateEcoCampus();
      
      toast({
        title: "Item Shared",
        description: "Your item has been successfully shared",
      });
      
      handleClose();
    } catch (error) {
      console.error('Error sharing item:', error);
      toast({
        title: "Error",
        description: "Failed to share item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onRequestSubmit = async (data: RequestItemForm) => {
    setIsSubmitting(true);
    
    try {
      // Format the data for the API
      const formattedData = {
        item: data.item,
        description: data.description,
        urgency: data.urgency === 'urgent' ? 'urgent' : 'normal',
        preference: data.condition === 'any' ? 'Any condition' : 'Used only',
      };
      
      await createItemRequest(formattedData);
      invalidateEcoCampus();
      
      toast({
        title: "Request Submitted",
        description: "Your item request has been submitted",
      });
      
      handleClose();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPreviewImages: string[] = [];
    const newImageFiles: File[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newImageFiles.push(file);
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          newPreviewImages.push(event.target.result);
          if (newPreviewImages.length === files.length) {
            setPreviewImages(newPreviewImages);
            setImageFiles(newImageFiles);
          }
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-[#111111] border-white/10 text-white">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl sm:text-2xl text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {mode === 'choose' ? 'What would you like to do?' : 
             mode === 'share' ? 'Share an Item' : 'Request an Item'}
          </DialogTitle>
        </DialogHeader>

        {mode === 'choose' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div 
              className="cursor-pointer rounded-xl bg-white/[0.04] border border-white/10 p-5 sm:p-6 flex flex-col items-center text-center hover:bg-white/[0.08] hover:border-white/20 transition-all" 
              onClick={() => setMode('share')}
            >
              <Share className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 text-white/50" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Share an Item</h3>
              <p className="text-xs sm:text-sm text-white/50">Donate or sell books, instruments, and other items you no longer need</p>
            </div>

            <div 
              className="cursor-pointer rounded-xl bg-white/[0.04] border border-white/10 p-5 sm:p-6 flex flex-col items-center text-center hover:bg-white/[0.08] hover:border-white/20 transition-all" 
              onClick={() => setMode('request')}
            >
              <ListChecks className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4 text-white/50" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Request an Item</h3>
              <p className="text-xs sm:text-sm text-white/50">Ask the community for items you need for your studies or projects</p>
            </div>
          </div>
        )}

        {mode === 'share' && (
          <Form {...shareForm}>
            <form onSubmit={shareForm.handleSubmit(onShareSubmit)} className="space-y-3 sm:space-y-4">
              <FormField
                control={shareForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base text-white/70">Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Engineering Drawing Kit" {...field} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={shareForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base text-white/70">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your item, including condition, age, etc."
                        className="min-h-[80px] sm:min-h-[100px] bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel className="text-sm sm:text-base text-white/70">Upload Images</FormLabel>
                <div className="mt-2 border-2 border-dashed border-white/10 rounded-lg p-3 sm:p-4 text-center">
                  <Upload className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-white/30 mb-2" />
                  <p className="text-xs sm:text-sm text-white/40 mb-2">Drag & drop images here or click to browse</p>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    id="image-upload"
                    onChange={handleImageUpload}
                  />
                  <Button type="button" variant="outline" size="sm" className="mt-2 text-xs sm:text-sm border-white/15 text-white/70 bg-transparent hover:bg-white/[0.06]" asChild>
                    <label htmlFor="image-upload" className="cursor-pointer">
                      Choose Images
                    </label>
                  </Button>
                </div>

                {previewImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3 sm:mt-4">
                    {previewImages.map((src, index) => (
                      <img 
                        key={index}
                        src={src}
                        alt={`Preview ${index}`}
                        className="w-full h-20 sm:h-24 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
              </div>

              <FormField
                control={shareForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base text-white/70">Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col sm:flex-row gap-3 sm:gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="donate" id="donate" />
                          <label htmlFor="donate" className="text-sm sm:text-base text-white/70 cursor-pointer">Donate</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sell" id="sell" />
                          <label htmlFor="sell" className="text-sm sm:text-base text-white/70 cursor-pointer">Sell</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="rent" id="rent" />
                          <label htmlFor="rent" className="text-sm sm:text-base text-white/70 cursor-pointer">Rent</label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {shareForm.watch('type') !== 'donate' && (
                <FormField
                  control={shareForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base text-white/70">
                        {shareForm.watch('type') === 'rent' ? 'Rent Price (₹)' : 'Price (₹)'}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="500" {...field} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {shareForm.watch('type') === 'rent' && (
                <FormField
                  control={shareForm.control}
                  name="rentUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base text-white/70">Rent Unit</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/[0.06] border-white/10 text-white/70">
                            <SelectValue placeholder="Select rent unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#1a1a1a] border-white/10">
                          <SelectItem value="day">Per day</SelectItem>
                          <SelectItem value="week">Per week</SelectItem>
                          <SelectItem value="month">Per month</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={shareForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base text-white/70">Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/[0.06] border-white/10 text-white/70">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        <SelectItem value="books">Books</SelectItem>
                        <SelectItem value="instruments">Instruments</SelectItem>
                        <SelectItem value="clothing">Clothing</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={shareForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base text-white/70">Campus Pickup Point (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Hostel Block A, Room 101" {...field} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 sm:pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto border-white/15 text-white/70 bg-transparent hover:bg-white/[0.06]" 
                  onClick={() => setMode('choose')}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white border border-white/15"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {mode === 'request' && (
          <Form {...requestForm}>
            <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-3 sm:space-y-4">
              <FormField
                control={requestForm.control}
                name="item"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base text-white/70">Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Physics Lab Manual" {...field} className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={requestForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base text-white/70">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what you need, including specific requirements"
                        className="min-h-[80px] sm:min-h-[100px] bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={requestForm.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base text-white/70">Urgency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/[0.06] border-white/10 text-white/70">
                          <SelectValue placeholder="Select urgency level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        <SelectItem value="urgent">Urgent (Needed within a week)</SelectItem>
                        <SelectItem value="regular">Regular (Needed within a month)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={requestForm.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base text-white/70">Preferred Condition</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/[0.06] border-white/10 text-white/70">
                          <SelectValue placeholder="Select preferred condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        <SelectItem value="used">Used is fine</SelectItem>
                        <SelectItem value="any">Any condition</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 sm:pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto border-white/15 text-white/70 bg-transparent hover:bg-white/[0.06]" 
                  onClick={() => setMode('choose')}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white border border-white/15"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NewPostDialog;
