export const tenants = [
  { id:1, name:"Hartwell & Associates", plan:"Team", users:5, workspaces:4, documents:46, status:"Active", created:"Jan 12, 2026", mrr:1495 },
  { id:2, name:"Morrison Legal Group", plan:"Professional", users:3, workspaces:7, documents:128, status:"Active", created:"Jan 28, 2026", mrr:447 },
  { id:3, name:"Chen Partners LLC", plan:"Enterprise", users:12, workspaces:15, documents:340, status:"Active", created:"Feb 3, 2026", mrr:7188 },
  { id:4, name:"Rivera & Kim LLP", plan:"Free", users:1, workspaces:2, documents:12, status:"Active", created:"Feb 14, 2026", mrr:0 },
  { id:5, name:"Patel Law Office", plan:"Professional", users:2, workspaces:3, documents:67, status:"Active", created:"Feb 20, 2026", mrr:298 },
  { id:6, name:"Thornton Compliance", plan:"Team", users:8, workspaces:6, documents:210, status:"Suspended", created:"Mar 1, 2026", mrr:2392 },
  { id:7, name:"Goldstein & Webb", plan:"Free", users:1, workspaces:1, documents:8, status:"Active", created:"Mar 15, 2026", mrr:0 },
  { id:8, name:"Pacific Rim Legal", plan:"Professional", users:4, workspaces:5, documents:95, status:"Active", created:"Mar 22, 2026", mrr:596 }
];

export const globalKBDocs = [
  { id:1, name:"US Legal Practice Guide 2026.pdf", type:"PDF", size:"4.2 MB", uploaded:"Apr 1, 2026", status:"Ready" },
  { id:2, name:"ABA Model Rules Commentary.docx", type:"DOCX", size:"1.8 MB", uploaded:"Apr 1, 2026", status:"Ready" },
  { id:3, name:"Legal AI Disclaimer Templates.pdf", type:"PDF", size:"0.6 MB", uploaded:"Mar 28, 2026", status:"Ready" },
  { id:4, name:"US Federal Court Procedures.pdf", type:"PDF", size:"8.1 MB", uploaded:"Mar 25, 2026", status:"Ready" },
  { id:5, name:"NDA Standard Clauses Library.docx", type:"DOCX", size:"2.3 MB", uploaded:"Mar 20, 2026", status:"Ready" },
  { id:6, name:"Contract Risk Glossary.xlsx", type:"XLSX", size:"0.9 MB", uploaded:"Mar 15, 2026", status:"Ready" },
  { id:7, name:"Due Diligence Checklist Master.pdf", type:"PDF", size:"1.4 MB", uploaded:"Mar 10, 2026", status:"Ready" },
  { id:8, name:"Compliance Audit Framework.pdf", type:"PDF", size:"3.7 MB", uploaded:"Mar 5, 2026", status:"Processing" }
];

export const notifications = [
  { id:1, title:"New Feature: Deliverables Module", target:"All Org Admins", sent:"Apr 1, 2026", reads:38 },
  { id:2, title:"Scheduled Maintenance Apr 5 02:00 UTC", target:"All Org Admins", sent:"Apr 3, 2026", reads:41 },
  { id:3, title:"SOC 2 Evidence Collection Reminder", target:"Enterprise Admins", sent:"Mar 28, 2026", reads:3 }
];

export const auditLog = [
  { id:1, operator:"Arjun P", action:"Impersonated Admin", target:"Hartwell & Associates", time:"Today 09:14" },
  { id:2, operator:"Arjun P", action:"Uploaded KB document", target:"US Legal Practice Guide 2026.pdf", time:"Today 09:22" },
  { id:3, operator:"Dev Team", action:"Suspended org", target:"Thornton Compliance", time:"Mar 30, 2026 14:10" },
  { id:4, operator:"Arjun P", action:"Sent broadcast notification", target:"All Org Admins", time:"Apr 1, 2026 11:00" }
];

export const reportTemplates = [
  { id:1, version:"v1.2", description:"Current active template", uploadedBy:"Arjun P", date:"Apr 1, 2026", status:"Active" },
  { id:2, version:"v1.1", description:"Minor disclaimer update", uploadedBy:"Dev Team", date:"Mar 15, 2026", status:"Archived" },
  { id:3, version:"v1.0", description:"Initial template", uploadedBy:"Arjun P", date:"Feb 1, 2026", status:"Archived" }
];

export const currentUser = {
  name: "Ryan Melade",
  email: "ryan@hartwell.com",
  role: "Admin",
  org: "Hartwell & Associates",
  plan: "Team",
  avatar: "RM"
};

export const orgUsers = [
  { id:1, name:"Ryan Melade",  email:"ryan@hartwell.com",  role:"Admin",   status:"Active",  lastActive:"Today",       avatar:"RM" },
  { id:2, name:"Sarah Chen",   email:"sarah@hartwell.com", role:"Manager", status:"Active",  lastActive:"Today",       avatar:"SC" },
  { id:3, name:"James Wu",     email:"james@hartwell.com", role:"Team",    status:"Active",  lastActive:"Yesterday",   avatar:"JW" },
  { id:4, name:"Maria Torres", email:"maria@hartwell.com", role:"Team",    status:"Active",  lastActive:"2 days ago",  avatar:"MT" },
  { id:5, name:"Tom Bradley",  email:"tom@hartwell.com",   role:"Manager", status:"Invited", lastActive:"Never",       avatar:"TB" }
];

