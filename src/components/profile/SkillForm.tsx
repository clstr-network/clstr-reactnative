
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SkillFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (skill: SkillItem) => void;
  initialData?: SkillItem;
  isEdit?: boolean;
  isLoading?: boolean;
}

export type SkillLevel = "Beginner" | "Intermediate" | "Expert" | "Professional";

export interface SkillItem {
  id?: string;
  name: string;
  level: SkillLevel;
}

const SkillForm = ({ isOpen, onClose, onSave, initialData, isEdit = false, isLoading = false }: SkillFormProps) => {
  const [formData, setFormData] = useState<Omit<SkillItem, "id">>({
    name: '',
    level: "Intermediate"
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        level: initialData.level
      });
    } else {
      setFormData({
        name: '',
        level: "Intermediate"
      });
    }
  }, [initialData, isOpen]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      name: e.target.value
    }));
  };

  const handleLevelChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      level: value as SkillLevel
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      ...formData,
      id: initialData?.id
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Skill' : 'Add Skill'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Skill Name</Label>
            <Input 
              id="name"
              name="name"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="E.g., JavaScript, Project Management, Marketing"
              required
            />
          </div>
          
          <div className="space-y-3">
            <Label>Proficiency Level</Label>
            <RadioGroup 
              value={formData.level} 
              onValueChange={handleLevelChange}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Beginner" id="beginner" />
                <Label htmlFor="beginner">Beginner</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Intermediate" id="intermediate" />
                <Label htmlFor="intermediate">Intermediate</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Expert" id="expert" />
                <Label htmlFor="expert">Expert</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Professional" id="professional" />
                <Label htmlFor="professional">Professional</Label>
              </div>
            </RadioGroup>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Skill')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SkillForm;
