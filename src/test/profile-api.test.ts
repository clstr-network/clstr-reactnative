import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  addExperience,
  updateExperience,
  deleteExperience,
  getExperiences,
  addEducation,
  updateEducation,
  deleteEducation,
  getEducation,
  addSkill,
  updateSkill,
  deleteSkill,
  getSkills,
  getConnections,
  addConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  removeConnection,
} from "@/lib/profile-api";

// Hoist mocks
const { mockFrom, mockAuthGetUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockAuthGetUser: vi.fn(),
}));

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
    auth: { getUser: mockAuthGetUser },
  },
}));

// Mock error handler
vi.mock("@/lib/errorHandler", () => ({
  handleApiError: vi.fn((err) => {
    throw err;
  }),
}));

type ChainableBuilder = {
  select?: ReturnType<typeof vi.fn>;
  or?: ReturnType<typeof vi.fn>;
  single?: ReturnType<typeof vi.fn>;
  insert?: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
  eq?: ReturnType<typeof vi.fn>;
  delete?: ReturnType<typeof vi.fn>;
  order?: ReturnType<typeof vi.fn>;
};

describe("Profile API - Experience CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  it("should add a new experience", async () => {
    const mockExperience = {
      id: "exp-1",
      profile_id: "user-123",
      title: "Software Engineer",
      company: "Tech Corp",
      location: "Remote",
      start_date: "2022-01-01",
      end_date: "2024-01-01",
      description: "Built cool things",
    };

    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockExperience, error: null }),
    });

    const result = await addExperience("user-123", {
      title: "Software Engineer",
      company: "Tech Corp",
      location: "Remote",
      start_date: "2022-01-01",
      end_date: "2024-01-01",
      description: "Built cool things",
    });

    expect(result).toEqual(mockExperience);
    expect(mockFrom).toHaveBeenCalledWith("profile_experience");
  });

  it("should update an experience", async () => {
    const mockUpdated = {
      id: "exp-1",
      profile_id: "user-123",
      title: "Senior Software Engineer",
      company: "Tech Corp",
      location: "Remote",
      start_date: "2022-01-01",
      end_date: "2024-01-01",
      description: "Led the team",
    };

    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockUpdated, error: null }),
    });

    const result = await updateExperience("exp-1", {
      title: "Senior Software Engineer",
      description: "Led the team",
    });

    expect(result).toEqual(mockUpdated);
  });

  it("should delete an experience", async () => {
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    await deleteExperience("exp-1");

    expect(mockFrom).toHaveBeenCalledWith("profile_experience");
  });

  it("should get all experiences for a profile", async () => {
    const mockExperiences = [
      {
        id: "exp-1",
        profile_id: "user-123",
        title: "Software Engineer",
        company: "Tech Corp",
      },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockExperiences, error: null }),
    });

    const result = await getExperiences("user-123");

    expect(result).toEqual(mockExperiences);
  });
});

describe("Profile API - Education CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  it("should add a new education entry", async () => {
    const mockEducation = {
      id: "edu-1",
      profile_id: "user-123",
      degree: "B.Tech",
      school: "MIT",
      location: "Cambridge",
      start_date: "2018-01-01",
      end_date: "2022-01-01",
      description: "Computer Science",
    };

    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockEducation, error: null }),
    });

    const result = await addEducation("user-123", {
      degree: "B.Tech",
      school: "MIT",
      location: "Cambridge",
      start_date: "2018-01-01",
      end_date: "2022-01-01",
      description: "Computer Science",
    });

    expect(result).toEqual(mockEducation);
    expect(mockFrom).toHaveBeenCalledWith("profile_education");
  });

  it("should update an education entry", async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    });

    await updateEducation("edu-1", { degree: "M.Tech" });

    expect(mockFrom).toHaveBeenCalledWith("profile_education");
  });

  it("should delete an education entry", async () => {
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    await deleteEducation("edu-1");

    expect(mockFrom).toHaveBeenCalledWith("profile_education");
  });

  it("should get all education entries for a profile", async () => {
    const mockEducation = [
      {
        id: "edu-1",
        profile_id: "user-123",
        degree: "B.Tech",
        school: "MIT",
      },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockEducation, error: null }),
    });

    const result = await getEducation("user-123");

    expect(result).toEqual(mockEducation);
  });
});

describe("Profile API - Skills CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  it("should add a new skill", async () => {
    const mockSkill = {
      id: "skill-1",
      profile_id: "user-123",
      name: "React",
      level: "Expert",
    };

    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockSkill, error: null }),
    });

    const result = await addSkill("user-123", { name: "React", level: "Expert" });

    expect(result).toEqual(mockSkill);
    expect(mockFrom).toHaveBeenCalledWith("profile_skills");
  });

  it("should update a skill", async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    });

    await updateSkill("skill-1", { level: "Professional" });

    expect(mockFrom).toHaveBeenCalledWith("profile_skills");
  });

  it("should delete a skill", async () => {
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    await deleteSkill("skill-1");

    expect(mockFrom).toHaveBeenCalledWith("profile_skills");
  });

  it("should get all skills for a profile", async () => {
    const mockSkills = [
      {
        id: "skill-1",
        profile_id: "user-123",
        name: "React",
        level: "Expert",
      },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockSkills, error: null }),
    });

    const result = await getSkills("user-123");

    expect(result).toEqual(mockSkills);
  });
});

