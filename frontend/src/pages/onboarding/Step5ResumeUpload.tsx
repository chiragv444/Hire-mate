import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText } from 'lucide-react';
import { OnboardingData } from '@/types';
import { Button } from '@/components/ui/button';

interface Step5Props {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip?: () => void;
}

const Step5ResumeUpload: React.FC<Step5Props> = ({ data, updateData, onNext, onSkip }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(data.resumeFile || null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    updateData({ resumeFile: file });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <motion.div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Upload your resume</h2>
        <p className="text-muted-foreground text-lg">
          This will be your default resume for job matching. You can always upload a different one later.
        </p>
      </div>

      <div className="border-2 border-dashed rounded-lg p-8 text-center">
        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Upload your resume</h3>
        <p className="text-muted-foreground mb-4">PDF or DOCX, max 10MB</p>
        
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileInput}
          className="hidden"
          id="resume-upload"
        />
        <label htmlFor="resume-upload">
          <Button variant="outline" className="cursor-pointer">
            Choose File
          </Button>
        </label>

        {selectedFile && (
          <div className="mt-4 flex items-center justify-center space-x-2">
            <FileText className="h-4 w-4 text-success" />
            <span className="text-sm">{selectedFile.name}</span>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {onSkip && (
          <Button 
            variant="outline" 
            onClick={onSkip} 
            className="flex-1"
          >
            Skip for now
          </Button>
        )}
        <Button 
          onClick={onNext} 
          className="flex-1" 
          disabled={!selectedFile}
        >
          Continue
        </Button>
      </div>
    </motion.div>
  );
};

export default Step5ResumeUpload;