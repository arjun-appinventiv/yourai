import React, { useState, useRef, useCallback } from 'react';
import { Play, CheckCircle, XCircle, AlertTriangle, Clock, RotateCcw, Zap, FileText, MessageSquare, Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { callLLM, getApiKey } from '../../lib/llm-client';

/* ─────────────────── Test Cases ─────────────────── */
const TEST_SUITES = [
  {
    name: 'General Conversation',
    icon: MessageSquare,
    tests: [
      {
        id: 'greet-hello',
        label: 'Greeting — "Hello"',
        input: 'Hello!',
        context: {},
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback message' },
          { type: 'min_length', value: 20, desc: 'Response is at least 20 chars' },
          { type: 'contains_any', values: ['hello', 'hi', 'hey', 'welcome', 'help', 'assist', 'glad'], desc: 'Responds with a greeting' },
        ],
      },
      {
        id: 'greet-good-morning',
        label: 'Greeting — "Good morning"',
        input: 'Good morning Alex!',
        context: {},
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'contains_any', values: ['morning', 'hello', 'hi', 'help', 'assist'], desc: 'Responds appropriately' },
        ],
      },
      {
        id: 'general-knowledge',
        label: 'General knowledge question',
        input: 'What is the capital of France?',
        context: {},
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'contains_any', values: ['paris', 'Paris'], desc: 'Knows the answer is Paris' },
        ],
      },
      {
        id: 'small-talk',
        label: 'Small talk',
        input: 'How are you doing today?',
        context: {},
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'min_length', value: 15, desc: 'Responds with substance' },
        ],
      },
    ],
  },
  {
    name: 'YourAI Platform Help',
    icon: Brain,
    tests: [
      {
        id: 'what-can-you-do',
        label: 'What can you do?',
        input: 'What can you do?',
        context: {},
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'contains_any', values: ['document', 'contract', 'research', 'draft', 'analys'], desc: 'Lists capabilities' },
          { type: 'min_length', value: 100, desc: 'Gives comprehensive answer' },
        ],
      },
      {
        id: 'how-to-upload',
        label: 'How to upload documents?',
        input: 'How do I upload a document to YourAI?',
        context: {},
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'contains_any', values: ['upload', 'attach', 'document', 'file'], desc: 'Explains upload process' },
        ],
      },
      {
        id: 'what-is-knowledge-pack',
        label: 'What are Knowledge Packs?',
        input: 'What is a knowledge pack and how do I use one?',
        context: {},
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'contains_any', values: ['knowledge', 'pack', 'context', 'document'], desc: 'Explains knowledge packs' },
        ],
      },
    ],
  },
  {
    name: 'Legal Research',
    icon: FileText,
    tests: [
      {
        id: 'legal-question',
        label: 'Basic legal question',
        input: 'What is the statute of limitations for breach of contract in California?',
        context: {},
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'contains_any', values: ['year', 'statute', 'limitation', 'california', 'California'], desc: 'Provides legal answer' },
          { type: 'min_length', value: 80, desc: 'Detailed enough' },
        ],
      },
      {
        id: 'case-law',
        label: 'Case law question',
        input: 'Tell me about the holding in Miranda v. Arizona',
        context: {},
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'contains_any', values: ['right', 'silence', 'attorney', 'custodial', 'interrogation', 'Miranda'], desc: 'Discusses Miranda rights' },
        ],
      },
      {
        id: 'compliance',
        label: 'Compliance question',
        input: 'What are the key GDPR requirements for data processing?',
        context: {},
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'contains_any', values: ['consent', 'data', 'processing', 'GDPR', 'rights', 'protection'], desc: 'Covers GDPR basics' },
        ],
      },
    ],
  },
  {
    name: 'Document Upload Scenarios',
    icon: FileText,
    tests: [
      {
        id: 'doc-general-statement',
        label: 'Doc upload + general statement',
        input: 'Go through this doc, I will ask questions',
        context: {
          uploadedDoc: {
            name: 'Employment_Agreement.pdf',
            content: '[Page 1]\nEMPLOYMENT AGREEMENT\n\nThis Employment Agreement ("Agreement") is entered into as of January 15, 2026, by and between TechCorp Inc. ("Company") and Jane Smith ("Employee").\n\n1. POSITION AND DUTIES\nEmployee shall serve as Senior Software Engineer. Employee shall report to the VP of Engineering.\n\n2. COMPENSATION\nBase salary: $185,000 per annum, paid bi-weekly.\nAnnual bonus: Up to 20% of base salary, at Company discretion.\n\n3. NON-COMPETE\nFor a period of 12 months after termination, Employee shall not work for any direct competitor within a 50-mile radius.\n\n4. TERMINATION\nEither party may terminate with 30 days written notice. Company may terminate for cause immediately.',
          },
        },
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback — doc is attached' },
          { type: 'source_type', value: 'UPLOADED_DOC', desc: 'Source should be UPLOADED_DOC' },
          { type: 'contains_any', values: ['employment', 'agreement', 'TechCorp', 'Jane Smith', 'contract', 'document'], desc: 'Acknowledges the document content' },
          { type: 'no_garbled', desc: 'No garbled/binary characters in response' },
        ],
      },
      {
        id: 'doc-specific-question',
        label: 'Doc upload + specific question',
        input: 'What is the non-compete clause in this agreement?',
        context: {
          uploadedDoc: {
            name: 'Employment_Agreement.pdf',
            content: '[Page 1]\nEMPLOYMENT AGREEMENT\n\nThis Employment Agreement is entered into as of January 15, 2026, by TechCorp Inc. and Jane Smith.\n\n1. POSITION: Senior Software Engineer\n2. SALARY: $185,000/year\n3. NON-COMPETE: For 12 months after termination, Employee shall not work for any direct competitor within 50-mile radius.\n4. TERMINATION: 30 days written notice required.',
          },
        },
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'source_type', value: 'UPLOADED_DOC', desc: 'Source should be UPLOADED_DOC' },
          { type: 'contains_any', values: ['12 month', 'non-compete', 'competitor', '50-mile', 'Non-Compete'], desc: 'Cites non-compete details' },
        ],
      },
      {
        id: 'doc-summarise',
        label: 'Doc upload + summarise request',
        input: 'Summarise this document for me',
        context: {
          uploadedDoc: {
            name: 'NDA_Draft.pdf',
            content: '[Page 1]\nNON-DISCLOSURE AGREEMENT\n\nParties: Acme Corp (Disclosing Party) and Beta LLC (Receiving Party)\nEffective Date: March 1, 2026\nDuration: 3 years from effective date\n\nConfidential Information includes: trade secrets, business plans, financial data, customer lists, technical specifications.\n\nObligations: Receiving Party must protect confidential information with same care as own confidential information. No disclosure to third parties without written consent.\n\nExceptions: Information that is publicly available, independently developed, or required by law.\n\nRemedies: Injunctive relief and monetary damages for breach.',
          },
        },
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'source_type', value: 'UPLOADED_DOC', desc: 'Source should be UPLOADED_DOC' },
          { type: 'contains_any', values: ['NDA', 'non-disclosure', 'Acme', 'confidential', 'parties'], desc: 'Summarises the NDA' },
          { type: 'min_length', value: 100, desc: 'Provides substantial summary' },
        ],
      },
    ],
  },
  {
    name: 'Edge Cases',
    icon: AlertTriangle,
    tests: [
      {
        id: 'emoji-only',
        label: 'Emoji-only message',
        input: '👋',
        context: {},
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'min_length', value: 5, desc: 'Gives some response' },
        ],
      },
      {
        id: 'single-word',
        label: 'Single word — "help"',
        input: 'help',
        context: {},
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'min_length', value: 30, desc: 'Responds helpfully' },
        ],
      },
      {
        id: 'mixed-intent',
        label: 'Mixed intent — greeting + legal question',
        input: 'Hi there! Can you explain what force majeure means in a contract?',
        context: {},
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'contains_any', values: ['force majeure', 'event', 'unforeseen', 'beyond control', 'act of god', 'Force Majeure'], desc: 'Explains force majeure' },
        ],
      },
      {
        id: 'draft-request',
        label: 'Draft request',
        input: 'Draft a short email to opposing counsel requesting an extension of the discovery deadline by two weeks.',
        context: {},
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'contains_any', values: ['extension', 'discovery', 'deadline', 'counsel', 'Dear'], desc: 'Drafts relevant content' },
          { type: 'min_length', value: 100, desc: 'Produces substantial draft' },
        ],
      },
    ],
  },
  {
    name: 'Response Quality',
    icon: Zap,
    tests: [
      {
        id: 'no-binary',
        label: 'No binary/garbled output',
        input: 'What are the elements of negligence?',
        context: {},
        checks: [
          { type: 'no_garbled', desc: 'No garbled characters in response' },
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'contains_any', values: ['duty', 'breach', 'causation', 'damages', 'negligence'], desc: 'Lists negligence elements' },
        ],
      },
      {
        id: 'formatting-check',
        label: 'Response uses formatting (bullets/bold)',
        input: 'List the key differences between an LLC and a Corporation',
        context: {},
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'has_formatting', desc: 'Uses bullet points or bold formatting' },
          { type: 'min_length', value: 150, desc: 'Detailed comparison' },
        ],
      },
      {
        id: 'source-tag-present',
        label: 'Source tag properly stripped',
        input: 'What is consideration in contract law?',
        context: {},
        checks: [
          { type: 'no_fallback', desc: 'Should NOT trigger fallback' },
          { type: 'no_source_tag', desc: 'Source tag [SOURCE: ...] not visible in response' },
        ],
      },
    ],
  },
];

