import ProfileProjects from "@/components/profile/ProfileProjects";

interface ProjectsTabProps {
  projects: {
    id: string;
    title: string;
    description: string;
    link: string;
    imageUrl: string;
  }[];
  isCurrentUser: boolean;
  onProjectsChange?: () => void;
}

const ProjectsTab = ({ projects, isCurrentUser, onProjectsChange }: ProjectsTabProps) => {
  return (
    <div>
      <ProfileProjects
        projects={projects}
        isEditable={isCurrentUser}
        onProjectsChange={onProjectsChange}
      />
    </div>
  );
};

export default ProjectsTab;
