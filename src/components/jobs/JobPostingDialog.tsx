import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createJob, CreateJobInput } from '@/lib/jobs-api';

interface JobPostingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onJobCreated?: () => void;
}

const JOB_TYPES = [
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
    { value: 'freelance', label: 'Freelance' },
];

const EXPERIENCE_LEVELS = [
    { value: 'entry', label: 'Entry Level' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior Level' },
    { value: 'lead', label: 'Lead/Manager' },
    { value: 'executive', label: 'Executive' },
];

const JOB_CATEGORIES = [
    { value: 'engineering', label: 'Engineering' },
    { value: 'design', label: 'Design' },
    { value: 'product', label: 'Product' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'sales', label: 'Sales' },
    { value: 'finance', label: 'Finance' },
    { value: 'operations', label: 'Operations' },
    { value: 'hr', label: 'Human Resources' },
    { value: 'other', label: 'Other' },
];

const WORK_MODES = [
    { value: 'onsite', label: 'On-site' },
    { value: 'remote', label: 'Remote' },
    { value: 'hybrid', label: 'Hybrid' },
];

export function JobPostingDialog({ open, onOpenChange, onJobCreated }: JobPostingDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<Partial<CreateJobInput>>({
        job_title: '',
        company_name: '',
        description: '',
        location: '',
        job_type: 'full-time',
        category: 'engineering',
        experience_level: 'entry',
        work_mode: 'onsite',
        required_skills: [],
        application_method: 'email',
    });
    const [skillsInput, setSkillsInput] = useState('');

    const handleInputChange = (field: keyof CreateJobInput, value: string | number | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.job_title || !formData.company_name || !formData.description || !formData.location) {
            toast({
                title: 'Missing required fields',
                description: 'Please fill in all required fields.',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);

        // Parse skills from comma-separated input
        const skills = skillsInput
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        const { job, error } = await createJob({
            ...formData as CreateJobInput,
            required_skills: skills,
        });

        setIsSubmitting(false);

        if (error) {
            toast({
                title: 'Failed to post job',
                description: error,
                variant: 'destructive',
            });
            return;
        }

        toast({
            title: 'Job posted successfully!',
            description: `Your job posting "${job?.job_title}" is now live.`,
        });

        // Reset form
        setFormData({
            job_title: '',
            company_name: '',
            description: '',
            location: '',
            job_type: 'full-time',
            category: 'engineering',
            experience_level: 'entry',
            work_mode: 'onsite',
            required_skills: [],
            application_method: 'email',
        });
        setSkillsInput('');

        onOpenChange(false);
        onJobCreated?.();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Post a New Job</DialogTitle>
                    <DialogDescription>
                        Create a job posting to reach students and alumni in your network.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="job_title">Job Title *</Label>
                            <Input
                                id="job_title"
                                placeholder="e.g. Software Engineer"
                                value={formData.job_title}
                                onChange={(e) => handleInputChange('job_title', e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company_name">Company Name *</Label>
                            <Input
                                id="company_name"
                                placeholder="e.g. Acme Inc."
                                value={formData.company_name}
                                onChange={(e) => handleInputChange('company_name', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Job Description *</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe the role, responsibilities, and what you're looking for..."
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            rows={4}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="location">Location *</Label>
                            <Input
                                id="location"
                                placeholder="e.g. San Francisco, CA"
                                value={formData.location}
                                onChange={(e) => handleInputChange('location', e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="work_mode">Work Mode</Label>
                            <Select
                                value={formData.work_mode}
                                onValueChange={(value) => handleInputChange('work_mode', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select work mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    {WORK_MODES.map((mode) => (
                                        <SelectItem key={mode.value} value={mode.value}>
                                            {mode.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="job_type">Job Type</Label>
                            <Select
                                value={formData.job_type}
                                onValueChange={(value) => handleInputChange('job_type', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {JOB_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) => handleInputChange('category', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {JOB_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="experience_level">Experience Level</Label>
                            <Select
                                value={formData.experience_level}
                                onValueChange={(value) => handleInputChange('experience_level', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select level" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EXPERIENCE_LEVELS.map((level) => (
                                        <SelectItem key={level.value} value={level.value}>
                                            {level.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="salary_min">Salary Min (Optional)</Label>
                            <Input
                                id="salary_min"
                                type="number"
                                placeholder="e.g. 50000"
                                value={formData.salary_min || ''}
                                onChange={(e) => handleInputChange('salary_min', parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="salary_max">Salary Max (Optional)</Label>
                            <Input
                                id="salary_max"
                                type="number"
                                placeholder="e.g. 80000"
                                value={formData.salary_max || ''}
                                onChange={(e) => handleInputChange('salary_max', parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="skills">Required Skills (comma-separated)</Label>
                        <Input
                            id="skills"
                            placeholder="e.g. React, TypeScript, Node.js"
                            value={skillsInput}
                            onChange={(e) => setSkillsInput(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="application_email">Application Email</Label>
                            <Input
                                id="application_email"
                                type="email"
                                placeholder="jobs@company.com"
                                value={formData.application_email || ''}
                                onChange={(e) => handleInputChange('application_email', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="application_deadline">Application Deadline</Label>
                            <Input
                                id="application_deadline"
                                type="date"
                                value={formData.application_deadline || ''}
                                onChange={(e) => handleInputChange('application_deadline', e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-white/10 hover:bg-white/[0.15]"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Posting...
                                </>
                            ) : (
                                'Post Job'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