/* ─────────────────── Check Runner ─────────────────── */
function runCheck(check, result) {
  const content = result.fullContent || '';
  const lower = content.toLowerCase();

  switch (check.type) {
    case 'no_fallback':
      return !content.includes("couldn't find a clear answer");
    case 'min_length':
      return content.length >= check.value;
    case 'contains_any':
      return check.values.some(v => lower.includes(v.toLowerCase()));
    case 'source_type':
      return result.sourceType === check.value;
    case 'no_garbled': {
      // Check for high ratio of non-printable chars (binary/garbled)
      const nonPrintable = content.replace(/[\x20-\x7E\n\r\t]/g, '').length;
      return nonPrintable / (content.length || 1) < 0.05;
    }
    case 'has_formatting':
      return content.includes('**') || content.includes('* ') || content.includes('- ') || /\d+\.\s/.test(content);
    case 'no_source_tag':
      return !/\[SOURCE:\s*(UPLOADED_DOC|KNOWLEDGE_PACK|GLOBAL_KB|NONE)\]/.test(content);
    default:
      return true;
  }
}

/* ─────────────────── Main Component ─────────────────── */
export default function BotTester() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [expandedSuites, setExpandedSuites] = useState({});
  const [expandedTests, setExpandedTests] = useState({});
  const abortRef = useRef(false);

  const toggleSuite = (name) => setExpandedSuites(prev => ({ ...prev, [name]: !prev[name] }));
  const toggleTest = (id) => setExpandedTests(prev => ({ ...prev, [id]: !prev[id] }));

  const runSingleTest = useCallback(async (test) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      return { status: 'error', error: 'No API key configured', checks: [], fullContent: '', sourceType: 'NONE', duration: 0 };
    }

    const start = Date.now();
    try {
      const result = await callLLM(
        test.input,
        [],
        () => {}, // no streaming needed for tests
        test.context,
      );

      const checkResults = test.checks.map(check => ({
        ...check,
        passed: runCheck(check, result),
      }));

      const allPassed = checkResults.every(c => c.passed);
      return {
        status: allPassed ? 'pass' : 'fail',
        checks: checkResults,
        fullContent: result.fullContent,
        sourceType: result.sourceType,
        duration: Date.now() - start,
      };
    } catch (err) {
      return {
        status: 'error',
        error: err.message,
        checks: [],
        fullContent: '',
        sourceType: 'NONE',
        duration: Date.now() - start,
      };
    }
  }, []);

  const runAllTests = useCallback(async () => {
    setRunning(true);
    abortRef.current = false;
    setResults({});

    for (const suite of TEST_SUITES) {
      for (const test of suite.tests) {
        if (abortRef.current) break;
        setCurrentTest(test.id);
        setResults(prev => ({ ...prev, [test.id]: { status: 'running' } }));
        const result = await runSingleTest(test);
        setResults(prev => ({ ...prev, [test.id]: result }));
        // Small delay between tests to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      }
      if (abortRef.current) break;
    }

    setCurrentTest(null);
    setRunning(false);
  }, [runSingleTest]);

  const stopTests = () => { abortRef.current = true; };

  // Stats
  const allResults = Object.values(results);
  const completed = allResults.filter(r => r.status !== 'running');
  const passed = completed.filter(r => r.status === 'pass').length;
  const failed = completed.filter(r => r.status === 'fail').length;
  const errors = completed.filter(r => r.status === 'error').length;
  const totalTests = TEST_SUITES.reduce((sum, s) => sum + s.tests.length, 0);

  return (
    <div style={{ padding: '32px 40px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'DM Serif Display', serif" }}>
            Bot Test Agent
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Automated testing for Alex AI — validates intents, responses, document handling, and edge cases
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {running ? (
            <button onClick={stopTests} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #EF4444', background: 'white', color: '#EF4444', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <XCircle size={14} /> Stop
            </button>
          ) : (
            <button onClick={runAllTests} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--navy)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Play size={14} /> Run All Tests
            </button>
          )}
          {completed.length > 0 && !running && (
            <button onClick={() => setResults({})} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <RotateCcw size={14} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      {completed.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, padding: '14px 20px', borderRadius: 12, background: 'var(--ice-warm, #F8FAFC)', border: '1px solid var(--border)' }}>
          <Stat label="Total" value={totalTests} color="var(--text-primary)" />
          <Stat label="Passed" value={passed} color="#16A34A" />
          <Stat label="Failed" value={failed} color="#DC2626" />
          <Stat label="Errors" value={errors} color="#D97706" />
          <Stat label="Remaining" value={totalTests - completed.length} color="var(--text-muted)" />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 200, height: 8, borderRadius: 4, background: '#E2E8F0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(completed.length / totalTests) * 100}%`, background: failed > 0 || errors > 0 ? '#F59E0B' : '#16A34A', borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{Math.round((completed.length / totalTests) * 100)}%</span>
          </div>
        </div>
      )}

      {/* Test Suites */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {TEST_SUITES.map(suite => {
          const SuiteIcon = suite.icon;
          const isExpanded = expandedSuites[suite.name] !== false; // default open
          const suiteResults = suite.tests.map(t => results[t.id]).filter(Boolean);
          const suitePassed = suiteResults.filter(r => r.status === 'pass').length;
          const suiteTotal = suite.tests.length;
          const suiteHasFailure = suiteResults.some(r => r.status === 'fail' || r.status === 'error');

          return (
            <div key={suite.name} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'white' }}>
              {/* Suite header */}
              <div
                onClick={() => toggleSuite(suite.name)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', background: suiteHasFailure ? '#FEF2F2' : suiteResults.length === suiteTotal && suitePassed === suiteTotal ? '#F0FDF4' : 'white' }}
              >
                {isExpanded ? <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
                <SuiteIcon size={16} style={{ color: 'var(--navy)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{suite.name}</span>
                {suiteResults.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: suiteHasFailure ? '#DC2626' : '#16A34A' }}>
                    {suitePassed}/{suiteTotal} passed
                  </span>
                )}
              </div>

              {/* Tests */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {suite.tests.map(test => {
                    const r = results[test.id];
                    const isTestExpanded = expandedTests[test.id];
                    const isRunningThis = currentTest === test.id;

                    return (
                      <div key={test.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <div
                          onClick={() => r && toggleTest(test.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 10px 40px', cursor: r ? 'pointer' : 'default' }}
                        >
                          <StatusIcon status={r?.status} isRunning={isRunningThis} />
                          <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{test.label}</span>
                          {r?.duration && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(r.duration / 1000).toFixed(1)}s</span>}
                          {r && !isRunningThis && (
                            isTestExpanded ? <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                          )}
                        </div>

                        {/* Expanded detail */}
                        {isTestExpanded && r && r.status !== 'running' && (
                          <div style={{ padding: '0 16px 12px 56px', fontSize: 12 }}>
                            {/* Checks */}
                            <div style={{ marginBottom: 8 }}>
                              {r.checks?.map((c, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                  {c.passed
                                    ? <CheckCircle size={12} style={{ color: '#16A34A', flexShrink: 0 }} />
                                    : <XCircle size={12} style={{ color: '#DC2626', flexShrink: 0 }} />
                                  }
                                  <span style={{ color: c.passed ? '#16A34A' : '#DC2626' }}>{c.desc}</span>
                                </div>
                              ))}
                            </div>

                            {/* Error */}
                            {r.error && (
                              <div style={{ padding: '6px 10px', borderRadius: 6, background: '#FEF2F2', color: '#991B1B', marginBottom: 8 }}>
                                Error: {r.error}
                              </div>
                            )}

                            {/* Source type */}
                            {r.sourceType && (
                              <div style={{ marginBottom: 6, color: 'var(--text-muted)' }}>
                                Source: <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.sourceType}</span>
                              </div>
                            )}

                            {/* Response preview */}
                            {r.fullContent && (
                              <div style={{ padding: '8px 10px', borderRadius: 6, background: '#F8FAFC', border: '1px solid var(--border)', maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                                {r.fullContent.slice(0, 500)}{r.fullContent.length > 500 ? '...' : ''}
                              </div>
                            )}

                            {/* Input */}
                            <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>
                              Input: <em>"{test.input}"</em>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Zap size={14} style={{ color: '#1D4ED8', marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.6 }}>
          <strong>How it works:</strong> Each test sends a real message to the Groq LLM with the configured bot persona and validates the response against expected checks. Tests with document context simulate file uploads.
          Tests run sequentially with a 0.5s delay to avoid rate limiting.
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

function StatusIcon({ status, isRunning }) {
  if (isRunning) return <Clock size={14} className="animate-spin" style={{ color: '#2563EB' }} />;
  if (!status) return <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #E2E8F0' }} />;
  if (status === 'pass') return <CheckCircle size={14} style={{ color: '#16A34A' }} />;
  if (status === 'fail') return <XCircle size={14} style={{ color: '#DC2626' }} />;
  if (status === 'error') return <AlertTriangle size={14} style={{ color: '#D97706' }} />;
  return null;
}
