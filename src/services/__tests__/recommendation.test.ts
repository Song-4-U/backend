import { describe, it, expect, vi, beforeEach } from "vitest";
import { recommendByTimbre } from "../recommendation.js";
import { embedAudio, classifyAudio } from "../inference.js";
import { findSimilarSongs } from "../../db/songs.repository.js";

// 모듈 모킹
vi.mock("../inference.js", () => ({
  embedAudio: vi.fn(),
  classifyAudio: vi.fn(),
}));

vi.mock("../../db/songs.repository.js", () => ({
  findSimilarSongs: vi.fn(),
}));

vi.mock("../s3.js", () => ({
  createDownloadPresignedUrl: vi.fn().mockResolvedValue("https://presigned-get-url"),
}));

describe("recommendByTimbre", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("오디오 음색을 자동으로 분류하고 유사한 곡을 필터링 및 반환한다", async () => {
    // given
    const mockRequest = {
      s3_key: "uploads/2026/05/25/test.webm",
      gender: "female",
      vocal_range: "soprano",
      genre: "ballad",
      top_k: 5,
    };

    const mockEmbedding = Array(512).fill(0.1);
    const mockClassification = {
      predicted_label: "Husky",
      scores: [
        { label: "Normal", score: 0.1 },
        { label: "Husky", score: 0.85 },
        { label: "Clear", score: 0.05 },
      ],
    };

    const mockSongs = [
      {
        id: "song-uuid-1",
        title: "Test Song 1",
        artist: "Test Artist 1",
        timbre_label: "Husky",
        url: "https://streaming.url/1",
        genre: "ballad",
        gender: "female",
        vocal_range: "soprano",
        similarity: 0.95,
      },
    ];

    vi.mocked(embedAudio).mockResolvedValue(mockEmbedding);
    vi.mocked(classifyAudio).mockResolvedValue(mockClassification);
    vi.mocked(findSimilarSongs).mockResolvedValue(mockSongs);

    // when
    const response = await recommendByTimbre(mockRequest);

    // then
    expect(embedAudio).toHaveBeenCalledWith(
      expect.objectContaining({ key: mockRequest.s3_key }),
      expect.any(Object)
    );
    expect(classifyAudio).toHaveBeenCalledWith(
      expect.objectContaining({ key: mockRequest.s3_key }),
      expect.any(Object)
    );
    expect(findSimilarSongs).toHaveBeenCalledWith({
      timbreLabel: "Husky",
      embedding: mockEmbedding,
      gender: "female",
      vocalRange: "soprano",
      genre: "ballad",
      topK: 5,
    });

    expect(response).toEqual({
      query: {
        predicted_timbre_label: "Husky",
        gender: "female",
        vocal_range: "soprano",
        genre: "ballad",
        top_k: 5,
      },
      items: mockSongs,
    });
  });
});
