import React from 'react';
import { motion } from 'framer-motion';
import { OnboardingData } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface Step7Props {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onComplete: () => void;
  isLoading: boolean;
}

const Step7UserNote: React.FC<Step7Props> = ({ data, updateData, onComplete, isLoading }) => {
  return (
    <motion.div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Anything else we should know?</h2>
        <p className="text-muted-foreground text-lg">
          Share any specific career goals, preferences, or challenges (optional).
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="userNote">Additional Notes</Label>
        <Textarea
          id="userNote"
          placeholder="Tell us about your career goals, specific companies you're interested in, or any challenges you're facing in your job search..."
          className="min-h-[120px]"
          value={data.userNote || ''}
          onChange={(e) => updateData({ userNote: e.target.value })}
        />
      </div>

      <Button 
        onClick={onComplete} 
        className="w-full" 
        size="lg"
        disabled={isLoading}
      >
        {isLoading ? 'Setting up your account...' : 'Complete Setup'}
      </Button>
    </motion.div>
  );
};

export default Step7UserNote;