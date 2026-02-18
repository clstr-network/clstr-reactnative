import { Edit3, MessageSquare, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfileActionsProps {
  isCurrentUser: boolean;
  connectionStatus: string | null;
  isConnecting: boolean;
  onConnect: () => void;
  onMessage: () => void;
  onEditProfile: () => void;
}

const ProfileActions = ({
  isCurrentUser,
  connectionStatus,
  isConnecting,
  onConnect,
  onMessage,
  onEditProfile,
}: ProfileActionsProps) => {
  if (isCurrentUser) {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 gap-2 h-10 rounded-xl border-white/15 bg-white/10 text-white hover:bg-white/[0.15] hover:text-white"
          onClick={onEditProfile}
        >
          <Edit3 className="h-4 w-4" />
          Edit Profile
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl border-white/15 bg-white/10 text-white/50 hover:bg-white/[0.15] hover:text-white"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="flex-1 gap-2 h-10 rounded-xl border-white/15 bg-white/10 text-white hover:bg-white/[0.15] hover:text-white"
        onClick={onMessage}
      >
        <MessageSquare className="h-4 w-4" />
        Message
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-xl border-white/15 bg-white/10 text-white/50 hover:bg-white/[0.15] hover:text-white"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ProfileActions;