export const workspaces = [
  { id:1, name:"Acme Corp — NDA Review",         status:"Active",   members:3, docs:8,  reports:3, lastActivity:"2 hours ago",   created:"Jan 12, 2026" },
  { id:2, name:"TechStart Q4 Due Diligence",     status:"Active",   members:5, docs:23, reports:7, lastActivity:"Yesterday",     created:"Jan 28, 2026" },
  { id:3, name:"Employment Contract Review",     status:"Active",   members:2, docs:4,  reports:1, lastActivity:"3 days ago",    created:"Feb 3, 2026"  },
  { id:4, name:"Healthcare Compliance Audit 2026",status:"Archived",members:3, docs:11, reports:5, lastActivity:"Mar 15, 2026",  created:"Feb 14, 2026" }
];

export const documents = [
  { id:1, workspace:1, name:"NDA_Acme_Corp_v3.pdf",          type:"PDF",  size:"2.4 MB", uploadedBy:"James Wu",     status:"Ready",      classification:"Auto-filed",        date:"Jan 12, 2026" },
  { id:2, workspace:1, name:"Acme_Side_Letter.docx",         type:"DOCX", size:"0.8 MB", uploadedBy:"Sarah Chen",   status:"Ready",      classification:"Auto-filed",        date:"Jan 13, 2026" },
  { id:3, workspace:1, name:"Acme_Financials_Q3.xlsx",       type:"XLSX", size:"1.1 MB", uploadedBy:"Ryan Melade",  status:"Ready",      classification:"Auto-filed",        date:"Jan 14, 2026" },
  { id:4, workspace:1, name:"Prior_NDA_2022.pdf",            type:"PDF",  size:"1.9 MB", uploadedBy:"James Wu",     status:"Ready",      classification:"Auto-filed",        date:"Jan 14, 2026" },
  { id:5, workspace:1, name:"Compliance_Checklist.pdf",      type:"PDF",  size:"0.5 MB", uploadedBy:"Maria Torres", status:"Processing", classification:"Pending",           date:"Today"       },
  { id:6, workspace:1, name:"Standard_NDA_Template.docx",   type:"DOCX", size:"0.3 MB", uploadedBy:"James Wu",     status:"Failed",     classification:"Flagged for Review",date:"Today"       },
  { id:7, workspace:2, name:"TechStart_TermSheet_v2.pdf",    type:"PDF",  size:"3.2 MB", uploadedBy:"Sarah Chen",   status:"Ready",      classification:"Auto-filed",        date:"Jan 29, 2026"},
  { id:8, workspace:2, name:"Financial_Statements_2025.xlsx",type:"XLSX", size:"4.8 MB", uploadedBy:"Ryan Melade",  status:"Ready",      classification:"Auto-filed",        date:"Jan 30, 2026"}
];

export const orgReports = [
  { id:1, workspace:1, name:"NDA Key Obligations Summary",         type:"Summary",       createdBy:"James Wu",   status:"Final", date:"Jan 14, 2026", format:"PDF" },
  { id:2, workspace:1, name:"Risk Analysis: Acme Corp Clause 8.3", type:"Risk Analysis", createdBy:"Sarah Chen", status:"Final", date:"Jan 15, 2026", format:"PDF" },
  { id:3, workspace:1, name:"Acme NDA Executive Brief",            type:"Brief",         createdBy:"Ryan Melade",status:"Draft", date:"Jan 16, 2026", format:"DOCX" },
  { id:4, workspace:2, name:"TechStart Due Diligence Summary",     type:"Due Diligence", createdBy:"Sarah Chen", status:"Final", date:"Feb 1, 2026",  format:"PDF" },
  { id:5, workspace:2, name:"Term Sheet Risk Review",              type:"Risk Analysis", createdBy:"James Wu",   status:"Draft", date:"Feb 3, 2026",  format:"PDF" }
];

export const knowledgePacks = [
  { id:1, workspace:1, name:"Acme NDA Pack",          docs:4,  version:"v1.2", lastUpdated:"Jan 14, 2026", usedInChats:12 },
  { id:2, workspace:2, name:"TechStart DD Pack",       docs:8,  version:"v1.0", lastUpdated:"Jan 30, 2026", usedInChats:7  },
  { id:3, workspace:0, name:"US Court Local Rules",    docs:104,version:"v1.0", lastUpdated:"Apr 1, 2026",  usedInChats:3, prebuilt:true },
  { id:4, workspace:0, name:"NDA Standard Clauses",   docs:23, version:"v2.1", lastUpdated:"Mar 20, 2026", usedInChats:18,prebuilt:true },
  { id:5, workspace:0, name:"Contract Risk Glossary", docs:8,  version:"v1.3", lastUpdated:"Mar 15, 2026", usedInChats:9, prebuilt:true }
];

