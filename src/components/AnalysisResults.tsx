import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, CheckCircle2, FileText } from "lucide-react";
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
    </div>
  );
};
