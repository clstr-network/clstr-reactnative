/**
 * API barrel — re-exports every API module in @clstr/core.
 *
 * Modules with duplicate export names use explicit named exports to avoid
 * TS2308 ambiguity errors.  The "canonical" owner keeps `export *`; the
 * secondary modules list exports minus the collisions.
 */

// Tier 1 — No cross-deps
export * from "./account";
export * from "./api";
export * from "./clubs-api";
export * from "./portfolio-adapter";
export * from "./portfolio-api";
export * from "./resume-api";
export * from "./search-api";
export * from "./skill-analysis-api";
export * from "./typeahead-search";
export * from "./user-settings";

// Tier 2 — Light cross-deps
export * from "./alumni-identification";
export * from "./alumni-invite-parser";
export * from "./ecocampus-api";
export * from "./email-transition";
export * from "./saved-api";
export * from "./team-ups-api";
export * from "./trending-api";

// Tier 3 — Heavier cross-deps or large surface
export * from "./admin-api";
export * from "./ai-service";

// events-api: exclude Connection (canonical in social-api)
export {
  type EventCreator,
  type Event,
  type EventShare,
  type UpdateEventInput,
  type ConnectionUser,
  // Connection excluded — canonical in social-api
  parseEventTime,
  extractEventType,
  normalizeCreator,
  getEventByIdPublic,
  getEventById,
  registerForEvent,
  unregisterFromEvent,
  trackExternalRegistrationClick,
  type ShareEventDeps,
  shareEvent,
  shareEventToMultiple,
  recordEventLinkCopy,
  getConnectionsForSharing,
  deleteEvent,
  updateEvent,
} from "./events-api";

export * from "./feature-permissions";
export * from "./jobs-api";
export * from "./messages-api";

// permissions: exclude canAccessFeature (canonical in feature-permissions)
export {
  type UserRole,
  type PermissionSet,
  ROLE_PERMISSIONS,
  getPermissions,
  hasPermission,
  canPerformAction,
  getAllowedActions,
  canCreateContentType,
  // canAccessFeature excluded — canonical in feature-permissions
  getRoleDisplayName,
  getRoleDescription,
  canTransitionToRole,
  requiresVerification,
  getRequiredDocuments,
} from "./permissions";

export * from "./profile";

// profile-api: exclude names owned by social-api / projects-api
export {
  // Types excluded — canonical in ../types/ or social-api
  // SkillLevel, ExperienceData, EducationData, SkillData, ProjectData — canonical in types/
  // Connection — canonical in social-api
  addExperience,
  updateExperience,
  deleteExperience,
  getExperiences,
  addEducation,
  updateEducation,
  deleteEducation,
  getEducation,
  updateSkills,
  getSkills,
  addSkill,
  updateSkill,
  deleteSkill,
  addProject,
  updateProject,
  // deleteProject excluded — canonical in projects-api
  uploadProjectImage,
  deleteProjectImage,
  // getProjects excluded — canonical in projects-api
  // getConnections excluded — canonical in social-api
  getPendingConnectionRequests,
  getSentConnectionRequests,
  addConnectionRequest,
  // acceptConnectionRequest excluded — canonical in social-api
  // rejectConnectionRequest excluded — canonical in social-api
  // removeConnection excluded — canonical in social-api
  blockConnection,
  getConnectionCount,
  getProfileViewsCount,
  trackProfileView,
} from "./profile-api";

// projects-api: exclude getMyApplications (canonical in jobs-api)
export {
  type ProjectOwner,
  type Project,
  type ProjectRole,
  type ProjectApplication,
  type ProjectApplicationProject,
  type ProjectApplicationWithProject,
  type GetProjectsParams,
  type CreateProjectParams,
  type ApplyForRoleParams,
  type UpdateApplicationStatusParams,
  getProjects,
  getProject,
  getProjectRoles,
  createProject,
  deleteProject,
  applyForRole,
  getApplicationsForProject,
  getMyProjects,
  // getMyApplications excluded — canonical in jobs-api
  getOwnerApplications,
  updateProjectApplicationStatus,
} from "./projects-api";

// social-api: exclude names owned by messages-api / profile-api
export {
  type ReactionType,
  REACTION_EMOJI_MAP,
  REACTION_LABELS,
  type ReactionCount,
  type ReactionSummary,
  type FeedFilters,
  type GetUserPostsParams,
  type GetPostsParams,
  type GetPostsResponse,
  type PostAttachmentInput,
  type CreatePostPayload,
  type Post,
  type Repost,
  type Comment,
  type Connection,
  // Message excluded — canonical in messages-api
  createPost,
  getPosts,
  getPostsByUser,
  getUserPostsCount,
  getPostByIdPublic,
  getPostById,
  getConnectionStatusesForUsers,
  togglePostLike,
  toggleLike,
  toggleReaction,
  getPostTopReactions,
  getUserReaction,
  likePost,
  unlikePost,
  deletePost,
  updatePost,
  getComments,
  createComment,
  toggleCommentLike,
  editComment,
  deleteComment,
  sendConnectionRequest,
  cancelConnectionRequest,
  getConnectionRequests,
  getConnections,
  updateConnectionStatus,
  acceptConnectionRequest,
  rejectConnectionRequest,
  removeConnection,
  checkConnectionStatus,
  // sendMessage excluded — canonical in messages-api
  // getConversations excluded — canonical in messages-api
  // getMessages excluded — canonical in messages-api
  // markMessagesAsRead excluded — canonical in messages-api
  reportPost,
  undoReportPost,
  hidePost,
  unhidePost,
  sharePost,
  sharePostToMultiple,
  saveItem,
  unsaveItem,
  checkIfSaved,
  getSavedPosts,
  toggleSavePost,
  voteOnPoll,
  hasUserVotedOnPoll,
  countMutualConnections,
  countMutualConnectionsBatch,
  createRepost,
  deleteRepost,
  hasUserReposted,
  getPostReposts,
  getFeedWithReposts,
  getTopCommentsBatch,
  getTopComments,
} from "./social-api";
