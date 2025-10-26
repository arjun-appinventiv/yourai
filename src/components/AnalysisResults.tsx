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
      <Card className="p-6 border-border/50 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Draft Scope of Work</h3>
        </div>
        <div className="prose prose-sm max-w-none text-foreground">
          <p className="whitespace-pre-wrap leading-relaxed">{analysis.scopeOfWork}</p>
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
