import { useState, useRef } from "react";
import { Edit3, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ReactCrop, { type Crop as ReactCropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { supabase } from "@/integrations/supabase/client";

interface CoverPhotoUploadProps {
  currentCover: string;
  isEditable: boolean;
  profileId: string;
  onCoverUpdated: () => void;
}

const CoverPhotoUpload = ({ currentCover, isEditable, profileId, onCoverUpdated }: CoverPhotoUploadProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [crop, setCrop] = useState<ReactCropType>({
    unit: '%',
    width: 100,
    height: 33,
    x: 0,
    y: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFile(file);
    setCroppedBlob(null);
    
    // Create preview and show crop modal
    const reader = new FileReader();
    reader.onload = () => {
      setCoverPreview(reader.result as string);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const getCroppedImg = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!imageRef.current || !coverPreview) {
        resolve(null);
        return;
      }
      
      const canvas = document.createElement('canvas');
      const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
      const scaleY = imageRef.current.naturalHeight / imageRef.current.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(null);
        return;
      }
      
      canvas.width = crop.width ? crop.width * scaleX : imageRef.current.naturalWidth;
      canvas.height = crop.height ? crop.height * scaleY : imageRef.current.naturalHeight;
      
      ctx.drawImage(
        imageRef.current,
        (crop.x || 0) * scaleX,
        (crop.y || 0) * scaleY,
        (crop.width || 0) * scaleX,
        (crop.height || 0) * scaleY,
        0,
        0,
        (crop.width || 0) * scaleX,
        (crop.height || 0) * scaleY
      );
      
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.92);
    });
  };
  
  const uploadToSupabase = async (blob: Blob): Promise<string | null> => {
    try {
      const fileName = `${profileId}-${crypto.randomUUID()}.jpg`;
      const { data, error } = await supabase.storage
        .from('profile-covers')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-covers')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading to Supabase:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload cover photo to storage",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateProfileCoverUrl = async (url: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ cover_photo_url: url })
        .eq('id', profileId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: "Failed to update profile with new cover photo",
        variant: "destructive",
      });
      return false;
    }
  };
  
  const handleSave = async () => {
    if (isCropModalOpen) {
      const blob = await getCroppedImg();
      if (blob) {
        const dataUrl = URL.createObjectURL(blob);
        setCoverPreview(dataUrl);
        setCroppedBlob(blob);
        setIsCropModalOpen(false);
        setIsEditing(true);
      }
    } else if (coverPreview) {
      setIsSaving(true);
      
      try {
        // Get the cropped blob
        const blobToUpload = croppedBlob ?? (await getCroppedImg());
        if (!blobToUpload) {
          toast({
            title: "Error",
            description: "Failed to process image",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }

        // Upload to Supabase storage
        const publicUrl = await uploadToSupabase(blobToUpload);
        if (!publicUrl) {
          setIsSaving(false);
          return;
        }

        // Update profile record
        const success = await updateProfileCoverUrl(publicUrl);
        if (!success) {
          setIsSaving(false);
          return;
        }

        toast({
          title: "Cover photo updated",
          description: "Your cover photo has been updated successfully.",
        });

        setIsEditing(false);
        setCoverPreview(null);
        setSelectedFile(null);
        setCroppedBlob(null);
        onCoverUpdated();
      } catch (error) {
        console.error('Error saving cover:', error);
        toast({
          title: "Error",
          description: "Failed to save cover photo",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }
  };
  
  const handleCancel = () => {
    setCoverPreview(null);
    setSelectedFile(null);
    setCroppedBlob(null);
    setIsEditing(false);
    setIsCropModalOpen(false);
  };
  
  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <>
      <div className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden bg-white/[0.04] border border-white/10">
        <img 
          src={coverPreview || currentCover} 
          alt="Cover"
          className="w-full h-full object-cover opacity-60"
        />
        
        {isEditable && !isEditing && (
          <Button 
            variant="outline" 
            size="sm" 
            className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm hover:bg-black/60 border-white/20 text-white/70 hover:text-white"
            onClick={handleClickUpload}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Change Cover
          </Button>
        )}
        
        {isEditing && (
          <div className="absolute top-4 right-4 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-black/40 backdrop-blur-sm hover:bg-black/60 border-white/20 text-white/70 hover:text-white"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-black/40 backdrop-blur-sm hover:bg-black/60 border-white/20 text-white/70 hover:text-white"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
        
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
        />
      </div>
      
      {/* Crop Modal */}
      <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Crop Cover Photo</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {coverPreview && (
              <ReactCrop
                crop={crop}
                onChange={(newCrop) => setCrop(newCrop)}
                aspect={3}
              >
                <img
                  src={coverPreview}
                  ref={imageRef}
                  alt="Cover photo to crop"
                  style={{ maxHeight: '50vh', maxWidth: '100%' }}
                />
              </ReactCrop>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSave}>
              <Check className="h-4 w-4 mr-2" />
              Apply Crop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CoverPhotoUpload;
