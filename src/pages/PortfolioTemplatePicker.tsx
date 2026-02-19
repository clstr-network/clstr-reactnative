/**
 * PortfolioTemplatePicker.tsx — Same exact flow as the showcase's TemplatePicker.tsx
 *
 * Template selection grid with:
 * - 4 templates in a 2-col grid
 * - Thumbnail preview (initial-letter fallback since no JPG asset files)
 * - "Preview with My Data" hover button → opens full-screen modal
 * - "Apply Template" button in header
 * - "Use This Template" button inside modal
 * - "Current" badge on active template
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, X, Eye, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePortfolioEditor } from "@/hooks/usePortfolioEditor";
import { useProfile } from "@/contexts/ProfileContext";
import type { TemplateId, ProfileData } from "@clstr/shared/types/portfolio";
import { PORTFOLIO_TEMPLATES as templates } from "@clstr/shared/types/portfolio";
import MinimalTemplate from "@/components/profile/portfolio/MinimalTemplate";
import ElianaTemplate from "@/components/profile/portfolio/ElianaTemplate";
import TypefolioTemplate from "@/components/profile/portfolio/TypefolioTemplate";
import GeekyTemplate from "@/components/profile/portfolio/GeekyTemplate";

function TemplatePreview({ profile }: { profile: ProfileData }) {
  switch (profile.settings.template) {
    case "eliana":
      return <ElianaTemplate profile={profile} />;
    case "typefolio":
      return <TypefolioTemplate profile={profile} />;
    case "geeky":
      return <GeekyTemplate profile={profile} />;
    default:
      return <MinimalTemplate profile={profile} />;
  }
}

function TemplateCard({
  template,
  isCurrent,
  onSelect,
  onPreview,
}: {
  template: (typeof templates)[number];
  isCurrent: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={onSelect}
      className={`group relative cursor-pointer rounded-2xl overflow-hidden border-2 transition-colors ${
        isCurrent
          ? "border-white bg-white/[0.06]"
          : "border-white/10 hover:border-white/30 bg-white/[0.03]"
      }`}
    >
      {/* Thumbnail / Placeholder */}
      <div className="aspect-[3/4] bg-gradient-to-br from-white/[0.06] to-white/[0.02] flex items-center justify-center relative overflow-hidden">
        <span className="text-7xl font-bold text-white/10 select-none">
          {template.name.charAt(0)}
        </span>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="bg-white text-black hover:bg-white/90 gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview with My Data
          </Button>
        </div>
      </div>
      {/* Label */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <p className="text-white font-medium">{template.name}</p>
          <p className="text-white/40 text-sm">{template.description}</p>
        </div>
        {isCurrent && (
          <Badge className="bg-white text-black text-xs font-semibold">
            Current
          </Badge>
        )}
      </div>
    </motion.div>
  );
}

export default function PortfolioTemplatePicker() {
  const { profile: currentProfile, isLoading: isProfileLoading } = useProfile();
  const { profile, isLoading, updateSettings } = usePortfolioEditor(currentProfile?.id);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateId | null>(null);
  const navigate = useNavigate();

  if (!isProfileLoading && !currentProfile) return <Navigate to="/login" replace />;

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white/30 text-sm">Loading templates…</div>
      </div>
    );
  }

  const currentTemplate = profile.settings.template;
  const selectedTemplate = previewTemplate || currentTemplate;

  const applyTemplate = (tid: TemplateId) => {
    updateSettings({ template: tid });
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/10"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to="/portfolio/editor">
              <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-white">Choose a Template</h1>
          </div>
          <Button
            onClick={() => navigate("/portfolio/editor")}
            className="bg-white text-black hover:bg-white/90 gap-2 font-semibold"
          >
            <Check className="w-4 h-4" />
            Apply Template
          </Button>
        </div>
      </motion.div>

      {/* Template Grid */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              isCurrent={currentTemplate === t.id}
              onSelect={() => applyTemplate(t.id)}
              onPreview={() => setPreviewTemplate(t.id)}
            />
          ))}
        </div>
      </div>

      {/* Full-Screen Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg"
          >
            {/* Modal header */}
            <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center gap-3">
                <p className="text-white font-medium">
                  Preview: {templates.find((t) => t.id === previewTemplate)?.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    applyTemplate(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="bg-white text-black hover:bg-white/90 gap-2 font-semibold"
                >
                  <Check className="w-4 h-4" />
                  Use This Template
                </Button>
                <Button
                  onClick={() => setPreviewTemplate(null)}
                  variant="ghost"
                  size="icon"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            {/* Template render area */}
            <div className="h-full overflow-y-auto pt-16">
              <TemplatePreview
                profile={{
                  ...profile,
                  settings: { ...profile.settings, template: previewTemplate },
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
