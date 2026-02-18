import { useState } from "react";
import { Search, ChevronDown, ChevronUp, MessageCircle, Mail, FileText, Users, Briefcase, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";

interface FAQItem {
    question: string;
    answer: string;
    category: string;
}

const faqs: FAQItem[] = [
    {
        category: "Account",
        question: "How do I update my profile information?",
        answer: "Go to your Profile page and click the 'Edit Profile' button. You can update your name, headline, bio, skills, and other information from there."
    },
    {
        category: "Account",
        question: "How do I change my password?",
        answer: "Navigate to Settings > Account and click 'Change Password'. You'll receive an email with instructions to reset your password."
    },
    {
        category: "Connections",
        question: "How do I connect with other alumni?",
        answer: "Visit a user's profile and click the 'Connect' button. They'll receive a connection request and can accept or decline it."
    },
    {
        category: "Connections",
        question: "How do I message someone?",
        answer: "You can message any user by visiting their profile and clicking the 'Message' button, or by going to the Messaging page directly."
    },
    {
        category: "Jobs",
        question: "How do I post a job listing?",
        answer: "Go to the Jobs page and click 'Post a Job'. Fill in the job details including title, description, requirements, and location."
    },
    {
        category: "Events",
        question: "How do I create an event?",
        answer: "Navigate to the Events page and click 'Create Event'. You can set up virtual or in-person events with custom details and RSVP options."
    },
    {
        category: "Clubs",
        question: "How do I join a club?",
        answer: "Browse the Clubs page to find clubs that interest you. Click on a club to view details, then click 'Join Club' to become a member."
    },
    {
        category: "Privacy",
        question: "Who can see my profile?",
        answer: "By default, your profile is visible to all platform users. You can change this in Settings > Privacy to limit visibility to connections only or make it private."
    }
];

const categories = [
    { name: "Getting Started", icon: FileText },
    { name: "Connections", icon: Users },
    { name: "Jobs & Career", icon: Briefcase },
    { name: "Events", icon: Calendar },
];

const HelpCenter = () => {
    const { profile } = useProfile();
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    const [contactName, setContactName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactMessage, setContactMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const filteredFaqs = faqs.filter(
        (faq) => {
            const matchesSearch =
                faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = !selectedCategory ||
                faq.category.toLowerCase() === selectedCategory.toLowerCase();
            return matchesSearch && matchesCategory;
        }
    );

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
            toast({
                title: "Missing information",
                description: "Please fill in all fields before submitting.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Insert support ticket into Supabase
            // Note: Type casting used until types are regenerated after migration
            const { error } = await (supabase as unknown as { from: (table: string) => { insert: (data: Record<string, unknown>) => Promise<{ error: Error | null }> } })
                .from('support_tickets')
                .insert({
                    user_id: profile?.id || null,
                    name: contactName.trim(),
                    email: contactEmail.trim(),
                    message: contactMessage.trim(),
                    status: 'open'
                });

            if (error) throw error;

            toast({
                title: "Message sent!",
                description: "Our support team will get back to you within 24-48 hours.",
            });
            setContactName("");
            setContactEmail("");
            setContactMessage("");
        } catch (error) {
            console.error('Error submitting support ticket:', error);
            toast({
                title: "Failed to send message",
                description: "Please try again later or contact support directly.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container py-6 px-4 md:px-6 pb-20 md:pb-6">
            <div className="mb-8 text-center">
                <h1 className="text-2xl md:text-3xl font-bold">Help Center</h1>
                <p className="text-white/60 mt-2">Find answers to common questions or contact our support team</p>
            </div>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-white/60" />
                    <Input
                        type="search"
                        placeholder="Search for help..."
                        className="pl-10 h-12 text-base"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {categories.map((category) => (
                    <Card
                        key={category.name}
                        className={`hover:shadow-md transition-shadow cursor-pointer ${selectedCategory && selectedCategory.toLowerCase().includes(category.name.toLowerCase().split(' ')[0].toLowerCase()) ? 'ring-1 ring-white/20' : ''}`}
                        onClick={() => {
                            const categoryKey = category.name.split(' ')[0];
                            if (selectedCategory && selectedCategory.toLowerCase().includes(categoryKey.toLowerCase())) {
                                setSelectedCategory(null);
                            } else {
                                // Map display names to FAQ categories
                                const categoryMap: Record<string, string> = {
                                    'Getting': 'Account',
                                    'Connections': 'Connections',
                                    'Jobs': 'Jobs',
                                    'Events': 'Events'
                                };
                                setSelectedCategory(categoryMap[categoryKey] || categoryKey);
                            }
                        }}
                    >
                        <CardContent className="p-4 text-center">
                            <category.icon className="h-8 w-8 mx-auto mb-2 text-white/60" />
                            <p className="font-medium text-sm">{category.name}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {selectedCategory && (
                <div className="mb-4 flex items-center gap-2">
                    <span className="text-sm text-white/60">Filtering by:</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCategory(null)}
                    >
                        {selectedCategory} ✕
                    </Button>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                {/* FAQs Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-white/60" />
                            Frequently Asked Questions
                        </CardTitle>
                        <CardDescription>
                            Quick answers to common questions
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {filteredFaqs.length === 0 ? (
                                <p className="text-center text-white/60 py-4">
                                    No questions found matching your search.
                                </p>
                            ) : (
                                filteredFaqs.map((faq, index) => (
                                    <div
                                        key={index}
                                        className="border rounded-lg overflow-hidden"
                                    >
                                        <button
                                            className="w-full p-4 text-left flex justify-between items-center hover:bg-white/[0.06] transition-colors"
                                            onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                                        >
                                            <span className="font-medium pr-4">{faq.question}</span>
                                            {expandedFaq === index ? (
                                                <ChevronUp className="h-5 w-5 flex-shrink-0 text-white/60" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 flex-shrink-0 text-white/60" />
                                            )}
                                        </button>
                                        {expandedFaq === index && (
                                            <div className="px-4 pb-4 text-white/60 text-sm">
                                                {faq.answer}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Support Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-white/60" />
                            Contact Support
                        </CardTitle>
                        <CardDescription>
                            Can't find what you're looking for? Send us a message.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleContactSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    placeholder="Your name"
                                    value={contactName}
                                    onChange={(e) => setContactName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your.email@example.com"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Describe your issue or question..."
                                    rows={5}
                                    value={contactMessage}
                                    onChange={(e) => setContactMessage(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
                                ) : (
                                    'Send Message'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Resources */}
            <Card className="mt-8">
                <CardContent className="p-6">
                    <div className="text-center">
                        <h3 className="font-semibold text-lg mb-2">Need more help?</h3>
                        <p className="text-white/60 text-sm mb-4">
                            Our support team is available Monday to Friday, 9 AM - 6 PM IST
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Button variant="outline" className="gap-2">
                                <Mail className="h-4 w-4" />
                                support@pathwaypartners.com
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default HelpCenter;
