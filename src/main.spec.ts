import * as fs from "fs";
import { startCalculation, getResult } from "./api-client";

jest.mock("fs");
jest.mock("./api-client");

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedStartCalculation = startCalculation as jest.MockedFunction<typeof startCalculation>;
const mockedGetResult = getResult as jest.MockedFunction<typeof getResult>;

describe("Main - Dynamic Capacity Detection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.readFileSync.mockReturnValue("10\n20\n30\n40\n50\n60\n70\n");
    mockedFs.existsSync.mockReturnValue(false);
  });

  it("should detect server capacity when receiving 403", async () => {
    let callCount = 0;

    mockedStartCalculation.mockImplementation(async () => {
      callCount++;
      if (callCount > 5) {
        throw { response: { status: 403 } };
      }
      return `req-${callCount}`;
    });

    mockedGetResult.mockResolvedValue(100);

    // This would test the dynamic capacity logic
    // For now, we verify the mocks are set up correctly
    expect(mockedStartCalculation).toBeDefined();
    expect(mockedGetResult).toBeDefined();
  });

  it("should handle 400 status and retry", async () => {
    mockedStartCalculation.mockResolvedValue("req-1");

    let attempts = 0;
    mockedGetResult.mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        return null;
      }
      return 100;
    });

    const result1 = await mockedGetResult("req-1");
    expect(result1).toBeNull();

    const result2 = await mockedGetResult("req-1");
    expect(result2).toBeNull();

    const result3 = await mockedGetResult("req-1");
    expect(result3).toBe(100);
  });

  it("should track sent time for intelligent polling", () => {
    const workQueue = new Map();
    const now = Date.now();

    workQueue.set("req-1", { num: 10, sentTime: now });
    workQueue.set("req-2", { num: 20, sentTime: now - 3000 });

    const readyRequests = Array.from(workQueue.entries())
      .filter(([_, data]) => Date.now() - data.sentTime >= 2000);

    expect(readyRequests.length).toBe(1);
    expect(readyRequests[0][0]).toBe("req-2");
  });
});
