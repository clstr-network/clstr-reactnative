import { useState } from 'react';
import { Loader2, Upload, Link as LinkIcon, FileText } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { applyToJob, Job } from '@/lib/jobs-api';

interface JobApplicationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    job: Job | null;
    onApplicationSubmitted?: () => void;
}

export function JobApplicationDialog({
    open,
    onOpenChange,
    job,
    onApplicationSubmitted
}: JobApplicationDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resumeUrl, setResumeUrl] = useState('');
    const [coverLetter, setCoverLetter] = useState('');
    const [portfolioUrl, setPortfolioUrl] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!job) return;

        if (!resumeUrl) {
            toast({
                title: 'Resume required',
                description: 'Please provide a link to your resume.',
                variant: 'destructive',
            });
            return;
        }

        // Validate URL format
        try {
            new URL(resumeUrl);
        } catch {
            toast({
                title: 'Invalid resume URL',
                description: 'Please provide a valid URL to your resume (e.g., Google Drive, Dropbox link).',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);

        const { application, error } = await applyToJob({
            job_id: job.id,
            resume_url: resumeUrl,
            cover_letter: coverLetter || undefined,
            portfolio_url: portfolioUrl || undefined,
        });

        setIsSubmitting(false);

        if (error) {
            toast({
                title: 'Application failed',
                description: error,
                variant: 'destructive',
            });
            return;
        }

        toast({
            title: 'Application submitted!',
            description: `Your application for ${job.job_title} at ${job.company_name} has been submitted.`,
        });

        // Reset form
        setResumeUrl('');
        setCoverLetter('');
        setPortfolioUrl('');

        onOpenChange(false);
        onApplicationSubmitted?.();
    };

    if (!job) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Apply for {job.job_title}</DialogTitle>
                    <DialogDescription>
                        Submit your application to {job.company_name}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="p-4 bg-white/[0.04] rounded-lg space-y-2">
                        <h4 className="font-medium">{job.job_title}</h4>
                        <p className="text-sm text-white/60">{job.company_name} • {job.location}</p>
                        <p className="text-sm text-white/60">{job.job_type}</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="resumeUrl" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Resume URL *
                        </Label>
                        <Input
                            id="resumeUrl"
                            type="url"
                            placeholder="https://drive.google.com/your-resume.pdf"
                            value={resumeUrl}
                            onChange={(e) => setResumeUrl(e.target.value)}
                            required
                        />
                        <p className="text-xs text-white/60">
                            Provide a link to your resume (Google Drive, Dropbox, or any public URL)
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="portfolioUrl" className="flex items-center gap-2">
                            <LinkIcon className="h-4 w-4" />
                            Portfolio URL (Optional)
                        </Label>
                        <Input
                            id="portfolioUrl"
                            type="url"
                            placeholder="https://yourportfolio.com"
                            value={portfolioUrl}
                            onChange={(e) => setPortfolioUrl(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                        <Textarea
                            id="coverLetter"
                            placeholder="Tell the employer why you're a great fit for this role..."
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            rows={5}
                        />
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
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Submit Application
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
