
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ExperienceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (experience: ExperienceItem) => void;
  initialData?: ExperienceItem;
  isEdit?: boolean;
  isLoading?: boolean;
}

export interface ExperienceItem {
  id?: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

const ExperienceForm = ({ isOpen, onClose, onSave, initialData, isEdit = false, isLoading = false }: ExperienceFormProps) => {
  const [formData, setFormData] = useState<ExperienceItem>({
    title: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    description: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        description: ''
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: initialData?.id || `exp-${new Date().getTime()}`
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] bg-[#0a0a0a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{isEdit ? 'Edit Experience' : 'Add Experience'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white/70">Job Title</Label>
            <Input 
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="E.g., Software Engineer"
              required
              className="bg-white/[0.04] border-white/10 text-white/80 placeholder:text-white/30 focus-visible:ring-white/20"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="company" className="text-white/70">Company</Label>
            <Input 
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="E.g., Tech Company Inc."
              required
              className="bg-white/[0.04] border-white/10 text-white/80 placeholder:text-white/30 focus-visible:ring-white/20"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location" className="text-white/70">Location</Label>
            <Input 
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="E.g., San Francisco, CA"
              className="bg-white/[0.04] border-white/10 text-white/80 placeholder:text-white/30 focus-visible:ring-white/20"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-white/70">Start Date</Label>
              <Input 
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                placeholder="E.g., Jan 2021"
                required
                className="bg-white/[0.04] border-white/10 text-white/80 placeholder:text-white/30 focus-visible:ring-white/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-white/70">End Date</Label>
              <Input 
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                placeholder="E.g., Present"
                required
                className="bg-white/[0.04] border-white/10 text-white/80 placeholder:text-white/30 focus-visible:ring-white/20"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white/70">Description</Label>
            <Textarea 
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your role, responsibilities, and achievements"
              rows={4}
              className="bg-white/[0.04] border-white/10 text-white/80 placeholder:text-white/30 focus-visible:ring-white/20"
            />
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-white/[0.10] hover:bg-white/[0.15] text-white border border-white/10"
            >
              {isLoading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Experience')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExperienceForm;