export const orgWorkflowTemplates = [
  { id:1, name:"Due Diligence Flow", vertical:"Legal", useCase:"Full M&A document review pipeline", totalSteps:5, avgDuration:"18s",
    steps:[{id:"s1",name:"Classify Documents",agent:"AG-01",skill:"document_ingestion",duration:"~2s/doc",parallel:false,async:false},{id:"s2",name:"Extract Key Clauses",agent:"AG-01",skill:"clause_analysis",duration:"~4s/doc",parallel:true,async:false},{id:"s3",name:"Compare vs Playbook",agent:"AG-01",skill:"clause_analysis",duration:"~5s",parallel:false,async:false},{id:"s4",name:"Generate Risk Report",agent:"AG-01",skill:"artifact_generation",duration:"~3s",parallel:false,async:false},{id:"s5",name:"Update Knowledge Graph",agent:"AG-02",skill:"entity_extraction",duration:"~5s",parallel:false,async:true}]},
  { id:2, name:"Contract Review Auto-run", vertical:"Legal", useCase:"Auto-analyze new contracts against playbook", totalSteps:4, avgDuration:"14s",
    steps:[{id:"s1",name:"Parse Contract",agent:"AG-01",skill:"document_ingestion",duration:"~2s",parallel:false,async:false},{id:"s2",name:"Extract Clauses",agent:"AG-01",skill:"clause_analysis",duration:"~4s",parallel:true,async:false},{id:"s3",name:"Compare vs Standard",agent:"AG-01",skill:"clause_analysis",duration:"~5s",parallel:false,async:false},{id:"s4",name:"Generate Risk Memo",agent:"AG-01",skill:"artifact_generation",duration:"~3s",parallel:false,async:false}]},
  { id:3, name:"Compliance Check Pipeline", vertical:"Legal", useCase:"Regulatory compliance audit", totalSteps:6, avgDuration:"22s",
    steps:[{id:"s1",name:"Ingest Documents",agent:"AG-01",skill:"document_ingestion",duration:"~2s",parallel:false,async:false},{id:"s2",name:"Classify by Regulation",agent:"AG-01",skill:"clause_analysis",duration:"~3s",parallel:true,async:false},{id:"s3",name:"Check Against Checklist",agent:"AG-01",skill:"clause_analysis",duration:"~4s",parallel:false,async:false},{id:"s4",name:"Identify Gaps",agent:"AG-01",skill:"clause_analysis",duration:"~3s",parallel:false,async:false},{id:"s5",name:"Generate Compliance Report",agent:"AG-01",skill:"artifact_generation",duration:"~5s",parallel:false,async:false},{id:"s6",name:"Update Knowledge Graph",agent:"AG-02",skill:"entity_extraction",duration:"~5s",parallel:false,async:true}]},
  { id:4, name:"Document Indexing Flow", vertical:"Legal", useCase:"Bulk ingest and index new documents", totalSteps:3, avgDuration:"9s",
    steps:[{id:"s1",name:"Parse Documents",agent:"AG-01",skill:"document_ingestion",duration:"~2s/doc",parallel:true,async:false},{id:"s2",name:"Chunk & Embed",agent:"AG-01",skill:"document_ingestion",duration:"~3s",parallel:true,async:false},{id:"s3",name:"Index to Knowledge Graph",agent:"AG-02",skill:"entity_extraction",duration:"~4s",parallel:false,async:true}]},
  { id:5, name:"Risk Assessment Pipeline", vertical:"Legal", useCase:"Standalone risk analysis on a single document", totalSteps:4, avgDuration:"13s",
    steps:[{id:"s1",name:"Parse Document",agent:"AG-01",skill:"document_ingestion",duration:"~2s",parallel:false,async:false},{id:"s2",name:"Extract Risk Clauses",agent:"AG-01",skill:"clause_analysis",duration:"~4s",parallel:false,async:false},{id:"s3",name:"Classify Risk Severity",agent:"AG-01",skill:"clause_analysis",duration:"~3s",parallel:false,async:false},{id:"s4",name:"Generate Risk Assessment",agent:"AG-01",skill:"artifact_generation",duration:"~4s",parallel:false,async:false}]},
  { id:6, name:"Client Onboarding", vertical:"Legal", useCase:"New client setup — workspace, permissions, initial documents", totalSteps:5, avgDuration:"16s",
    steps:[{id:"s1",name:"Create Workspace",agent:"AG-01",skill:"document_ingestion",duration:"~1s",parallel:false,async:false},{id:"s2",name:"Set Permissions",agent:"AG-01",skill:"document_ingestion",duration:"~1s",parallel:false,async:false},{id:"s3",name:"Ingest Initial Documents",agent:"AG-01",skill:"document_ingestion",duration:"~3s",parallel:true,async:false},{id:"s4",name:"Generate Client Brief",agent:"AG-01",skill:"artifact_generation",duration:"~4s",parallel:false,async:false},{id:"s5",name:"Update Knowledge Graph",agent:"AG-02",skill:"entity_extraction",duration:"~5s",parallel:false,async:true}]},
  { id:7, name:"Quarterly Review Prep", vertical:"Legal", useCase:"Assemble briefing materials for client quarterly review", totalSteps:4, avgDuration:"14s",
    steps:[{id:"s1",name:"Gather Recent Documents",agent:"AG-01",skill:"document_ingestion",duration:"~2s",parallel:false,async:false},{id:"s2",name:"Summarise Activity",agent:"AG-01",skill:"artifact_generation",duration:"~5s",parallel:false,async:false},{id:"s3",name:"Research Precedents",agent:"AG-01",skill:"precedent_research",duration:"~4s",parallel:false,async:false},{id:"s4",name:"Generate Review Pack",agent:"AG-01",skill:"artifact_generation",duration:"~5s",parallel:false,async:false}]}
];

