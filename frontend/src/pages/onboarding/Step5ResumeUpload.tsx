import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Loader2, CheckCircle, X } from 'lucide-react';
import { OnboardingData } from '@/types';
import { Button } from '@/components/ui/button';
import { uploadOnboardingResume } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface Step5Props {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

const Step5ResumeUpload: React.FC<Step5Props> = ({ data, updateData, onNext, onSkip, isLoading }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(data.resumeFile || null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedResume, setUploadedResume] = useState<any>(null);

  const handleFileSelect = (file: File) => {
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file type - Only PDF files allowed
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file only.",
        variant: "destructive",
      });
      return;
    }
    
    // Just set the selected file, don't upload yet
    setSelectedFile(file);
    updateData({ resumeFile: file });
  };

  const handleContinue = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Upload resume using the new onboarding API
      const result = await uploadOnboardingResume(selectedFile);
      
      if (result.success) {
        setUploadedResume(result.resume);
        updateData({ resumeFile: selectedFile, resumeData: result.resume });
        toast({
          title: "Resume uploaded!",
          description: "Your resume has been uploaded and set as default.",
        });
        onNext(); // Proceed to next step after successful upload
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Resume upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadedResume(null);
    updateData({ resumeFile: null, resumeData: null });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  return (
    <motion.div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Upload your resume</h2>
        <p className="text-muted-foreground text-lg">
          This will be your default resume for job matching. You can always upload a different one later.
        </p>
      </div>

      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Uploading your resume...</h3>
            <p className="text-muted-foreground mb-4">Please wait while we process your file</p>
          </>
        ) : selectedFile ? (
          <>
            <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Resume selected</h3>
            <div className="mt-4 flex items-center justify-center space-x-2 bg-muted rounded-lg p-3">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{selectedFile.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-muted-foreground text-sm mt-2">
              Click "Continue" to upload and proceed, or remove to select a different file.
            </p>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Upload your resume</h3>
            <p className="text-muted-foreground mb-4">PDF only, max 10MB</p>
            <p className="text-sm text-muted-foreground mb-4">Drag and drop your file here, or click to browse</p>
            
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileInput}
              className="hidden"
              id="resume-upload"
              disabled={isUploading}
            />
            <Button 
              variant="outline" 
              onClick={() => document.getElementById('resume-upload')?.click()}
              disabled={isUploading}
            >
              Choose File
            </Button>
          </>
        )}
      </div>

      <div className="flex gap-4">
        {onSkip && (
          <Button 
            variant="outline" 
            onClick={onSkip} 
            className="flex-1"
            disabled={isUploading || isLoading}
          >
            Skip for now
          </Button>
        )}
        <Button 
          onClick={handleContinue} 
          className="flex-1" 
          disabled={!selectedFile || isUploading || isLoading}
        >
          {isUploading ? 'Uploading...' : 'Continue'}
        </Button>
      </div>
    </motion.div>
  );
};

export default Step5ResumeUpload;