import ProfilePosts from "@/components/profile/ProfilePosts";

interface PostsTabProps {
  profileId: string;
  isCurrentUser: boolean;
  onPostsCountChange?: (count: number) => void;
}

const PostsTab = ({ profileId, isCurrentUser, onPostsCountChange }: PostsTabProps) => {
  return (
    <div>
      <ProfilePosts
        profileId={profileId}
        isCurrentUser={isCurrentUser}
        preview={false}
        onPostsCountChange={onPostsCountChange}
      />
    </div>
  );
};

export default PostsTab;