export const workflowRuns = [
  { id:1, templateId:1, templateName:"Due Diligence Flow", workspace:"TechStart Q4 Due Diligence", triggeredBy:"Sarah Chen", triggeredAt:"Feb 1, 2026 09:14", status:"Completed", totalDuration:"19s", reportGenerated:true, reportId:4, tokenCost:"$0.84", billedMinutes:180,
    steps:[{id:"s1",name:"Classify Documents",status:"Completed",duration:"4s",startedAt:"09:14:00"},{id:"s2",name:"Extract Key Clauses",status:"Completed",duration:"8s",startedAt:"09:14:04"},{id:"s3",name:"Compare vs Playbook",status:"Completed",duration:"5s",startedAt:"09:14:12"},{id:"s4",name:"Generate Risk Report",status:"Completed",duration:"3s",startedAt:"09:14:17"},{id:"s5",name:"Update Knowledge Graph",status:"Completed",duration:"5s",startedAt:"09:14:17",async:true}]},
  { id:2, templateId:2, templateName:"Contract Review Auto-run", workspace:"Acme Corp — NDA Review", triggeredBy:"James Wu", triggeredAt:"Jan 14, 2026 14:20", status:"Completed", totalDuration:"14s", reportGenerated:true, reportId:1, tokenCost:"$0.61", billedMinutes:120,
    steps:[{id:"s1",name:"Parse Contract",status:"Completed",duration:"2s",startedAt:"14:20:00"},{id:"s2",name:"Extract Clauses",status:"Completed",duration:"4s",startedAt:"14:20:02"},{id:"s3",name:"Compare vs Standard",status:"Completed",duration:"5s",startedAt:"14:20:06"},{id:"s4",name:"Generate Risk Memo",status:"Completed",duration:"3s",startedAt:"14:20:11"}]},
  { id:3, templateId:1, templateName:"Due Diligence Flow", workspace:"Acme Corp — NDA Review", triggeredBy:"Ryan Melade", triggeredAt:"Today 11:45", status:"Running", totalDuration:null, reportGenerated:false, reportId:null, tokenCost:null, billedMinutes:null,
    steps:[{id:"s1",name:"Classify Documents",status:"Completed",duration:"4s",startedAt:"11:45:00"},{id:"s2",name:"Extract Key Clauses",status:"Running",duration:null,startedAt:"11:45:04"},{id:"s3",name:"Compare vs Playbook",status:"Pending",duration:null,startedAt:null},{id:"s4",name:"Generate Risk Report",status:"Pending",duration:null,startedAt:null},{id:"s5",name:"Update Knowledge Graph",status:"Pending",duration:null,startedAt:null,async:true}]},
  { id:4, templateId:5, templateName:"Risk Assessment Pipeline", workspace:"TechStart Q4 Due Diligence", triggeredBy:"James Wu", triggeredAt:"Feb 3, 2026 16:10", status:"Pending Review", totalDuration:"13s", reportGenerated:false, reportId:null, tokenCost:"$0.52", billedMinutes:90,
    steps:[{id:"s1",name:"Parse Document",status:"Completed",duration:"2s",startedAt:"16:10:00"},{id:"s2",name:"Extract Risk Clauses",status:"Completed",duration:"4s",startedAt:"16:10:02"},{id:"s3",name:"Classify Risk Severity",status:"Completed",duration:"3s",startedAt:"16:10:06"},{id:"s4",name:"Generate Risk Assessment",status:"Completed",duration:"4s",startedAt:"16:10:09"}]}
];

export const clients = [
  { id:1, name:"David Kim",    company:"Acme Corp",      email:"david@acme.com",     workspaces:[1], lastActive:"Yesterday",  messages:2, avatar:"DK" },
  { id:2, name:"Lisa Park",    company:"TechStart Inc",  email:"lisa@techstart.com", workspaces:[2], lastActive:"2 days ago", messages:0, avatar:"LP" },
  { id:3, name:"Helen Chen",   company:"Chen Family Trust",email:"helen@cfttrust.com",workspaces:[3],lastActive:"3 days ago",messages:1, avatar:"HC" }
];

