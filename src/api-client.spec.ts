import axios from "axios";
import { startCalculation, getResult } from "./api-client";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("API Client", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("startCalculation", () => {
    it("should return request_id when successful", async () => {
      const mockRequestId = "test-id-123";
      mockedAxios.post.mockResolvedValue({
        data: { request_id: mockRequestId },
      });

      const result = await startCalculation(42);

      expect(result).toBe(mockRequestId);
      expect(mockedAxios.post).toHaveBeenCalledWith("http://localhost:9005", {
        data: 42,
      });
    });

    it("should throw error when server returns 403", async () => {
      mockedAxios.post.mockRejectedValue({
        response: { status: 403 },
      });

      await expect(startCalculation(42)).rejects.toEqual({
        response: { status: 403 },
      });
    });
  });

  describe("getResult", () => {
    it("should return result when calculation is complete", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { result: 100 },
      });

      const result = await getResult("test-id");

      expect(result).toBe(100);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "http://localhost:9005?request_id=test-id"
      );
    });

    it("should return null when result is not ready (400)", async () => {
      mockedAxios.get.mockRejectedValue({
        response: { status: 400, data: "still in progress" },
      });

      const result = await getResult("test-id");

      expect(result).toBeNull();
    });

    it("should throw error for non-400 errors", async () => {
      mockedAxios.get.mockRejectedValue({
        response: { status: 500 },
      });

      await expect(getResult("test-id")).rejects.toEqual({
        response: { status: 500 },
      });
    });
  });
});
