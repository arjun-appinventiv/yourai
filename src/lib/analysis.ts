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
          content: `Analyze this problem and provide detailed market insights in a structured format.

Research and provide:
1. **Case Studies** (2-3 companies): Real companies that tried to solve similar problems
   - Company name
   - What approach/solution they tried
   - Key features they implemented (3-5 specific features)
   - Where and why they failed or struggled (specific reasons)

2. **Recommendations**: Based on these case studies, what should be avoided (3-5 specific recommendations)

Return as JSON:
{
  "caseStudies": [
    {
      "company": "Company Name",
      "approach": "Brief description of their solution approach",
      "features": ["Feature 1", "Feature 2", "Feature 3"],
      "failures": ["Specific failure/struggle point 1", "Why it failed 2"]
    }
  ],
  "recommendations": [
    "Avoid X because it leads to Y",
    "Don't implement Z without considering A"
  ]
}

Be specific with real examples, actual company names, and concrete details. Focus on lessons learned.`
        }
      ],
      max_tokens: 1200,
      temperature: 0.7,
      response_format: { type: "json_object" }
    }),
  });

  if (!insightsResponse.ok) {
    const error = await insightsResponse.json();
    throw new Error(error.error?.message || "Failed to get insights from OpenAI");
  }

  const insightsData = await insightsResponse.json();
  const insights = JSON.parse(insightsData.choices[0].message.content);

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
          content: JSON.stringify(insights)
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
  
  const webAppTemplate = `# [Project Name]

## Project Overview
A comprehensive web-based system designed to [describe main purpose]. This document outlines the complete scope of work, deliverables, and implementation approach.

**Prepared for:** [Client Name]  
**Version:** 1.0  
**Date:** [Current Date]

## Objectives
- Develop a secure, scalable, and modular web platform
- Enable efficient workflow management for vendors and administrators
- Provide comprehensive analytics and reporting capabilities
- Ensure seamless user experience across all modules

## Key Deliverables
1. Product Requirements Document (PRD)
2. User Flow & Information Architecture
3. UI/UX Wireframes and Design System
4. Complete Module Implementation
5. API and Integration Documentation
6. Quality Assurance & Testing Plan
7. UAT Support and Technical Documentation

## Core Modules & Features

### Authentication & User Management
Comprehensive user access control system handling all authentication and authorization needs.

**Features:**
- User registration with email verification
- Role-based access control (RBAC)
- Secure password reset flow
- Multi-factor authentication
- User profile management
- Session management

### Vendor Panel
Vendor-facing interface for managing submissions, documents, and tracking status.

**Features:**
- Document upload and management system
- Real-time submission status tracking
- Edit and resubmit rejected items
- In-app notification center
- Activity history and audit logs

### Admin Panel
Administrative dashboard for reviewing, managing, and monitoring vendor activities.

**Features:**
- Comprehensive metrics dashboard
- Approval/rejection workflow with comments
- User and role management
- Advanced filtering and search
- Bulk operations support
- Exportable reports (Excel/PDF)

### Communication & Notifications
Automated communication system for keeping users informed.

**Features:**
- Email notifications with templates
- In-app notification system
- SMS alerts for critical updates
- Customizable notification preferences
- Real-time status updates

### Reports & Analytics
Business intelligence and reporting module for insights and monitoring.

**Features:**
- Vendor performance analytics
- Submission trends and statistics
- Custom date range reports
- Export capabilities (Excel, PDF, CSV)
- Visual dashboards with charts
- Automated report scheduling

### Integrations
Third-party service integrations for extended functionality.

**Features:**
- Payment gateway integration
- CRM/ERP system sync
- API/webhook infrastructure
- Email service provider integration
- Cloud storage integration
- SSO (Single Sign-On) support

## Technical Requirements

### Performance
- Support for 1,000+ concurrent users
- Page load time under 2 seconds
- API response time under 500ms
- 99.9% uptime SLA

### Security
- End-to-end encryption (TLS 1.3)
- Data encryption at rest
- GDPR compliance
- Regular security audits
- Automated backup systems

### Infrastructure
- Scalable cloud architecture
- Responsive design (mobile-first)
- Cross-browser compatibility
- Progressive Web App capabilities
- CDN integration for static assets

## Implementation Approach

### Phase 1: Foundation (Weeks 1-3)
- Project setup and architecture
- Database design and setup
- Authentication system
- Basic UI framework

### Phase 2: Core Development (Weeks 4-8)
- Vendor and Admin panels
- Document management
- Workflow implementation
- Notification system

### Phase 3: Integration & Polish (Weeks 9-11)
- Third-party integrations
- Reports and analytics
- Performance optimization
- Security hardening

### Phase 4: Testing & Launch (Weeks 12-14)
- QA and bug fixes
- UAT with stakeholders
- Documentation completion
- Production deployment

## Assumptions
- Client provides all required content, credentials, and third-party access
- Feature changes will follow formal change request process
- External APIs will be stable and available during development
- Client has necessary licenses for third-party services

## Out of Scope
- Features not explicitly mentioned in this document
- Content creation or copywriting services
- Data migration from legacy systems (unless specified)
- Post-launch maintenance and support (separate agreement)
- Custom integrations not listed above

## Acceptance Criteria
- All modules functional as per specifications
- Performance benchmarks met
- Security audit passed
- QA and UAT sign-off obtained
- Complete documentation delivered
- Production deployment successful

## Sign-off
This scope of work requires approval from both parties before development commences.

**Client Representative:** ___________________  
**Project Owner:** ___________________  
**Date:** ___________________`;

  const mobileAppTemplate = `# [Project Name] - Mobile Application

## Project Overview
A modern mobile application designed to deliver [describe main purpose]. This document defines the complete scope for building a high-performance, user-friendly mobile experience.

**Prepared for:** [Client Name]  
**Version:** 1.0  
**Date:** [Current Date]  
**Platforms:** iOS and Android

## Objectives
- Develop a user-friendly, high-performance mobile application
- Deliver seamless mobile-first experience across all features
- Ensure offline functionality for critical operations
- Build scalable foundation for future enhancements
- Optimize for performance and battery efficiency

## Key Deliverables
1. Product Requirements Document (PRD)
2. Information Architecture & User Flows
3. UI/UX Wireframes & Interactive Prototypes
4. Native Mobile Application (iOS & Android)
5. Backend API & Integration Documentation
6. Comprehensive QA & Testing Report
7. App Store Submission Support
8. UAT Support & Technical Handover

## Core Modules & Features

### Onboarding & Authentication
Seamless user registration and authentication experience.

**Features:**
- Email/phone number registration
- Social login integration (Google, Apple)
- Biometric authentication (Face ID, Touch ID)
- Secure password reset flow
- Interactive onboarding screens
- Profile setup wizard

### Home Dashboard
Main landing screen with personalized content and quick access.

**Features:**
- Personalized welcome screen
- Quick action buttons
- Recent activity feed
- Important notifications
- Search functionality
- Customizable widgets

### [Primary Module Name]
Core feature module tailored to the app's main purpose.

**Features:**
- [Feature 1 based on problem statement]
- [Feature 2 based on problem statement]
- [Feature 3 based on problem statement]
- Real-time updates
- Offline mode support
- Data synchronization

### Notifications & Alerts
Intelligent notification system keeping users informed.

**Features:**
- Push notifications
- In-app notification center
- Notification preferences
- Smart notification grouping
- Action-based notifications
- Do not disturb mode

### User Profile & Settings
Comprehensive settings and preference management.

**Features:**
- Profile editing and customization
- Dark/light theme toggle
- Language and region settings
- Notification preferences
- Privacy and security settings
- App version and about section

### [Secondary Module - if applicable]
Additional functionality supporting the core experience.

**Features:**
- [Relevant features based on SOW]
- Analytics and tracking
- Export/share capabilities

## Admin Dashboard (Web-based)
Web interface for managing app content and monitoring usage.

**Features:**
- User management and moderation
- Content management system
- Analytics and reporting
- Configuration management
- Push notification composer
- User activity monitoring

## Technical Requirements

### Mobile Performance
- App launch time under 2 seconds
- Smooth 60 FPS animations
- Memory usage optimization
- Battery-efficient operation
- Offline functionality for core features
- Background sync capabilities

### Security
- Secure data storage (encrypted)
- API communication over HTTPS
- Certificate pinning
- Biometric authentication
- Session management
- Secure token storage

### Platform Support
- iOS 14+ compatibility
- Android 8+ compatibility
- Tablet optimization
- Various screen sizes support
- Accessibility compliance (WCAG 2.1)

### Backend Infrastructure
- RESTful API architecture
- Real-time updates (WebSocket/SSE)
- Scalable cloud hosting
- CDN for media delivery
- Automated backups
- API rate limiting

## Implementation Approach

### Phase 1: Foundation (Weeks 1-3)
- Project architecture setup
- API development
- Authentication implementation
- Basic UI framework and navigation

### Phase 2: Core Features (Weeks 4-7)
- Main module development
- Dashboard implementation
- Offline functionality
- Push notifications

### Phase 3: Secondary Features (Weeks 8-10)
- Additional modules
- Admin dashboard
- Analytics integration
- Performance optimization

### Phase 4: Testing & Launch (Weeks 11-14)
- Comprehensive testing (QA)
- Beta testing program
- Bug fixes and polish
- App store submission
- Production deployment

## Platform-Specific Considerations

### iOS
- SwiftUI/UIKit implementation
- App Store guidelines compliance
- TestFlight beta testing
- Apple Design Guidelines adherence

### Android
- Material Design 3 implementation
- Play Store guidelines compliance
- Google Play beta testing
- Android-specific optimizations

## Assumptions
- Client provides all assets, content, and credentials
- App Store accounts managed by client or shared for release
- Third-party SDK keys provided before integration
- Client handles legal compliance (privacy policy, terms)
- Server infrastructure provided or approved by client

## Out of Scope
- Features not explicitly listed in this document
- Advanced AR/VR capabilities
- Complex AI/ML model training
- Post-launch marketing and ASO
- Ongoing maintenance (separate agreement)
- Custom hardware integration

## Acceptance Criteria
- All defined modules fully functional
- Performance benchmarks achieved
- Security audit passed
- Both iOS and Android apps tested
- UAT completed successfully
- App store submissions approved
- Documentation and source code delivered

## Sign-off
This scope requires approval before development begins.

**Client Representative:** ___________________  
**Project Owner:** ___________________  
**Date:** ___________________`;

  let sowPrompt = `Based on the problem, insights, and features, create a comprehensive, professional Scope of Work document for a ${platformTypes} project.

Format as a well-structured document with clear headings (use # for H1, ## for H2, ### for H3).`;
  
  if (platforms.includes("Web App") && platforms.includes("Mobile App")) {
    sowPrompt += `\n\nGenerate TWO complete SOWs:\n\n1. FIRST, create the Web App SOW following this structure:\n${webAppTemplate}\n\n---\n\n2. THEN, create the Mobile App SOW following this structure:\n${mobileAppTemplate}\n\nReplace all placeholders like [Project Name], [Client Name], [describe main purpose], [Feature 1], etc. with actual relevant content based on the problem statement. Be specific and detailed. Make it professional and implementation-ready.`;
  } else if (platforms.includes("Web App")) {
    sowPrompt += `\n\nFollow this structure:\n${webAppTemplate}\n\nReplace all placeholders like [Project Name], [Client Name], [describe main purpose], etc. with actual relevant content based on the problem statement. Be specific and detailed. Make it professional and implementation-ready.`;
  } else if (platforms.includes("Mobile App")) {
    sowPrompt += `\n\nFollow this structure:\n${mobileAppTemplate}\n\nReplace all placeholders like [Project Name], [Client Name], [describe main purpose], [Feature 1], etc. with actual relevant content based on the problem statement. Be specific and detailed. Make it professional and implementation-ready.`;
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
          content: `Insights: ${JSON.stringify(insights)}\n\nFeatures: ${features.join(", ")}`
        },
        {
          role: "user",
          content: sowPrompt
        }
      ],
      max_tokens: 4000,
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