export const orgMessages = [
  { id:1, clientId:1, clientName:"David Kim",  preview:"Can you clarify clause 8.3 on the indemnification?", time:"Yesterday 14:22", unread:1, workspace:"Acme Corp — NDA Review" },
  { id:2, clientId:3, clientName:"Helen Chen", preview:"I've uploaded the additional documents you requested.", time:"2 days ago",     unread:0, workspace:"Employment Contract Review" }
];

export const messageThreads = {
  1: [
    { sender:"client",       text:"Hi, can you clarify what clause 8.3 on indemnification means for us?", time:"Yesterday 14:22" },
    { sender:"professional", text:"Of course. Clause 8.3 means Acme Corp requires Hartwell to indemnify against third-party claims arising from disclosed information. We recommend negotiating this to a mutual indemnification.", time:"Yesterday 15:10" },
    { sender:"client",       text:"Thank you. Should we be concerned about the 3-year survival period?", time:"Yesterday 15:45" }
  ],
  2: [
    { sender:"client",       text:"I've uploaded the additional documents you requested regarding the trust.", time:"2 days ago 10:15" },
    { sender:"professional", text:"Thank you Helen, we've received them and they're being reviewed.", time:"2 days ago 11:30" }
  ]
};

export const activityFeed = [
  { id:1,  user:"Ryan Melade",  action:"logged in",                               workspace:"",                            time:"Today 09:14",       icon:"LogIn"    },
  { id:2,  user:"James Wu",     action:"uploaded NDA_Acme_Corp_v3.pdf",           workspace:"Acme Corp — NDA Review",      time:"Today 09:22",       icon:"Upload"   },
  { id:3,  user:"System",       action:"Auto-filed Acme_Financials_Q3.xlsx (confidence 91%)",workspace:"Acme Corp — NDA Review",time:"Today 09:23",   icon:"CheckCircle"},
  { id:4,  user:"Sarah Chen",   action:"generated Report: NDA Key Obligations",   workspace:"Acme Corp — NDA Review",      time:"Today 10:05",       icon:"FileText" },
  { id:5,  user:"Maria Torres", action:"uploaded Compliance_Checklist.pdf",       workspace:"Acme Corp — NDA Review",      time:"Today 11:30",       icon:"Upload"   },
  { id:6,  user:"System",       action:"Flagged Standard_NDA_Template.docx for review (confidence 61%)",workspace:"Acme Corp — NDA Review",time:"Today 11:31",icon:"AlertCircle"},
  { id:7,  user:"Ryan Melade",  action:"invited Tom Bradley",                     workspace:"",                            time:"Yesterday 16:45",   icon:"UserPlus" },
  { id:8,  user:"James Wu",     action:"ran workflow: Contract Risk Review",      workspace:"Acme Corp — NDA Review",      time:"Yesterday 14:20",   icon:"Workflow" },
  { id:9,  user:"Sarah Chen",   action:"shared Report to Acme Corp client portal",workspace:"Acme Corp — NDA Review",      time:"Yesterday 13:10",   icon:"Share"    },
  { id:10, user:"David Kim",    action:"(Client) accessed client portal",         workspace:"Acme Corp — NDA Review",      time:"Yesterday 12:55",   icon:"ExternalLink"}
];

export const deliverables = [
  { id:1, workspace:1, title:"Acme Corp NDA Package",      clientId:1, status:"Shared",   assembledBy:"Sarah Chen",   sharedDate:"Jan 15, 2026", items:["NDA Key Obligations Summary","NDA_Acme_Corp_v3.pdf"] },
  { id:2, workspace:2, title:"TechStart Due Diligence Pack",clientId:2, status:"Draft",    assembledBy:"Ryan Melade",  sharedDate:null,           items:["TechStart Due Diligence Summary","TechStart_TermSheet_v2.pdf"] }
];

export const billingData = {
  plan: "Team",
  pricePerUser: 299,
  users: 5,
  mrr: 1495,
  nextRenewal: "May 1, 2026",
  usage: {
    docs: { used: 46, limit: 2000 },
    workflows: { used: 12, limit: 500 },
    reports: { used: 23, limit: 200 },
    knowledgePacks: { used: 2, limit: 10 }
  },
  invoices: [
    { id:"INV-004", date:"Apr 1, 2026",  amount:1495, status:"Paid" },
    { id:"INV-003", date:"Mar 1, 2026",  amount:1495, status:"Paid" },
    { id:"INV-002", date:"Feb 1, 2026",  amount:1196, status:"Paid" }
  ]
};

