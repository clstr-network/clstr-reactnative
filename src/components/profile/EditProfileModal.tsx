
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { MapPin, Briefcase, GraduationCap, Globe, Linkedin, Twitter, Facebook, Instagram } from "lucide-react";

interface SocialLinks {
  website?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    name: string;
    headline: string;
    location: string;
    batch: string;
    department: string;
    bio: string;
    socialLinks: SocialLinks;
  };
  onSave: (updatedProfile: {
    name?: string;
    headline?: string;
    location?: string;
    batch?: string;
    department?: string;
    bio?: string;
    socialLinks?: SocialLinks;
  }) => void;
}

const EditProfileModal = ({ isOpen, onClose, profile, onSave }: EditProfileModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    headline: "",
    location: "",
    batch: "",
    department: "",
    bio: "",
    socialLinks: {
      website: "",
      linkedin: "",
      twitter: "",
      facebook: "",
      instagram: ""
    }
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        headline: profile.headline || "",
        location: profile.location || "",
        batch: profile.batch || "",
        department: profile.department || "",
        bio: profile.bio || "",
        socialLinks: {
          website: profile.socialLinks?.website || "",
          linkedin: profile.socialLinks?.linkedin || "",
          twitter: profile.socialLinks?.twitter || "",
          facebook: profile.socialLinks?.facebook || "",
          instagram: profile.socialLinks?.instagram || ""
        }
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as object),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEnterToNext = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    const form = event.currentTarget.form;
    if (!form) return;
    event.preventDefault();
    const focusable = Array.from(
      form.querySelectorAll<HTMLElement>("input, textarea, [role='combobox']")
    ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
    const currentIndex = focusable.indexOf(event.currentTarget);
    const nextField = focusable[currentIndex + 1];
    nextField?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      toast({
        title: "Name is required",
        description: "Please enter your name to continue.",
        variant: "destructive",
      });
      return;
    }
    
    onSave(formData);
    toast({
      title: "Profile updated",
      description: "Your profile has been successfully updated.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription className="sr-only">
            Update your profile information.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your full name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="headline">Professional Headline</Label>
            <Input 
              id="headline"
              name="headline"
              value={formData.headline}
              onChange={handleChange}
              placeholder="E.g., Software Engineer at Tech Company | Computer Science '20"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Location
              </Label>
              <Input 
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="City, Country"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="batch" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" /> Batch / Class Year
              </Label>
              <Input 
                id="batch"
                name="batch"
                value={formData.batch}
                onChange={handleChange}
                placeholder="Class of 20XX"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="department" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Department / Major
            </Label>
            <Input 
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="E.g., Computer Science"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">About</Label>
            <Textarea 
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Write a short bio about yourself"
              rows={4}
            />
          </div>
          
          <Accordion type="single" collapsible className="pt-2">
            <AccordionItem value="social-links" className="border-white/10">
              <AccordionTrigger className="py-2 text-sm font-medium text-white/80 hover:no-underline">
                Social Links
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="website" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Website
                    </Label>
                    <Input 
                      id="website"
                      name="socialLinks.website"
                      value={formData.socialLinks.website}
                      onChange={handleChange}
                      placeholder="https://yourwebsite.com"
                      onKeyDown={handleEnterToNext}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="linkedin" className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" /> LinkedIn
                    </Label>
                    <Input 
                      id="linkedin"
                      name="socialLinks.linkedin"
                      value={formData.socialLinks.linkedin}
                      onChange={handleChange}
                      placeholder="yourusername"
                      onKeyDown={handleEnterToNext}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="twitter" className="flex items-center gap-2">
                      <Twitter className="h-4 w-4" /> Twitter
                    </Label>
                    <Input 
                      id="twitter"
                      name="socialLinks.twitter"
                      value={formData.socialLinks.twitter}
                      onChange={handleChange}
                      placeholder="yourusername"
                      onKeyDown={handleEnterToNext}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="facebook" className="flex items-center gap-2">
                      <Facebook className="h-4 w-4" /> Facebook
                    </Label>
                    <Input 
                      id="facebook"
                      name="socialLinks.facebook"
                      value={formData.socialLinks.facebook}
                      onChange={handleChange}
                      placeholder="yourusername"
                      onKeyDown={handleEnterToNext}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="instagram" className="flex items-center gap-2">
                      <Instagram className="h-4 w-4" /> Instagram
                    </Label>
                    <Input 
                      id="instagram"
                      name="socialLinks.instagram"
                      value={formData.socialLinks.instagram}
                      onChange={handleChange}
                      placeholder="yourusername"
                      onKeyDown={handleEnterToNext}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;
