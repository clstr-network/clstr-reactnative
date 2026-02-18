
import { useState } from 'react';
import SharedItems from '@/components/ecocampus/SharedItems';
import Requests from '@/components/ecocampus/Requests';
import MyListings from '@/components/ecocampus/MyListings';
import NewPostDialog from '@/components/ecocampus/NewPostDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { useFeatureAccess, useRouteGuard } from '@/hooks/useFeatureAccess';

const EcoCampus = () => {
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'shared' | 'requests' | 'mylistings'>('shared');
  
  // FINAL Matrix Permissions for EcoCampus:
  // canViewEcoCampus: Student ✅, Alumni 🚫, Faculty ✅, Club 🚫
  // canShareItems: Student ✅, Alumni 🚫, Faculty ✅, Club 🚫
  // canRequestItems: Student ✅, Alumni 🚫, Faculty ✅, Club 🚫
  const { canViewEcoCampus, canShareItems } = useFeatureAccess();
  
  // Route guard - redirect Alumni and Clubs away from EcoCampus
  useRouteGuard(canViewEcoCampus, '/home');

  return (
    <>
      <SEO
        title="EcoCampus - Campus Sustainability Marketplace"
        description="Buy, sell, and trade sustainable items with your campus community. Reduce waste, save money, and promote eco-friendly living."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "EcoCampus Marketplace",
          description: "Campus peer-to-peer sustainability marketplace for sharing and trading items.",
          about: {
            "@type": "Thing",
            name: "Sustainable Campus Living",
          },
        }}
      />
      <div className="home-theme bg-[#000000] min-h-screen text-white">
        <div className="container py-6 px-4 md:px-6 pb-20 md:pb-6 max-w-7xl mx-auto">
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  EcoCampus
                </h1>
                <p className="text-white/50 text-sm">Share, trade, and request items across your campus</p>
              </div>
              {canShareItems && (
                <Button 
                  onClick={() => setIsNewPostOpen(true)}
                  className="bg-white/10 hover:bg-white/15 text-white border border-white/15 inline-flex items-center px-3 sm:px-4"
                  aria-label="Create new EcoCampus post"
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">New Post</span>
                </Button>
              )}
            </div>

            {/* Tabs — translucent container matching Network */}
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-1 flex gap-1">
              {([
                { key: 'shared', label: 'Shared Items' },
                { key: 'requests', label: 'Requests' },
                { key: 'mylistings', label: 'My Listings' },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-white/[0.10] text-white border border-white/15'
                      : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'shared' && <SharedItems />}
            {activeTab === 'requests' && <Requests />}
            {activeTab === 'mylistings' && <MyListings />}
          </div>

          {/* Dialog for creating new posts */}
          <NewPostDialog open={isNewPostOpen} onOpenChange={setIsNewPostOpen} />
        </div>
      </div>
    </>
  );
};

export default EcoCampus;