export const dashboardStats = {
  mrrTrend: [
    { month: 'Oct', value: 4200 },
    { month: 'Nov', value: 5800 },
    { month: 'Dec', value: 7100 },
    { month: 'Jan', value: 8900 },
    { month: 'Feb', value: 10500 },
    { month: 'Mar', value: 12416 },
  ],
  planDistribution: [
    { plan: 'Free', count: 2, color: '#94A3B8' },
    { plan: 'Professional', count: 3, color: '#1D4ED8' },
    { plan: 'Team', count: 2, color: '#166534' },
    { plan: 'Enterprise', count: 1, color: '#C9A84C' },
  ],
  dailyActiveUsers: [
    { day: 'Mon', value: 28 },
    { day: 'Tue', value: 32 },
    { day: 'Wed', value: 26 },
    { day: 'Thu', value: 35 },
    { day: 'Fri', value: 31 },
    { day: 'Sat', value: 12 },
    { day: 'Sun', value: 9 },
  ],
  aiModelUsage: [
    { model: 'GPT-4o', pct: 58, color: '#0B1D3A' },
    { model: 'Claude 3.5', pct: 29, color: '#C9A84C' },
    { model: 'GPT-4o-mini', pct: 13, color: '#94A3B8' },
  ],
  recentActivity: [
    { id: 1, operator: 'Arjun P', action: 'Impersonated Admin', target: 'Hartwell & Associates', time: 'Today 09:14', type: 'access' },
    { id: 2, operator: 'Arjun P', action: 'Uploaded KB document', target: 'US Legal Practice Guide 2026.pdf', time: 'Today 09:22', type: 'data' },
    { id: 3, operator: 'System', action: 'Auto-scaled API instances', target: 'us-east-1 cluster', time: 'Today 08:45', type: 'system' },
    { id: 4, operator: 'Dev Team', action: 'Deployed v2.4.1', target: 'Production environment', time: 'Today 06:00', type: 'system' },
    { id: 5, operator: 'Arjun P', action: 'Sent broadcast notification', target: 'All Org Admins', time: 'Apr 1, 2026 11:00', type: 'comms' },
    { id: 6, operator: 'System', action: 'SSL certificate renewed', target: 'api.yourai.com', time: 'Apr 1, 2026 03:00', type: 'system' },
    { id: 7, operator: 'Dev Team', action: 'Suspended org', target: 'Thornton Compliance', time: 'Mar 30, 2026 14:10', type: 'access' },
    { id: 8, operator: 'Arjun P', action: 'Updated billing plan', target: 'Chen Partners LLC', time: 'Mar 29, 2026 16:30', type: 'billing' },
  ],
  systemHealth: {
    apiResponseTime: 45,
    errorRate: 0.2,
    storageUsed: 22.9,
    storageTotal: 100,
  },
};

export const timeEntries = [
  { id:"te-001", userId:"james_wu", clientId:1, clientName:"Acme Corp", workspace:"Acme Corp — NDA Review", activityType:"contract_review", description:"NDA clause-by-clause analysis — non-compete and indemnification review", durationSeconds:6.8, billedMinutes:72, billable:true, rate:200, amount:240, agentId:"AG-01", skillUsed:"clause_analysis", modelUsed:"Legal-Lens-v2", tokensCost:0.42, date:"Jan 14, 2026" },
  { id:"te-002", userId:"sarah_chen", clientId:1, clientName:"Acme Corp", workspace:"Acme Corp — NDA Review", activityType:"artifact_generation", description:"NDA Key Obligations Summary report generation", durationSeconds:3.1, billedMinutes:60, billable:true, rate:200, amount:200, agentId:"AG-01", skillUsed:"artifact_generation", modelUsed:"GPT-4o", tokensCost:0.31, date:"Jan 14, 2026" },
  { id:"te-003", userId:"sarah_chen", clientId:1, clientName:"Acme Corp", workspace:"Acme Corp — NDA Review", activityType:"precedent_research", description:"Precedent research — non-compete clauses NY jurisdiction", durationSeconds:8.2, billedMinutes:95, billable:true, rate:200, amount:316.67, agentId:"AG-01", skillUsed:"precedent_research", modelUsed:"GPT-4o", tokensCost:0.58, date:"Jan 15, 2026" },
  { id:"te-004", userId:"james_wu", clientId:2, clientName:"TechStart Inc", workspace:"TechStart Q4 Due Diligence", activityType:"document_analysis", description:"Due diligence pipeline — 5-step automated review", durationSeconds:19.0, billedMinutes:180, billable:true, rate:200, amount:600, agentId:"AG-03", skillUsed:"pipeline_execution", modelUsed:"Mixed", tokensCost:0.84, date:"Feb 1, 2026" },
  { id:"te-005", userId:"ryan_melade", clientId:1, clientName:"Acme Corp", workspace:"Acme Corp — NDA Review", activityType:"compliance_check", description:"Manual review — compliance checklist verification", durationSeconds:null, billedMinutes:45, billable:false, rate:200, amount:0, agentId:null, skillUsed:"manual", modelUsed:null, tokensCost:0, date:"Today" },
  { id:"te-006", userId:"maria_torres", clientId:2, clientName:"TechStart Inc", workspace:"TechStart Q4 Due Diligence", activityType:"document_analysis", description:"Term sheet risk clause extraction", durationSeconds:4.2, billedMinutes:50, billable:true, rate:200, amount:166.67, agentId:"AG-01", skillUsed:"clause_analysis", modelUsed:"Legal-Lens-v2", tokensCost:0.28, date:"Feb 3, 2026" }
];

