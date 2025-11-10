import * as fs from "fs";
import { startCalculation, getResult } from "./api-client";

// const MAX_REQUESTS = 5;
const MIN_CALC_TIME = 2000;
const INPUT_FILE = "input.txt";
const OUTPUT_FILE = "output.txt";
const RECOVERY_TIME = 1000;
const POLLING_BALANCE_DELAY = 500;
const CHECK_SERVER_INTERVAL = 10000;

async function main() {
  console.log("No streaming");
  const inputData = fs.readFileSync(INPUT_FILE, "utf-8");

  const lines = inputData.split("\n");
  const numbers = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]) {
      numbers.push(Number(lines[i]));
    }
  }

  //Delete file before
  if (fs.existsSync(OUTPUT_FILE)) {
    fs.unlinkSync(OUTPUT_FILE);
  }

  console.log(`Loaded ${numbers.length} numbers`);

  const workQueue = new Map();
  let currentIndex = 0;
  let requestCount = 0;
  let maxRequests = 5;
  let checkServer = Date.now();

  // There are numbers to send or still wait for results
  while (currentIndex < numbers.length || workQueue.size > 0) {
    // there is place and numbers
    while (workQueue.size < maxRequests && currentIndex < numbers.length) {
      const num = numbers[currentIndex];
      currentIndex++;

      try {
        const reqId = await startCalculation(num);
        workQueue.set(reqId, { num, sentTime: Date.now() });

        if (Date.now() - checkServer > CHECK_SERVER_INTERVAL) {
          maxRequests++;
          checkServer = Date.now();
          console.log(`Check server limit again: ${maxRequests}`);
        }
      } catch (error: any) {
        currentIndex = currentIndex - 1;
        if (error?.response?.status === 403) {
          console.log("Got error 403, need to wait before retry...");
          maxRequests = Math.max(1, workQueue.size);
          console.log(`Server capacity: ${maxRequests}`);
          await new Promise((resolve) => setTimeout(resolve, RECOVERY_TIME));
        } else {
          throw error;
        }
      }
    }

    const promisesArray = Array.from(workQueue.entries())
      .filter(([reqId, data]) => {
        return Date.now() - data.sentTime >= MIN_CALC_TIME;
      })
      .map(async ([reqId, data]) => {
        requestCount++;
        const result = await getResult(reqId);
        return { reqId, num: data.num, result };
      });

    const results = await Promise.allSettled(promisesArray);

    for (const promiseResult of results) {
      if (promiseResult.status === "fulfilled") {
        const { reqId, num, result } = promiseResult.value;
        if (result !== null) {
          fs.appendFileSync(OUTPUT_FILE, `${num},${result}\n`);
          workQueue.delete(reqId);
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLLING_BALANCE_DELAY));
  }

  console.log(`Total requests made: ${requestCount}`);
}

main();
