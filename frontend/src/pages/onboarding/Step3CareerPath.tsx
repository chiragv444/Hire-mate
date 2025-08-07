import React from 'react';
import { motion } from 'framer-motion';
import { OnboardingData } from '@/types';
import { CAREER_PATHS_BY_INDUSTRY } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';

interface Step3Props {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
}

const Step3CareerPath: React.FC<Step3Props> = ({ data, updateData, onNext }) => {
  const careerPaths = CAREER_PATHS_BY_INDUSTRY[data.industry || 'other'] || CAREER_PATHS_BY_INDUSTRY.other;

  const handleSelect = (careerPath: string) => {
    updateData({ careerPath });
    setTimeout(onNext, 300);
  };

  return (
    <motion.div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">What's your career path?</h2>
        <p className="text-muted-foreground text-lg">
          Choose the role that best matches your career goals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {careerPaths.map((option, index) => (
          <motion.div
            key={option.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${
                data.careerPath === option.value
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handleSelect(option.value)}
            >
              <CardContent className="p-4 text-center">
                <h3 className="font-semibold">{option.label}</h3>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Step3CareerPath;