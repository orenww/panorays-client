import * as fs from "fs";
import { startCalculation, getResult } from "./api-client";
import * as readline from "readline";

const MAX_REQUESTS = 5;
const MIN_CALC_TIME = 2000;
const INPUT_FILE = "input.txt";
const OUTPUT_FILE = "output.txt";
const RECOVERY_TIME = 1000;

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

  // There are numbers to send or still wait for results
  while (currentIndex < numbers.length || workQueue.size > 0) {
    // there is place and numbers
    while (workQueue.size < MAX_REQUESTS && currentIndex < numbers.length) {
      const num = numbers[currentIndex];
      currentIndex++;

      try {
        const reqId = await startCalculation(num);
        workQueue.set(reqId, num);
      } catch (error) {
        currentIndex = currentIndex - 1;
        setTimeout(() => {}, RECOVERY_TIME);
      }
    }

    for (const [reqId, num] of workQueue) {
      const result = await getResult(reqId);
      if (result !== null) {
        fs.appendFileSync(OUTPUT_FILE, `${num},${result}\n`);
        workQueue.delete(reqId);
      }
    }

    // improve
    await new Promise((resolve) => setTimeout(resolve, MIN_CALC_TIME));
  }
}

main();
