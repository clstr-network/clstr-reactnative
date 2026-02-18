
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface EducationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (education: EducationItem) => void;
  initialData?: EducationItem;
  isEdit?: boolean;
  isLoading?: boolean;
}

export interface EducationItem {
  id?: string;
  degree: string;
  school: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

const EducationForm = ({ isOpen, onClose, onSave, initialData, isEdit = false, isLoading = false }: EducationFormProps) => {
  const [formData, setFormData] = useState<EducationItem>({
    degree: '',
    school: '',
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
        degree: '',
        school: '',
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
      id: initialData?.id || `edu-${new Date().getTime()}`
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] bg-[#0a0a0a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{isEdit ? 'Edit Education' : 'Add Education'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="degree" className="text-white/70">Degree</Label>
            <Input 
              id="degree"
              name="degree"
              value={formData.degree}
              onChange={handleChange}
              placeholder="E.g., Bachelor of Science in Computer Science"
              required
              className="bg-white/[0.04] border-white/10 text-white/80 placeholder:text-white/30 focus-visible:ring-white/20"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="school" className="text-white/70">School</Label>
            <Input 
              id="school"
              name="school"
              value={formData.school}
              onChange={handleChange}
              placeholder="E.g., University Name"
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
              placeholder="E.g., City, State"
              className="bg-white/[0.04] border-white/10 text-white/80 placeholder:text-white/30 focus-visible:ring-white/20"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-white/70">Start Year</Label>
              <Input 
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                placeholder="E.g., 2016"
                required
                className="bg-white/[0.04] border-white/10 text-white/80 placeholder:text-white/30 focus-visible:ring-white/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-white/70">End Year</Label>
              <Input 
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                placeholder="E.g., 2020 or Present"
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
              placeholder="Add details about your education, majors, activities, achievements, etc."
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
              {isLoading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Education')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EducationForm;
