import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

import { OnboardingData } from '@/types';
import { OnboardingService } from '@/lib/firestore';
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

  // Load existing onboarding progress when component mounts
  useEffect(() => {
    const loadOnboardingProgress = async () => {
      if (user?.uid) {
        try {
          const progress = await OnboardingService.getOnboardingProgress(user.uid);
          if (progress && Object.keys(progress).length > 0) {
            // Merge all step data into onboardingData
            const mergedData = Object.values(progress).reduce((acc: any, stepData: any) => ({
              ...acc,
              ...stepData
            }), {});
            setOnboardingData(mergedData);
            
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
        await OnboardingService.saveOnboardingProgress(user.uid, `step${currentStep}`, stepData);
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
      // Save onboarding data to Firestore (without resume)
      await OnboardingService.completeOnboarding(user.uid, onboardingData as OnboardingData);
      
      // Update user document with onboarding completion
      await updateUserDocument({
        onboardingComplete: true,
        ...onboardingData
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
      // Save onboarding data to Firestore
      await OnboardingService.completeOnboarding(user.uid, onboardingData as OnboardingData);
      
      // Update user document with onboarding completion
      await updateUserDocument({
        onboardingComplete: true,
        ...onboardingData
      });

      toast({
        title: "Welcome aboard!",
        description: "Your onboarding has been completed successfully.",
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