export const orgInvoices = [
  { id:"INV-2026-001", clientId:1, clientName:"Acme Corp", period:"Jan 1 – Jan 31, 2026", totalAmount:756.67, status:"Paid", issuedDate:"Feb 1, 2026", dueDate:"Feb 15, 2026", paidDate:"Feb 10, 2026",
    lineItems:[{description:"NDA clause-by-clause analysis",hours:1.2,rate:200,amount:240},{description:"NDA Key Obligations Summary report",hours:1.0,rate:200,amount:200},{description:"Precedent research — NY jurisdiction",hours:1.58,rate:200,amount:316.67}]},
  { id:"INV-2026-002", clientId:2, clientName:"TechStart Inc", period:"Feb 1 – Feb 28, 2026", totalAmount:766.67, status:"Sent", issuedDate:"Mar 1, 2026", dueDate:"Mar 15, 2026", paidDate:null,
    lineItems:[{description:"Due diligence pipeline — M&A review",hours:3.0,rate:200,amount:600},{description:"Term sheet risk clause extraction",hours:0.83,rate:200,amount:166.67}]}
];

export const modelUsageStats = {
  totalCostThisMonth: 2.43,
  totalTokensThisMonth: 48200,
  totalQueriesThisMonth: 128,
  byModel: [
    { model:"GPT-4o", queries:58, tokens:21800, cost:1.09, pct:45, color:"#3B82F6" },
    { model:"Legal-Lens-v2", queries:46, tokens:18400, cost:0.92, pct:38, color:"#0B1D3A" },
    { model:"text-embedding-3-large", queries:24, tokens:8000, cost:0.42, pct:17, color:"#8B5CF6" }
  ],
  byClient: [
    { client:"Acme Corp", queries:72, cost:1.31, pct:54, color:"#0B1D3A" },
    { client:"TechStart Inc", queries:38, cost:0.84, pct:35, color:"#C9A84C" },
    { client:"Chen Family", queries:18, cost:0.28, pct:11, color:"#3D5A80" }
  ],
  dailyTrend: [
    { date:"Mar 27", cost:0.28 },{ date:"Mar 28", cost:0.41 },{ date:"Mar 29", cost:0.19 },{ date:"Mar 30", cost:0.55 },
    { date:"Mar 31", cost:0.38 },{ date:"Apr 1", cost:0.62 },{ date:"Apr 2", cost:0.00 },{ date:"Apr 3", cost:0.00 }
  ]
};

export const alexIntentTemplates = [
  { id:1, intent:"feature_question", label:"Feature Questions", description:"When users ask what a feature does or whether a feature exists", icon:"Sparkles", llmRequired:true, exampleQueries:["What does the knowledge pack do?","Can I share reports with my clients?","What is a workspace?"], template:"YourAI's {feature_name} works like {analogy}. {one_sentence_explanation}. You can find it {location_in_app}. Would you like me to walk you through it?", lastUpdated:"Apr 1, 2026", updatedBy:"Arjun P", status:"Active", responseFilters:["jargon","length","hallucination"] },
  { id:2, intent:"security_compliance", label:"Security & Compliance", description:"When users ask about data privacy, encryption, SOC 2, HIPAA, or where their data is stored", icon:"Shield", llmRequired:true, exampleQueries:["Is my data safe?","Where are my documents stored?","Are you HIPAA compliant?"], template:"Your data never leaves your private environment. {specific_security_detail}. YourAI is SOC 2 certified and uses bank-grade AES-256 encryption. {jurisdiction_note}. Your documents are never used to train AI models — contractually guaranteed.", lastUpdated:"Apr 1, 2026", updatedBy:"Arjun P", status:"Active", responseFilters:["legal_advice","jargon","length"] },
  { id:3, intent:"how_to_request", label:"How-To Requests", description:"When users ask how to do something — step-by-step instructions", icon:"BookOpen", llmRequired:true, exampleQueries:["How do I upload a document?","How do I share a report with my client?","How do I run a workflow?"], template:"Here's how to {task_name}: {numbered_steps}. It takes about {time_estimate}. {helpful_tip}. Let me know if you get stuck at any step.", lastUpdated:"Apr 1, 2026", updatedBy:"Arjun P", status:"Active", responseFilters:["jargon","length"] },
  { id:4, intent:"setup_config", label:"Setup & Configuration", description:"When users ask about SSO, integrations, settings, or account configuration", icon:"Settings", llmRequired:true, exampleQueries:["How do I connect Clio?","Can I set up SSO for my team?","How do I invite team members?"], template:"To set up {config_item}: {steps}. This is available on {plan_requirement}. {admin_note}. If you need help, our support team can guide you through it.", lastUpdated:"Apr 1, 2026", updatedBy:"Arjun P", status:"Active", responseFilters:["jargon","length"] },
  { id:5, intent:"billing_question", label:"Billing Questions", description:"When users ask about plans, pricing, upgrades, or invoices", icon:"CreditCard", llmRequired:true, exampleQueries:["What's the difference between Professional and Team?","How do I upgrade my plan?","Why was I charged this amount?"], template:"For billing questions about {billing_topic}: {answer}. You can manage your subscription at any time in Settings → Billing. {upgrade_note}. For invoice queries, contact support@yourai.com.", lastUpdated:"Apr 1, 2026", updatedBy:"Arjun P", status:"Active", responseFilters:["legal_advice","length"] },
  { id:6, intent:"small_talk", label:"Small Talk", description:"Greetings, thank yous, and off-topic messages. No LLM needed — canned response only.", icon:"MessageCircle", llmRequired:false, exampleQueries:["Hi!","Thanks","You're great"], template:"Happy to help! I'm Alex, YourAI's assistant. I can answer questions about features, help you get set up, or explain how anything works. What would you like to know?", lastUpdated:"Apr 1, 2026", updatedBy:"Arjun P", status:"Active", responseFilters:[] },
  { id:7, intent:"unknown", label:"Unknown / Fallback", description:"Anything not matching above intents. Full LLM invoked. These queries are logged for review to identify new intent patterns.", icon:"HelpCircle", llmRequired:true, exampleQueries:["Can you help me draft an email?","What is the law on non-competes in NY?","Explain quantum computing"], template:"I'm not sure I have a great answer for that specific question. I'm best at explaining YourAI features and helping you get set up. For legal questions, please consult with a qualified attorney. Is there something about YourAI I can help you with?", lastUpdated:"Apr 1, 2026", updatedBy:"Arjun P", status:"Active", responseFilters:["legal_advice","competitor","hallucination","length"] }
];

