import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostsTab from "./tabs/PostsTab";
import AboutTab from "./tabs/AboutTab";
import ProjectsTab from "./tabs/ProjectsTab";
import type { UserProfile } from "@clstr/shared/types/profile";

interface ProfileTabsProps {
  profile: UserProfile;
  isCurrentUser: boolean;
  projectItems: {
    id: string;
    title: string;
    description: string;
    link: string;
    imageUrl: string;
  }[];
  onProjectsChange?: () => void;
  onEditProfile: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onPostsCountChange?: (count: number) => void;
}

const ProfileTabs = ({
  profile,
  isCurrentUser,
  projectItems,
  onProjectsChange,
  onEditProfile,
  activeTab,
  onTabChange,
  onPostsCountChange,
}: ProfileTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
      <TabsList className="grid w-full h-auto grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
        <TabsTrigger
          value="posts"
          className="w-full px-3 py-2 text-xs sm:text-sm font-medium text-white/45"
        >
          Posts
        </TabsTrigger>
        <TabsTrigger
          value="about"
          className="w-full px-3 py-2 text-xs sm:text-sm font-medium text-white/45"
        >
          About
        </TabsTrigger>
        <TabsTrigger
          value="projects"
          className="w-full px-3 py-2 text-xs sm:text-sm font-medium text-white/45"
        >
          Projects
        </TabsTrigger>
      </TabsList>

      <TabsContent value="posts" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
        <PostsTab
          profileId={profile.id}
          isCurrentUser={isCurrentUser}
          onPostsCountChange={onPostsCountChange}
        />
      </TabsContent>

      <TabsContent value="about" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
            <AboutTab
              profile={profile}
              isCurrentUser={isCurrentUser}
              onEditProfile={onEditProfile}
            />
        </div>
      </TabsContent>

      <TabsContent value="projects" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
            <ProjectsTab
              projects={projectItems}
              isCurrentUser={isCurrentUser}
              onProjectsChange={onProjectsChange}
            />
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default ProfileTabs;
