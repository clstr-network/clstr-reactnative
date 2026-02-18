import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { HelpCircle, Mail, BookOpen } from "lucide-react";
import BlobButton from "@/components/BlobButton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Sparkle from "@/components/Sparkle";

const supportFormUrl = "https://forms.cloud.microsoft/r/7HPbPj3Rq8";

const faqItems = [
  { question: "How do I verify my campus identity?", answer: "Sign up with an academic email to unlock verified access to Clstr features and communities." },
  { question: "Can I browse Clstr without an account?", answer: "Yes. Public pages like features, clubs, and events are available for discovery before you join." },
  { question: "How do I get support?", answer: "Use the Clstr support form for account access, verification, or platform questions." },
  { question: "What makes Clstr different?", answer: "Clstr combines verified campus identity with structured data to make discovery reliable and citation-ready." },
];

const PublicHelpCenter = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: "Clstr Help Center",
    url: "https://clstr.network/help-center",
    mainEntity: faqItems.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
    publisher: { "@type": "Organization", name: "Clstr", url: "https://clstr.network" },
  };

  return (
    <div className="landing-theme">
      <SEO title="Help Center" description="Get quick answers about Clstr and learn how to access support." jsonLd={jsonLd} />
      <Navbar />

      <div className="relative bg-black min-h-screen overflow-hidden">
        <Sparkle className="top-24 left-[15%]" size={32} delay={0} />
        <Sparkle className="top-32 right-[20%]" size={24} delay={0.5} />
        <div className="absolute top-[15%] left-[20%] w-3 h-3 bg-solana-cyan rotate-45" />
        <div className="absolute top-[20%] right-[25%] w-4 h-4 bg-solana-yellow rounded-full" />

        <div className="relative z-10 container mx-auto px-6 py-16 md:py-24">
          <header className="text-center max-w-4xl mx-auto mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-solana-cyan mb-4">Resources</p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="text-[#c8ff00]">Help Center</span>
              <br />
              <span className="text-white">for campus collaboration</span>
            </h1>
            <p className="text-white/40 text-lg md:text-xl mb-10">
              Find fast, reliable answers to the most common questions about Clstr and campus networking.
            </p>
          </header>

          <section className="max-w-5xl mx-auto mb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1a1a1a] rounded-2xl p-8 text-center">
                <div className="w-12 h-12 bg-solana-cyan rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <HelpCircle className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Quick answers</h3>
                <p className="text-white/40 text-sm">Public pages explain Clstr features before you sign up.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-8 text-center">
                <div className="w-12 h-12 bg-solana-yellow rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <Mail className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Personalized support</h3>
                <p className="text-white/40 text-sm">Verified accounts unlock detailed help and reports.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-8 text-center">
                <div className="w-12 h-12 bg-solana-green rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <BookOpen className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">AI-ready</h3>
                <p className="text-white/40 text-sm">Optimized for quick, cited answers.</p>
              </div>
            </div>
          </section>

          <section className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Frequently asked questions</h2>
            <div className="grid gap-4">
              {faqItems.map((faq) => (
                <div key={faq.question} className="bg-[#1a1a1a] rounded-2xl p-6 hover:bg-[#222222] transition-colors">
                  <h3 className="text-lg font-semibold text-white mb-2">{faq.question}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="text-center bg-[#1a1a1a] rounded-3xl p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Need more <span className="text-solana-cyan">help?</span></h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto mb-8">
              Submit a support request and we will follow up with next steps.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a href={supportFormUrl} target="_blank" rel="noreferrer">
                <BlobButton>Submit a support request</BlobButton>
              </a>
              <Link to="/contact" className="text-white font-medium text-sm tracking-wider px-6 py-3 rounded-full border border-white/30 hover:bg-white/10 transition-colors">Contact the team</Link>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PublicHelpCenter;
