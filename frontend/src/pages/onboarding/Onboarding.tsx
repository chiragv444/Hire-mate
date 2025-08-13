import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

import { OnboardingData, ResumeFileData } from '@/types';
import { OnboardingService, createAnalysisSession, uploadResumeForAnalysis, setDefaultResume } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Logo } from '@/components/shared/Logo';
import { toast } from '@/hooks/use-toast';

// Import step components
import Step1CurrentStatus from './Step1CurrentStatus';
import Step2Industry from './Step2Industry';
import Step3CareerPath from './Step3CareerPath';
import Step4ExperienceLevel from './Step4ExperienceLevel';
import Step5ResumeUpload from './Step5ResumeUpload';
import Step6UserGoals from './Step6UserGoals';
import Step7UserNote from './Step7UserNote';

const TOTAL_STEPS = 7; // Resume upload step is back but optional

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, updateUserDocument } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({});

  // Helper function to clean onboarding data for Firestore
  const cleanOnboardingDataForFirestore = (data: Partial<OnboardingData>): Partial<OnboardingData> => {
    const cleanData = { ...data };
    
    // Clean resumeFile if it's a File object
    if (cleanData.resumeFile && cleanData.resumeFile instanceof File) {
      cleanData.resumeFile = {
        name: cleanData.resumeFile.name,
        size: cleanData.resumeFile.size,
        type: cleanData.resumeFile.type,
        uploaded: false
      } as ResumeFileData;
    }
    
    // Remove undefined values that can't be saved to Firestore
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key as keyof OnboardingData] === undefined) {
        delete cleanData[key as keyof OnboardingData];
      }
    });
    
    return cleanData;
  };

  // Load existing onboarding progress when component mounts
  useEffect(() => {
    const loadOnboardingProgress = async () => {
      if (user?.uid) {
        try {
          const progress = await OnboardingService.getOnboardingProgress(user.uid);
          if (progress && Object.keys(progress).length > 0) {
            // Merge all step data into onboardingData and clean it
            const mergedData = Object.values(progress).reduce((acc: any, stepData: any) => {
              // Clean each step's data to remove null/undefined values
              const cleanStepData = Object.fromEntries(
                Object.entries(stepData).filter(([_, value]) => value !== null && value !== undefined)
              );
              return { ...acc, ...cleanStepData };
            }, {});
            
            // Clean the merged data before setting state
            const cleanMergedData = cleanOnboardingDataForFirestore(mergedData);
            setOnboardingData(cleanMergedData);
            
            // Determine the last completed step and set current step accordingly
            const completedSteps = Object.keys(progress).length;
            console.log('Loaded onboarding progress:', progress);
            console.log('Completed steps:', completedSteps);
            if (completedSteps > 0 && completedSteps < TOTAL_STEPS) {
              setCurrentStep(completedSteps + 1);
              console.log('Setting current step to:', completedSteps + 1);
            }
          }
        } catch (error) {
          console.error('Error loading onboarding progress:', error);
        }
      }
    };

    loadOnboardingProgress();
  }, [user?.uid]);

  const updateData = async (stepData: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...stepData }));
    
    // Save step progress to Firestore if user is logged in
    if (user?.uid) {
      try {
        console.log('Saving step progress for step', currentStep, ':', stepData);
        
        const cleanStepData = cleanOnboardingDataForFirestore(stepData);
        console.log('Clean step data:', cleanStepData);
        
        // Only save if we have valid data
        if (Object.keys(cleanStepData).length > 0) {
          await OnboardingService.saveOnboardingProgress(user.uid, `step${currentStep}`, cleanStepData);
          console.log('Step progress saved successfully');
        } else {
          console.log('No valid data to save for step', currentStep);
        }
      } catch (error) {
        console.error('Error saving step progress:', error);
      }
    }
  };

  const nextStep = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipResume = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to complete onboarding.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create clean onboarding data without File objects for Firestore
      const cleanOnboardingData = cleanOnboardingDataForFirestore(onboardingData);
      
      // Remove resume-related data since user skipped it
      delete cleanOnboardingData.resumeFile;
      delete cleanOnboardingData.resumeData;
      
      // Save onboarding data to Firestore (without resume)
      await OnboardingService.completeOnboarding(user.uid, cleanOnboardingData as OnboardingData);
      
      // Update user document with onboarding completion
      await updateUserDocument({
        onboardingComplete: true,
        ...cleanOnboardingData
      });

      toast({
        title: "Welcome aboard!",
        description: "Your onboarding has been completed successfully. You can upload your resume later.",
      });
      navigate('/workspace');
    } catch (error) {
      console.error('Onboarding completion error:', error);
      toast({
        title: "Error",
        description: "Failed to save onboarding data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to complete onboarding.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // If user uploaded a resume during onboarding, it was already uploaded via the API
      // We just need to check if we have the resume data
      if (onboardingData.resumeData && onboardingData.resumeData.id) {
        try {
          // The resume was already uploaded via the API, so we can use the resume ID
          const resumeId = onboardingData.resumeData.id;
          
          // Set this resume as the user's default
          await setDefaultResume(user.uid, resumeId);
          
          toast({
            title: "Resume uploaded!",
            description: "Your resume has been saved as your default resume.",
          });
        } catch (resumeError) {
          console.error('Resume setup error:', resumeError);
          toast({
            title: "Resume setup failed",
            description: "Your onboarding was completed, but we couldn't set your resume as default. You can do this later.",
            variant: "destructive",
          });
        }
      }
      
      // Create clean onboarding data without File objects for Firestore
      const cleanOnboardingData = cleanOnboardingDataForFirestore(onboardingData);
      
      console.log('Original onboarding data:', onboardingData);
      console.log('Clean onboarding data:', cleanOnboardingData);
      
      // Only process resumeFile if it exists and is not a File object
      if (cleanOnboardingData.resumeFile && !(cleanOnboardingData.resumeFile instanceof File)) {
        // Update the metadata to show it was uploaded
        (cleanOnboardingData.resumeFile as ResumeFileData).uploaded = true;
        
        // If we have resume data from the API, use that ID
        if (onboardingData.resumeData && onboardingData.resumeData.id) {
          (cleanOnboardingData.resumeFile as ResumeFileData).analysisId = onboardingData.resumeData.id;
        }
      }
      
      // Remove resumeData if it's undefined to avoid Firestore errors
      if (cleanOnboardingData.resumeData === undefined) {
        delete cleanOnboardingData.resumeData;
      }
      
      console.log('Final clean data to save:', cleanOnboardingData);
      
      // Save onboarding data to Firestore
      await OnboardingService.completeOnboarding(user.uid, cleanOnboardingData as OnboardingData);
      
      // Update user document with onboarding completion
      await updateUserDocument({
        onboardingComplete: true,
        ...cleanOnboardingData
      });

      toast({
        title: "Welcome aboard!",
        description: "Your onboarding was completed successfully.",
      });
      navigate('/workspace');
    } catch (error) {
      console.error('Onboarding completion error:', error);
      toast({
        title: "Error",
        description: "Failed to save onboarding data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    const stepProps = {
      data: onboardingData,
      updateData,
      onNext: nextStep,
      onPrev: prevStep,
      isLoading,
    };

    switch (currentStep) {
      case 1:
        return <Step1CurrentStatus {...stepProps} />;
      case 2:
        return <Step2Industry {...stepProps} />;
      case 3:
        return <Step3CareerPath {...stepProps} />;
      case 4:
        return <Step4ExperienceLevel {...stepProps} />;
      case 5:
        return <Step5ResumeUpload {...stepProps} onSkip={handleSkipResume} />;
      case 6:
        return <Step6UserGoals {...stepProps} />;
      case 7:
        return <Step7UserNote {...stepProps} onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  const progressPercentage = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-brand-accent/5">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="md" />
          <div className="text-sm text-muted-foreground">
            Step {currentStep} of {TOTAL_STEPS}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Progress
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </motion.div>

        {/* Step Content */}
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="max-w-2xl mx-auto mt-8 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1 || isLoading}
            className="flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex space-x-2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i + 1)}
                disabled={isLoading}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i + 1 === currentStep
                    ? 'bg-primary'
                    : i + 1 < currentStep
                    ? 'bg-success'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {currentStep === TOTAL_STEPS ? (
            <Button
              onClick={handleComplete}
              disabled={isLoading}
              className="flex items-center"
            >
              {isLoading ? (
                'Completing...'
              ) : (
                <>
                  Complete
                  <Check className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={isLoading}
              className="flex items-center"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;