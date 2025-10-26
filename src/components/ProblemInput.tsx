import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { analyzeProb } from "@/lib/analysis";
import type { AnalysisResult } from "@/pages/Index";

interface ProblemInputProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (value: boolean) => void;
}

export const ProblemInput = ({ onAnalysisComplete, isAnalyzing, setIsAnalyzing }: ProblemInputProps) => {
  const [problemText, setProblemText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image (JPG, PNG, WEBP) or PDF file",
          variant: "destructive",
        });
        return;
      }
      setUploadedFile(file);
      toast({
        title: "File uploaded",
        description: `${file.name} ready for analysis`,
      });
    }
  };

  const handleAnalyze = async () => {
    if (!problemText.trim() && !uploadedFile) {
      toast({
        title: "Input required",
        description: "Please provide a problem statement or upload a file",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeProb(problemText, uploadedFile);
      onAnalysisComplete(result);
      toast({
        title: "Analysis complete",
        description: "Your problem has been analyzed successfully",
      });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Please check your API key and try again",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="p-6 border-border/50 shadow-lg">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Problem Statement</h2>
          <p className="text-muted-foreground">
            Describe the problem you want to solve or upload a document
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="problem">Problem Description</Label>
            <Textarea
              id="problem"
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="Describe the problem statement in detail..."
              className="min-h-[200px] mt-2"
            />
          </div>

          <div>
            <Label htmlFor="file">Upload Document (Optional)</Label>
            <div className="mt-2">
              <label
                htmlFor="file"
                className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:border-primary/50 transition-colors"
              >
                <input
                  id="file"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-6 h-6 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {uploadedFile ? uploadedFile.name : "Click to upload"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Images or PDF files
                  </p>
                </div>
              </label>
              {uploadedFile && (
                <div className="flex items-center gap-2 mt-3 text-sm text-primary">
                  {uploadedFile.type.startsWith("image/") ? (
                    <ImageIcon className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>{uploadedFile.name}</span>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            variant="gradient"
            className="w-full h-12 text-base"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Problem"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};
