import { beforeEach, describe, expect, it, vi } from "vitest";

import { ValidationError } from "../../lib/errors.js";
import {
  findSimilarProfiles,
  insertVoiceProfile,
} from "../../db/voiceProfiles.repository.js";
import { classifyAudio, embedAudio } from "../inference.js";
import { matchByVoice } from "../voiceMatch.js";

vi.mock("../inference.js", () => ({
  embedAudio: vi.fn(),
  classifyAudio: vi.fn(),
}));

vi.mock("../../db/voiceProfiles.repository.js", () => ({
  findSimilarProfiles: vi.fn(),
  insertVoiceProfile: vi.fn(),
}));

vi.mock("../s3.js", () => ({
  createDownloadPresignedUrl: vi
    .fn()
    .mockResolvedValue("https://presigned-get-url"),
}));

const mockEmbedding = Array(512).fill(0.1);
const mockClassification = {
  predicted_label: "Husky",
  scores: [
    { label: "Normal", score: 0.1 },
    { label: "Husky", score: 0.85 },
    { label: "Clear", score: 0.05 },
  ],
};

const mockMatches = [
  {
    id: "profile-uuid-1",
    display_name: "Aria",
    timbre_label: "Husky",
    gender: "female",
    vocal_range: "soprano",
    audio_url: "uploads/aria.webm",
    similarity: 0.95,
  },
];

describe("matchByVoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(embedAudio).mockResolvedValue(mockEmbedding);
    vi.mocked(classifyAudio).mockResolvedValue(mockClassification);
    vi.mocked(findSimilarProfiles).mockResolvedValue(mockMatches);
    vi.mocked(insertVoiceProfile).mockResolvedValue("me-uuid");
  });

  it("음색을 자동 분류하고 유사 음색 프로필을 반환한다 (저장하지 않는 경우)", async () => {
    const response = await matchByVoice({
      s3_key: "uploads/2026/06/06/test.webm",
      gender: "female",
      vocal_range: "soprano",
      top_k: 5,
    });

    expect(embedAudio).toHaveBeenCalledWith(
      expect.objectContaining({ key: "uploads/2026/06/06/test.webm" }),
      expect.any(Object),
    );
    expect(insertVoiceProfile).not.toHaveBeenCalled();
    expect(findSimilarProfiles).toHaveBeenCalledWith({
      timbreLabel: "Husky",
      embedding: mockEmbedding,
      excludeId: undefined,
      gender: "female",
      vocalRange: "soprano",
      topK: 5,
    });

    expect(response).toEqual({
      query: {
        predicted_timbre_label: "Husky",
        gender: "female",
        vocal_range: "soprano",
        top_k: 5,
      },
      saved_profile_id: null,
      matches: mockMatches,
    });
  });

  it("save_profile=true 면 프로필을 등록하고 본인을 제외해 매칭한다", async () => {
    const response = await matchByVoice({
      s3_key: "uploads/me.webm",
      display_name: "Alex",
      save_profile: true,
      top_k: 10,
    });

    expect(insertVoiceProfile).toHaveBeenCalledWith({
      displayName: "Alex",
      timbreLabel: "Husky",
      embedding: mockEmbedding,
      gender: undefined,
      vocalRange: undefined,
      audioUrl: "uploads/me.webm",
    });
    expect(findSimilarProfiles).toHaveBeenCalledWith(
      expect.objectContaining({ excludeId: "me-uuid" }),
    );
    expect(response.saved_profile_id).toBe("me-uuid");
  });

  it("save_profile=true 인데 display_name 이 없으면 ValidationError", async () => {
    await expect(
      matchByVoice({ s3_key: "uploads/me.webm", save_profile: true }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(embedAudio).not.toHaveBeenCalled();
  });

  it("기본 top_k 는 10 이다", async () => {
    await matchByVoice({ s3_key: "uploads/x.webm" });
    expect(findSimilarProfiles).toHaveBeenCalledWith(
      expect.objectContaining({ topK: 10 }),
    );
  });
});
