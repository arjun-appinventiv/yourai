import { API_KEY_STORAGE } from "@/components/ApiKeyConfig";
import type { AnalysisResult } from "@/pages/Index";

const getApiKey = (): string => {
  const key = localStorage.getItem(API_KEY_STORAGE);
  if (!key) {
    throw new Error("OpenAI API key not configured. Please add your API key first.");
  }
  return key;
};

const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeProb = async (
  problemText: string,
  file: File | null
): Promise<AnalysisResult> => {
  const apiKey = getApiKey();

  // Step 1: Prepare the problem statement
  let fullProblem = problemText;
  
  const messages: any[] = [
    {
      role: "system",
      content: "You are an expert product analyst. Analyze problem statements and provide insights on similar solutions, suggest features, and draft scope of work."
    }
  ];

  if (file) {
    if (file.type.startsWith("image/")) {
      const base64 = await readFileAsBase64(file);
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this problem statement. Image provided may contain additional context.\n\nProblem: ${problemText || "See attached image"}`
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${file.type};base64,${base64}`
            }
          }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: `Analyze this problem statement. A PDF was uploaded but cannot be processed directly. Focus on the text description.\n\nProblem: ${problemText}`
      });
    }
  } else {
    messages.push({
      role: "user",
      content: `Analyze this problem statement:\n\n${problemText}`
    });
  }

  // Step 2: Get insights about similar solutions
  const insightsResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        ...messages,
        {
          role: "user",
          content: "Based on this problem, provide insights on how similar problems have been solved by other companies. Include any notable successes or failures. Be concise but informative (2-3 paragraphs)."
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    }),
  });

  if (!insightsResponse.ok) {
    const error = await insightsResponse.json();
    throw new Error(error.error?.message || "Failed to get insights from OpenAI");
  }

  const insightsData = await insightsResponse.json();
  const insights = insightsData.choices[0].message.content;

  // Step 3: Generate feature list
  const featuresResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        ...messages,
        {
          role: "assistant",
          content: insights
        },
        {
          role: "user",
          content: "Based on the problem and insights, suggest 5-8 key features that a product solving this problem should have. Return as a JSON array of strings, each feature being a concise description."
        }
      ],
      max_tokens: 600,
      temperature: 0.7,
      response_format: { type: "json_object" }
    }),
  });

  if (!featuresResponse.ok) {
    const error = await featuresResponse.json();
    throw new Error(error.error?.message || "Failed to generate features from OpenAI");
  }

  const featuresData = await featuresResponse.json();
  const featuresJson = JSON.parse(featuresData.choices[0].message.content);
  const features = featuresJson.features || Object.values(featuresJson)[0] || [];

  // Step 4: Generate scope of work
  const scopeResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        ...messages,
        {
          role: "assistant",
          content: `Insights: ${insights}\n\nFeatures: ${features.join(", ")}`
        },
        {
          role: "user",
          content: "Based on the problem, insights, and features, draft a comprehensive scope of work. Include project phases, timeline estimates, deliverables, and key considerations. Be professional and detailed (3-4 paragraphs)."
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!scopeResponse.ok) {
    const error = await scopeResponse.json();
    throw new Error(error.error?.message || "Failed to generate scope of work from OpenAI");
  }

  const scopeData = await scopeResponse.json();
  const scopeOfWork = scopeData.choices[0].message.content;

  return {
    insights,
    features,
    scopeOfWork,
  };
};
