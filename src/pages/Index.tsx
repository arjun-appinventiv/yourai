import { useState } from "react";
import { ProblemInput } from "@/components/ProblemInput";
import { AnalysisResults } from "@/components/AnalysisResults";
import { ApiKeyConfig } from "@/components/ApiKeyConfig";
import { Sparkles } from "lucide-react";

export interface AnalysisResult {
  insights: string;
  features: string[];
  scopeOfWork: string;
}

const Index = () => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-elegant">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Problem Analysis AI
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Analyze problem statements and get AI-powered insights, feature suggestions, and scope of work drafts
          </p>
        </div>

        {/* API Key Config */}
        <ApiKeyConfig />

        {/* Main Content */}
        <div className="grid gap-8 mt-8">
          <ProblemInput
            onAnalysisComplete={setAnalysis}
            isAnalyzing={isAnalyzing}
            setIsAnalyzing={setIsAnalyzing}
          />
          
          {analysis && <AnalysisResults analysis={analysis} />}
        </div>
      </div>
    </div>
  );
};

export default Index;