describe("Profile API - Connections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  it("should get connections for a profile", async () => {
    const profileId = "550e8400-e29b-41d4-a716-446655440000";
    const otherUserId = "2c1a71cb-6a10-4e65-9c7e-7d2b6b40f1b2";
    const connectionId = "7f4a1e2d-0b2a-4b1f-8a58-0a6f2d5f6b1c";

    const mockConnections = [
      {
        id: connectionId,
        requester_id: profileId,
        receiver_id: otherUserId,
        status: "accepted",
        requester: {
          id: profileId,
          full_name: "Jane Doe",
          avatar_url: "https://example.com/avatar-1.png",
        },
        receiver: {
          id: otherUserId,
          full_name: "John Doe",
          avatar_url: "https://example.com/avatar-2.png",
        },
      },
    ];

    const mockProfiles = [
      {
        id: otherUserId,
        full_name: "John Doe",
        avatar_url: "https://example.com/avatar-2.png",
        headline: null,
        role: "student",
      },
    ];

    // First call: connections query
    const orderMock = vi.fn().mockResolvedValue({ data: mockConnections, error: null });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const orMock = vi.fn().mockReturnValue({ eq: eqMock });
    const connectionsSelectMock = vi.fn().mockReturnValue({ or: orMock });

    // Second call: profiles query with .in()
    const inMock = vi.fn().mockResolvedValue({ data: mockProfiles, error: null });
    const profilesSelectMock = vi.fn().mockReturnValue({ in: inMock });

    mockFrom
      .mockReturnValueOnce({ select: connectionsSelectMock })
      .mockReturnValueOnce({ select: profilesSelectMock });

    const result = await getConnections(profileId);

    expect(result[0].profile).toEqual(mockProfiles[0]);
    expect(mockFrom).toHaveBeenCalledWith("connections");
    expect(mockFrom).toHaveBeenCalledWith("profiles");
  });

  it("should add a connection request", async () => {
    const requesterId = "550e8400-e29b-41d4-a716-446655440000";
    const receiverId = "2c1a71cb-6a10-4e65-9c7e-7d2b6b40f1b2";
    const connectionId = "7f4a1e2d-0b2a-4b1f-8a58-0a6f2d5f6b1c";

    const checkBuilder: ChainableBuilder = {};
    checkBuilder.select = vi.fn().mockImplementation(() => checkBuilder);
    checkBuilder.or = vi.fn().mockImplementation(() => checkBuilder);
    checkBuilder.single = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });

    mockFrom.mockReturnValueOnce(checkBuilder);

    const insertBuilder: ChainableBuilder = {};
    insertBuilder.insert = vi.fn().mockImplementation(() => insertBuilder);
    insertBuilder.select = vi.fn().mockImplementation(() => insertBuilder);
    insertBuilder.single = vi.fn().mockResolvedValue({ data: { id: connectionId }, error: null });

    mockFrom.mockReturnValueOnce(insertBuilder);

    await addConnectionRequest(requesterId, receiverId);

    expect(mockFrom).toHaveBeenCalledWith("connections");
  });

  it("should accept a connection request", async () => {
    const connectionId = "7f4a1e2d-0b2a-4b1f-8a58-0a6f2d5f6b1c";

    const builder: ChainableBuilder = {};
    builder.update = vi.fn().mockImplementation(() => builder);
    builder.eq = vi.fn().mockImplementation(() => builder);
    builder.select = vi.fn().mockImplementation(() => builder);
    builder.single = vi.fn().mockResolvedValue({ data: { id: connectionId, status: "accepted" }, error: null });

    mockFrom.mockReturnValue(builder);

    await acceptConnectionRequest(connectionId);

    expect(mockFrom).toHaveBeenCalledWith("connections");
  });

  it("should reject a connection request", async () => {
    const connectionId = "7f4a1e2d-0b2a-4b1f-8a58-0a6f2d5f6b1c";

    const builder: ChainableBuilder = {};
    builder.update = vi.fn().mockImplementation(() => builder);
    builder.eq = vi.fn().mockImplementation(() => builder);
    builder.select = vi.fn().mockImplementation(() => builder);
    builder.single = vi.fn().mockResolvedValue({ data: { id: connectionId, status: "rejected" }, error: null });

    mockFrom.mockReturnValue(builder);

    await rejectConnectionRequest(connectionId);

    expect(mockFrom).toHaveBeenCalledWith("connections");
  });

  it("should remove a connection", async () => {
    const connectionId = "7f4a1e2d-0b2a-4b1f-8a58-0a6f2d5f6b1c";

    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    await removeConnection(connectionId);

    expect(mockFrom).toHaveBeenCalledWith("connections");
  });
});
