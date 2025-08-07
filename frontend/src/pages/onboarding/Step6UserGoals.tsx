import React from 'react';
import { motion } from 'framer-motion';
import { OnboardingData } from '@/types';
import { USER_GOALS } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface Step6Props {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
}

const Step6UserGoals: React.FC<Step6Props> = ({ data, updateData, onNext }) => {
  const selectedGoals = data.userGoals || [];

  const handleGoalToggle = (goalValue: string, checked: boolean) => {
    let newGoals;
    if (checked) {
      newGoals = [...selectedGoals, goalValue];
    } else {
      newGoals = selectedGoals.filter(g => g !== goalValue);
    }
    updateData({ userGoals: newGoals });
  };

  return (
    <motion.div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">What are your goals?</h2>
        <p className="text-muted-foreground text-lg">
          Select all that apply to help us personalize your experience.
        </p>
      </div>

      <div className="space-y-4">
        {USER_GOALS.map((goal, index) => (
          <motion.div
            key={goal.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center space-x-3"
          >
            <Checkbox
              id={goal.value}
              checked={selectedGoals.includes(goal.value)}
              onCheckedChange={(checked) => handleGoalToggle(goal.value, checked as boolean)}
            />
            <label
              htmlFor={goal.value}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {goal.label}
            </label>
          </motion.div>
        ))}
      </div>

      <Button 
        onClick={onNext} 
        className="w-full" 
        disabled={selectedGoals.length === 0}
      >
        Continue
      </Button>
    </motion.div>
  );
};

export default Step6UserGoals;