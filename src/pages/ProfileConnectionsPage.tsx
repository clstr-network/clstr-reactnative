import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileConnections from "@/components/profile/ProfileConnections";
import { useProfile } from "@/contexts/ProfileContext";
import { isValidUuid } from "@clstr/shared/utils/uuid";

const ProfileConnectionsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile: currentProfile, isLoading: currentProfileLoading } = useProfile();

  const profileId = id || currentProfile?.id || "";
  const isCurrentUser = !id || id === currentProfile?.id;
  const hasInvalidRouteId = Boolean(id) && !isValidUuid(id);

  if (hasInvalidRouteId) {
    return (
      <div className="min-h-screen bg-black font-['Space_Grotesk',sans-serif] home-theme">
        <div className="container py-6 px-4 md:px-6">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 text-center">
            <p className="text-white/50">Invalid profile id.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profileId) {
    return (
      <div className="min-h-screen bg-black font-['Space_Grotesk',sans-serif] home-theme">
        <div className="container py-6 px-4 md:px-6">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 text-center">
            <p className="text-white/50">Profile not found.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentProfileLoading && id && currentProfile?.id && id !== currentProfile.id) {
    return (
      <div className="min-h-screen bg-black font-['Space_Grotesk',sans-serif] home-theme">
        <div className="container py-6 px-4 md:px-6">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 text-center space-y-4">
            <p className="text-white/50">You can only view and manage your own connections.</p>
            <Button
              variant="outline"
              className="border-white/15 bg-white/10 text-white hover:bg-white/[0.15]"
              onClick={() => navigate(`/profile/${currentProfile.id}/connections`)}
            >
              Go to my connections
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-['Space_Grotesk',sans-serif] home-theme">
      <div className="container py-4 md:py-6 px-4 md:px-6 pb-20 md:pb-6 max-w-2xl">
        {/* Back nav */}
        <Button
          variant="ghost"
          className="mb-4 text-white/50 hover:text-white/70 hover:bg-white/[0.06] -ml-2 gap-2"
          onClick={() => navigate(id ? `/profile/${id}` : "/profile")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Button>

        {/* Connections */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
          <h1 className="text-xl font-bold text-white mb-4">Connections</h1>
          <ProfileConnections
            profileId={profileId}
            isCurrentUser={isCurrentUser}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileConnectionsPage;
