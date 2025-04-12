import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

export async function generateImage(prompt) {
  const positivePrompt = `((masterpiece)),(best quality), high res, official art, ultra detailed, ${prompt}`;
  const negativePrompt = "nsfw, nudity, nude, nudes, sexy";
  const taskId = uuidv4();

  const response = await fetch('https://api.runware.ai/v1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.FLUX_API_KEY}`
    },
    body: JSON.stringify([
      {
        taskType: 'imageInference',
        includeCost: true,
        taskUUID: taskId,
        positivePrompt,
        negativePrompt,
        CFGScale: 7,
        width: 1024,
        height: 768,
        steps: 4,
        modelId: 'runware:100@1',
        numberResults: 1
      }
    ])
  });

  const result = await response.json();
  return result?.data?.[0]?.imageURL || null;
}