import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, CheckCircle2, FileText, Zap } from "lucide-react";
import type { AnalysisResult } from "@/pages/Index";

interface AnalysisResultsProps {
  analysis: AnalysisResult;
}

export const AnalysisResults = ({ analysis }: AnalysisResultsProps) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Insights */}
      <Card className="p-6 border-border/50 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Market Insights</h3>
        </div>
        <div className="prose prose-sm max-w-none text-foreground">
          <p className="whitespace-pre-wrap leading-relaxed">{analysis.insights}</p>
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
