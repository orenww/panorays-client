import axios from "axios";

const SERVER_URL = "http://localhost:9005";

export async function startCalculation(number: number): Promise<string> {
  const response = await axios.post(SERVER_URL, { data: number });
  return response.data.request_id;
}

export async function getResult(requestId: string): Promise<number | null> {
  try {
    const response = await axios.get(`${SERVER_URL}?request_id=${requestId}`);
    return response.data.result;
  } catch (error: any) {
    if (error.response?.status === 400) {
      // console.log(error.response.data);
      return null;
    }
    throw error;
  }
}
