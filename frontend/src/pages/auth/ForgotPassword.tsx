import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validation';
import { resetPassword } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/shared/Logo';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from '@/hooks/use-toast';

const ForgotPassword = () => {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  if (isAuthenticated) {
    return <Navigate to="/workspace" replace />;
  }

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      const response = await resetPassword(data.email);
      if (response.success) {
        setIsSubmitted(true);
        toast({
          title: "Reset link sent",
          description: response.message,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reset link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-brand-accent/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Logo size="lg" className="justify-center mb-4" />
          <h1 className="text-2xl font-bold text-foreground">
            {isSubmitted ? 'Check your email' : 'Reset password'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isSubmitted 
              ? 'We\'ve sent a password reset link to your email'
              : 'Enter your email to receive a reset link'
            }
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          {!isSubmitted ? (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl">Reset password</CardTitle>
                <CardDescription>
                  Enter your email address and we'll send you a link to reset your password
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10"
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-error">{errors.email.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Sending reset link...
                      </>
                    ) : (
                      'Send reset link'
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center text-sm text-primary hover:text-primary-hover transition-colors"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to sign in
                  </Link>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="text-center py-8">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-success" />
              </div>
              
              <h3 className="text-lg font-semibold mb-2">Reset link sent!</h3>
              <p className="text-muted-foreground mb-6">
                We've sent a password reset link to your email. Check your inbox and follow the instructions to reset your password.
              </p>

              <div className="space-y-3">
                <Button 
                  onClick={() => setIsSubmitted(false)}
                  variant="outline" 
                  className="w-full"
                >
                  Resend link
                </Button>
                
                <Link to="/login">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to sign in
                  </Button>
                </Link>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;