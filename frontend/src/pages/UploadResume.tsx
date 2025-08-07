import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileText, X, Check, ArrowRight } from 'lucide-react';

import { uploadResume } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Logo } from '@/components/shared/Logo';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from '@/hooks/use-toast';

const UploadResume = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedText, setParsedText] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF or DOCX file.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const response = await uploadResume(selectedFile);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success && response.parsedText) {
        setParsedText(response.parsedText);
        toast({
          title: "Resume uploaded successfully!",
          description: "Your resume has been parsed and is ready for analysis.",
        });
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error) {
      clearInterval(progressInterval);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
      setSelectedFile(null);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleContinue = () => {
    navigate('/job-input', { state: { resumeText: parsedText } });
  };

  const removeFile = () => {
    setSelectedFile(null);
    setParsedText('');
    setUploadProgress(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-brand-accent/5">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-16 flex items-center">
          <Logo size="md" />
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold mb-4">Upload Your Resume</h1>
            <p className="text-muted-foreground text-lg">
              Upload your resume to get started with AI-powered job matching and optimization.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Resume Upload</CardTitle>
                <CardDescription>
                  Supported formats: PDF, DOCX • Maximum size: 10MB
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {!selectedFile ? (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Drag and drop your resume here
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      or click to browse your files
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleFileInput}
                      className="hidden"
                      id="file-input"
                    />
                    <label htmlFor="file-input">
                      <Button variant="outline" className="cursor-pointer">
                        Browse Files
                      </Button>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* File Info */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <h4 className="font-medium">{selectedFile.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      
                      {!isUploading && !parsedText && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeFile}
                          className="text-muted-foreground hover:text-error"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Upload Progress */}
                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Uploading...</span>
                          <span className="text-sm font-medium">{Math.round(uploadProgress)}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}

                    {/* Parsed Text Preview */}
                    {parsedText && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4"
                      >
                        <div className="flex items-center space-x-2 text-success">
                          <Check className="h-5 w-5" />
                          <span className="font-medium">Resume parsed successfully!</span>
                        </div>
                        
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <h4 className="font-medium mb-2">Preview:</h4>
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {parsedText.substring(0, 500)}
                            {parsedText.length > 500 && '...'}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4">
                      {!parsedText ? (
                        <Button
                          onClick={handleUpload}
                          disabled={isUploading}
                          className="w-full"
                        >
                          {isUploading ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-2" />
                              Processing Resume...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload & Parse Resume
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="flex space-x-3 w-full">
                          <Button
                            variant="outline"
                            onClick={removeFile}
                            className="flex-1"
                          >
                            Upload Different Resume
                          </Button>
                          <Button
                            onClick={handleContinue}
                            className="flex-1"
                          >
                            Continue to Job Input
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default UploadResume;