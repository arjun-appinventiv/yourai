import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, CheckCircle2, FileText, Zap, AlertTriangle, Building2, TrendingUp, XCircle } from "lucide-react";
import type { AnalysisResult } from "@/pages/Index";

interface AnalysisResultsProps {
  analysis: AnalysisResult;
}

export const AnalysisResults = ({ analysis }: AnalysisResultsProps) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Market Insights */}
      <Card className="p-6 border-border/50 shadow-lg">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Market Insights & Case Studies</h3>
        </div>
        
        <div className="space-y-6">
          {/* Case Studies */}
          {analysis.insights.caseStudies && analysis.insights.caseStudies.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Company Case Studies
              </h4>
              {analysis.insights.caseStudies.map((study, idx) => (
                <div key={idx} className="border border-border rounded-lg p-5 bg-muted/30 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <h5 className="text-lg font-bold text-primary">{study.company}</h5>
                    <Badge variant="outline">Case Study {idx + 1}</Badge>
                  </div>
                  
                  {/* Approach */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-accent" />
                      <span className="font-semibold text-sm text-accent">Their Approach</span>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed pl-6">
                      {study.approach}
                    </p>
                  </div>

                  {/* Features */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-sm text-green-600">Key Features Implemented</span>
                    </div>
                    <ul className="space-y-1 pl-6">
                      {study.features.map((feature, fIdx) => (
                        <li key={fIdx} className="text-sm text-foreground/90 flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Failures */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-destructive" />
                      <span className="font-semibold text-sm text-destructive">Where They Struggled</span>
                    </div>
                    <ul className="space-y-1 pl-6">
                      {study.failures.map((failure, fIdx) => (
                        <li key={fIdx} className="text-sm text-foreground/90 flex items-start gap-2">
                          <span className="text-destructive mt-1">•</span>
                          <span>{failure}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {analysis.insights.recommendations && analysis.insights.recommendations.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border">
              <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                What to Avoid - Key Recommendations
              </h4>
              <div className="space-y-2">
                {analysis.insights.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm leading-relaxed text-foreground/90">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Features */}
      <Card className="p-6 border-border/50 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-accent/10">
            <CheckCircle2 className="w-5 h-5 text-accent" />
          </div>
          <h3 className="text-xl font-semibold">Suggested Features</h3>
        </div>
        <div className="space-y-2">
          {analysis.features.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <Badge variant="outline" className="mt-0.5 shrink-0">
                {index + 1}
              </Badge>
              <p className="text-sm leading-relaxed">{feature}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Scope of Work */}
      <Card className="p-8 border-border/50 shadow-lg bg-card">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Draft Scope of Work</h3>
        </div>
        <div className="space-y-4">
          <div className="prose prose-slate max-w-none">
            {analysis.scopeOfWork.split('\n').map((line, idx) => {
              // H1 headers
              if (line.startsWith('# ')) {
                return (
                  <h1 key={idx} className="text-3xl font-bold mt-8 mb-4 text-foreground border-b-2 border-primary pb-2">
                    {line.substring(2)}
                  </h1>
                );
              }
              // H2 headers
              if (line.startsWith('## ')) {
                return (
                  <h2 key={idx} className="text-2xl font-semibold mt-6 mb-3 text-foreground">
                    {line.substring(3)}
                  </h2>
                );
              }
              // H3 headers
              if (line.startsWith('### ')) {
                return (
                  <h3 key={idx} className="text-xl font-semibold mt-4 mb-2 text-primary">
                    {line.substring(4)}
                  </h3>
                );
              }
              // Bold text
              if (line.startsWith('**') && line.endsWith('**')) {
                return (
                  <p key={idx} className="font-semibold text-foreground mt-2">
                    {line.substring(2, line.length - 2)}
                  </p>
                );
              }
              // List items
              if (line.startsWith('- ')) {
                return (
                  <li key={idx} className="ml-6 text-foreground/90 my-1">
                    {line.substring(2)}
                  </li>
                );
              }
              // Numbered lists
              if (/^\d+\.\s/.test(line)) {
                return (
                  <li key={idx} className="ml-6 text-foreground/90 my-1 list-decimal">
                    {line.substring(line.indexOf('.') + 2)}
                  </li>
                );
              }
              // Horizontal rule
              if (line === '---') {
                return <hr key={idx} className="my-8 border-border" />;
              }
              // Empty line
              if (line.trim() === '') {
                return <div key={idx} className="h-2" />;
              }
              // Regular paragraph
              return (
                <p key={idx} className="text-foreground/90 leading-relaxed my-2">
                  {line}
                </p>
              );
            })}
          </div>
          <div className="flex gap-2 flex-wrap pt-6 border-t border-border/50">
            <Badge variant="secondary" className="text-xs">
              Professional Document
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Ready for Implementation
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Client-Ready
            </Badge>
          </div>
        </div>
      </Card>

      {/* AI Tools Recommendations */}
      {analysis.aiTools && analysis.aiTools.length > 0 && (
        <Card className="p-6 border-border/50 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-accent/10">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">Recommended AI Tools</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Speed up development with these AI tools and APIs that match your project needs
          </p>
          <div className="space-y-6">
            {analysis.aiTools.map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-3">
                <h4 className="text-lg font-semibold text-primary">{category.category}</h4>
                <div className="grid gap-3">
                  {category.tools.map((tool, toolIndex) => (
                    <div
                      key={toolIndex}
                      className="p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h5 className="font-semibold text-base">{tool.name}</h5>
                        <Badge variant="secondary" className="shrink-0">
                          {tool.useCase}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {tool.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