export const alexResponseFilters = [
  { id:"jargon", label:"Jargon Detector", description:"Replaces technical terms (RAG, pgvector, JWT, Fargate) with plain-language equivalents", active:true },
  { id:"legal_advice", label:"Legal Advice Block", description:"Blocks legal or medical advice patterns. Substitutes safe redirect to qualified attorney", active:true },
  { id:"competitor", label:"Competitor Block", description:"Blocks known competitor names from appearing in responses", active:true },
  { id:"hallucination", label:"Hallucination Check", description:"Compares response against approved feature list. Flags unknown feature references", active:true },
  { id:"length", label:"Length Enforcer", description:"Flags responses over 150 words for review", active:true },
  { id:"confidence", label:"Confidence Gate", description:"Routes low-confidence responses to escalation log for operator review", active:true }
];

export const alexUnknownLog = [
  { id:1, query:"Can you help me write a demand letter?", intent_guessed:"unknown", orgName:"Hartwell & Associates", time:"Today 09:14", escalated:true },
  { id:2, query:"What's the penalty for breach in NY?", intent_guessed:"unknown", orgName:"Morrison Legal Group", time:"Today 08:55", escalated:false },
  { id:3, query:"Does this integrate with NetDocuments?", intent_guessed:"unknown", orgName:"Chen Partners LLC", time:"Yesterday 16:40", escalated:false },
  { id:4, query:"Can Alex draft client emails for me?", intent_guessed:"unknown", orgName:"Rivera & Kim LLP", time:"Yesterday 14:22", escalated:true },
  { id:5, query:"How does your vector database work?", intent_guessed:"unknown", orgName:"Hartwell & Associates", time:"Yesterday 11:05", escalated:false }
];

export const userStoryModules = [
  { id:"tenant-management", label:"Tenant Management", route:"/super-admin/tenants", icon:"Building2", storyCount:0 },
  { id:"user-management", label:"User Management", route:"/super-admin/users", icon:"Users", storyCount:0 },
  { id:"platform-billing", label:"Platform Billing", route:"/super-admin/billing", icon:"CreditCard", storyCount:0 },
  { id:"usage-analytics", label:"Usage & Analytics", route:"/super-admin/usage", icon:"BarChart2", storyCount:0 },
  { id:"compliance-audit", label:"Compliance & Audit", route:"/super-admin/compliance", icon:"ShieldCheck", storyCount:0 },
  { id:"static-content", label:"Static Content", route:"/super-admin/static-content", icon:"FileText", storyCount:0 },
  { id:"report-templates", label:"Report Templates", route:"/super-admin/report-templates", icon:"FileOutput", storyCount:0 },
  { id:"workflow-templates", label:"Workflow Templates", route:"/super-admin/workflows", icon:"Workflow", storyCount:0 },
  { id:"knowledge-base", label:"Knowledge Base", route:"/super-admin/knowledge-base", icon:"Database", storyCount:0 },
  { id:"integrations", label:"Integrations", route:"/super-admin/integrations", icon:"Plug", storyCount:0 },
  { id:"notifications", label:"Notifications", route:"/super-admin/notifications", icon:"Bell", storyCount:0 },
  { id:"platform-settings", label:"Platform Settings", route:"/super-admin/settings", icon:"Settings", storyCount:0 },
  { id:"auth-flow", label:"Auth Flow", icon:"Lock", storyCount:0 },
];
