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
  file: File | null,
  platforms: string[]
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

  // Step 4: Generate scope of work based on platform selection
  const platformTypes = platforms.length > 0 ? platforms.join(" and ") : "Web App";
  
  const webAppTemplate = `project:
  title: "<Project_Name>"
  version: "1.0"
  prepared_by: "<Your_Name>"
  prepared_for: "<Client_Name>"
  date: "<Date>"

overview:
  summary: >
    The <Project_Name> platform is a web-based system designed to streamline 
    <Business_Function> through a structured workflow for vendors and administrators. 
    This document defines the modules, PRD coverage, and core features.

objectives:
  - "Develop a secure, scalable, and modular web platform."
  - "Enable vendors to manage submissions, documents, and updates."
  - "Allow administrators to review, approve, and monitor vendor activity."
  - "Provide analytics and reporting tools for visibility and control."

deliverables:
  - "Product Requirements Document (PRD)"
  - "User Flow & Information Architecture"
  - "UI/UX Wireframes"
  - "Module & Feature Implementation"
  - "API and Integration Documentation"
  - "Quality Assurance & Testing Plan"
  - "UAT Support and Technical Documentation"

modules:
  - name: "Authentication & User Management"
    description: "Handles all vendor, admin, and sub-user access and control."
    features:
      - "User registration and onboarding flow"
      - "Role-based access control"
      - "Forgot password and email verification"
      - "User profile management"

  - name: "Vendor Panel"
    description: "Vendor-side interface for managing submissions, uploads, and approvals."
    features:
      - "Upload and manage documents"
      - "View submission status and feedback"
      - "Edit and resubmit rejected items"
      - "Notification center for updates"

  - name: "Admin Panel"
    description: "Admin interface for reviewing, approving, and managing vendor activities."
    features:
      - "Dashboard with pending reviews and metrics"
      - "Approve/reject submissions with comments"
      - "Role & permission management"
      - "Exportable reports"

  - name: "Communication & Notifications"
    description: "System-driven communication for status updates and alerts."
    features:
      - "Email and in-app notifications"
      - "Templated messages for approvals and rejections"
      - "Customizable notification rules"

  - name: "Reports & Analytics"
    description: "Performance monitoring and insight generation."
    features:
      - "Vendor activity reports"
      - "Submission trends and summary dashboards"
      - "Export to Excel/PDF"
      - "Filters and date-based reports"

  - name: "Integrations"
    description: "Third-party integrations for extended functionality."
    features:
      - "Payment gateway integration (if applicable)"
      - "CRM or ERP sync"
      - "API/webhook-based data exchange"
      - "Email service provider integration"

non_functional_requirements:
  - "Scalable architecture supporting <X> concurrent users."
  - "Response time under <Y> seconds for key transactions."
  - "Data encryption at rest and in transit."
  - "Responsive design for all device sizes."
  - "Code documentation and maintainability compliance."

assumptions:
  - "Client provides all content, credentials, and third-party access before development."
  - "Feature additions or scope changes will trigger a change request."
  - "APIs from external systems will be available and stable."

out_of_scope:
  - "Unspecified modules or future enhancements."
  - "Content creation or data migration beyond defined scope."
  - "Post-launch support unless explicitly mentioned."

acceptance_criteria:
  - "All core modules implemented as per PRD."
  - "QA and UAT sign-off achieved."
  - "Documentation and code handover completed."`;

  const mobileAppTemplate = `project:
  title: "<Project_Name>"
  version: "1.0"
  prepared_by: "<Your_Name>"
  prepared_for: "<Client_Name>"
  date: "<Date>"

overview:
  summary: >
    The <Project_Name> mobile application is designed to deliver a seamless, 
    mobile-first experience focused on <App_Goal> (e.g., crew communication, 
    learning, or operational efficiency). 
    This scope outlines modules, PRDs, and features across the mobile ecosystem.

objectives:
  - "Develop a user-friendly and high-performance mobile app."
  - "Deliver core experiences across defined modules aligned with business goals."
  - "Ensure offline support, responsiveness, and optimized performance."
  - "Establish a scalable foundation for future releases."

deliverables:
  - "Product Requirements Document (PRD)"
  - "Information Architecture & User Flows"
  - "UI/UX Wireframes & Prototypes"
  - "Functional Modules & Features Implementation"
  - "API Documentation & Backend Integration Details"
  - "QA & Testing Plan"
  - "UAT Support and App Handover"

modules:
  - name: "Onboarding & Authentication"
    description: "User registration, login, and onboarding experience."
    features:
      - "Login via email/SSO"
      - "User onboarding screens"
      - "Password reset and verification"
      - "Profile setup flow"

  - name: "Home Dashboard"
    description: "Main landing module with access to primary features."
    features:
      - "Personalized welcome and highlights"
      - "Quick navigation to modules"
      - "Latest updates and announcements"

  - name: "<Core_Module_Name>"
    description: "Primary feature module (e.g., Training, Task Management, Ordering, etc.)"
    features:
      - "<Feature_1>"
      - "<Feature_2>"
      - "<Feature_3>"
      - "<Feature_4>"

  - name: "Notifications & Alerts"
    description: "Real-time communication and system alerts."
    features:
      - "Push notifications for key updates"
      - "In-app notification center"
      - "Customizable alert preferences"

  - name: "Settings & Preferences"
    description: "Manage personal settings and app preferences."
    features:
      - "Dark/light mode toggle"
      - "Language and region settings"
      - "Manage permissions and notifications"

  - name: "Admin/Back-office Dashboard (if applicable)"
    description: "Web dashboard for admin management of app data and users."
    features:
      - "Manage user accounts and roles"
      - "Upload and manage content"
      - "Track usage metrics"
      - "Generate reports"

non_functional_requirements:
  - "Mobile app optimized for both iOS and Android."
  - "Offline support for critical modules."
  - "Secure data storage (encrypted local and API)."
  - "Smooth animations and optimized loading performance."
  - "Scalable backend architecture supporting <X> active users."

assumptions:
  - "All assets, content, and credentials will be provided by the client."
  - "App store accounts (Google/Apple) will be managed by the client or shared for release."
  - "Third-party SDKs will be provided prior to development."

out_of_scope:
  - "Feature requests not listed in this document."
  - "Post-launch analytics setup unless specified."
  - "Maintenance and support beyond agreed warranty."

acceptance_criteria:
  - "All defined modules functional as per PRD."
  - "UAT and store submission completed successfully."
  - "Documentation and credentials handed over."

sign_off:
  client_representative: "<Client_Name>"
  project_owner: "<Your_Name>"
  approval_status: "Pending"`;

  let sowPrompt = `Based on the problem, insights, and features, draft a comprehensive scope of work in YAML format for a ${platformTypes} project.`;
  
  if (platforms.includes("Web App") && platforms.includes("Mobile App")) {
    sowPrompt += `\n\nGenerate TWO complete SOWs:\n1. First, generate the Web App SOW using this template:\n${webAppTemplate}\n\n2. Then, generate the Mobile App SOW using this template:\n${mobileAppTemplate}\n\nFill in all placeholders with relevant information based on the problem statement. Replace <Project_Name>, <Business_Function>, <App_Goal>, <Core_Module_Name>, <Feature_X>, etc. with actual values.`;
  } else if (platforms.includes("Web App")) {
    sowPrompt += `\n\nUse this YAML template:\n${webAppTemplate}\n\nFill in all placeholders with relevant information based on the problem statement. Replace <Project_Name>, <Business_Function>, etc. with actual values.`;
  } else if (platforms.includes("Mobile App")) {
    sowPrompt += `\n\nUse this YAML template:\n${mobileAppTemplate}\n\nFill in all placeholders with relevant information based on the problem statement. Replace <Project_Name>, <App_Goal>, <Core_Module_Name>, <Feature_X>, etc. with actual values.`;
  }

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
          content: sowPrompt
        }
      ],
      max_tokens: 3000,
      temperature: 0.7,
    }),
  });

  if (!scopeResponse.ok) {
    const error = await scopeResponse.json();
    throw new Error(error.error?.message || "Failed to generate scope of work from OpenAI");
  }

  const scopeData = await scopeResponse.json();
  const scopeOfWork = scopeData.choices[0].message.content;

  // Step 5: Generate AI tools recommendations
  const aiToolsResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
          content: `Features: ${features.join(", ")}`
        },
        {
          role: "user",
          content: `Analyze the specific features from the SOW and recommend ONLY the AI tools that are directly needed for this project.

For each feature in the SOW that could benefit from AI:
1. Identify the specific capability needed (e.g., "vendor document OCR", "admin dashboard analytics", "real-time chat support")
2. Recommend the most cost-effective AI tool for that specific need
3. Explain WHY this feature needs AI and HOW the tool solves it
4. Include actual pricing

Available AI tools by category:
- Voice/Speech: Whisper API ($0.006/min), ElevenLabs ($0.30/1K chars), AssemblyAI ($0.00025/sec)
- Text/LLM: DeepSeek ($0.14/$0.28 per 1M tokens - cheapest), GPT-4o-mini ($0.15/$0.60 per 1M tokens), GPT-4o ($2.50/$10.00 per 1M tokens), Claude Sonnet ($3/$15 per 1M tokens), Gemini Flash ($0.075/$0.30 per 1M tokens - fast & cheap)
- Image Generation: DALL-E 3 ($0.04-0.08/image), Stable Diffusion ($0.002/image via Replicate), Flux Schnell (free via Replicate)
- Image Analysis: GPT-4o Vision ($2.50 per 1M tokens), Claude Sonnet Vision ($3 per 1M tokens), Gemini Vision ($0.075 per 1M tokens)
- Embeddings: OpenAI text-embedding-3-small ($0.02 per 1M tokens), Cohere ($0.10 per 1M tokens)
- Vector DB: Pinecone ($70/mo for 1M vectors), Supabase pgvector (free up to 500MB)

Return as JSON:
{
  "categories": [
    {
      "category": "Document Processing",
      "tools": [
        {
          "name": "GPT-4o Vision",
          "useCase": "Vendor document verification & OCR",
          "reason": "Can extract text from invoices/contracts, validate document fields. At $2.50 per 1M input tokens (~1,500 pages), cheaper than dedicated OCR for low volumes. Handles various document formats without preprocessing."
        }
      ]
    }
  ]
}

CRITICAL: Only include tools that map to actual features in the SOW. If no AI is needed for a feature, don't mention it. Be specific about which SOW feature each tool addresses.`
        }
      ],
      max_tokens: 1500,
      temperature: 0.7,
      response_format: { type: "json_object" }
    }),
  });

  if (!aiToolsResponse.ok) {
    const error = await aiToolsResponse.json();
    throw new Error(error.error?.message || "Failed to generate AI tools recommendations");
  }

  const aiToolsData = await aiToolsResponse.json();
  const aiToolsJson = JSON.parse(aiToolsData.choices[0].message.content);
  const aiTools = aiToolsJson.categories || [];

  return {
    insights,
    features,
    scopeOfWork,
    aiTools,
  };
};
