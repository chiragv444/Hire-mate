import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, GraduationCap, Search, Users } from 'lucide-react';

import { OnboardingData } from '@/types';
import { CURRENT_STATUS_OPTIONS } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';

interface Step1Props {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
}

const Step1CurrentStatus: React.FC<Step1Props> = ({ data, updateData, onNext }) => {
  const handleSelect = (status: string) => {
    updateData({ currentStatus: status });
    // Auto-advance after selection
    setTimeout(onNext, 300);
  };

  const getIcon = (value: string) => {
    switch (value) {
      case 'actively-looking': return <Search className="h-6 w-6" />;
      case 'passively-open': return <Briefcase className="h-6 w-6" />;
      case 'employed-happy': return <Users className="h-6 w-6" />;
      case 'student': return <GraduationCap className="h-6 w-6" />;
      default: return <Briefcase className="h-6 w-6" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">What's your current status?</h2>
        <p className="text-muted-foreground text-lg">
          This helps us personalize your experience and provide better recommendations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CURRENT_STATUS_OPTIONS.map((option, index) => (
          <motion.div
            key={option.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${
                data.currentStatus === option.value
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handleSelect(option.value)}
            >
              <CardContent className="p-6 flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${
                  data.currentStatus === option.value
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {getIcon(option.value)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{option.label}</h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Step1CurrentStatus;