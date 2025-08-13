import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Moon, Sun, Bell, Mail, Zap, Shield, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Logo } from '@/components/shared/Logo';
import { toast } from '@/hooks/use-toast';

const Settings = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [resumeTips, setResumeTips] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('hiremate_theme') as 'light' | 'dark' | 'system';
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = window.document.documentElement;
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', newTheme === 'dark');
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('hiremate_theme', newTheme);
    
    toast({
      title: "Theme updated",
      description: `Theme changed to ${newTheme}`,
    });
  };

  const handleNotificationChange = (type: string, value: boolean) => {
    switch (type) {
      case 'email':
        setEmailNotifications(value);
        break;
      case 'tips':
        setResumeTips(value);
        break;
      case 'alerts':
        setJobAlerts(value);
        break;
      case 'reports':
        setWeeklyReports(value);
        break;
      case 'marketing':
        setMarketingEmails(value);
        break;
    }

    toast({
      title: "Preferences updated",
      description: "Your notification preferences have been saved.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-brand-accent/5">
      {/* Header */}
      <header className="glass-header">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/workspace">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Workspace
              </Button>
            </Link>
            <Logo size="md" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold mb-4">Settings</h1>
            <p className="text-muted-foreground text-lg">
              Customize your Hire Mate experience
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Appearance Settings */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Sun className="h-5 w-5 mr-2" />
                    Appearance
                  </CardTitle>
                  <CardDescription>
                    Customize how Hire Mate looks and feels
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Theme</Label>
                    <Select value={theme} onValueChange={handleThemeChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-dropdown">
                        <SelectItem value="light">
                          <div className="flex items-center">
                            <Sun className="h-4 w-4 mr-2" />
                            Light
                          </div>
                        </SelectItem>
                        <SelectItem value="dark">
                          <div className="flex items-center">
                            <Moon className="h-4 w-4 mr-2" />
                            Dark
                          </div>
                        </SelectItem>
                        <SelectItem value="system">
                          <div className="flex items-center">
                            <Zap className="h-4 w-4 mr-2" />
                            System
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose your preferred color theme. System will match your device settings.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Notification Settings */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    Notifications
                  </CardTitle>
                  <CardDescription>
                    Control what notifications you receive
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-xs text-muted-foreground">
                          Receive important updates via email
                        </p>
                      </div>
                      <Switch
                        checked={emailNotifications}
                        onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Resume Tips</Label>
                        <p className="text-xs text-muted-foreground">
                          Get weekly tips to improve your resume
                        </p>
                      </div>
                      <Switch
                        checked={resumeTips}
                        onCheckedChange={(checked) => handleNotificationChange('tips', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Job Alerts</Label>
                        <p className="text-xs text-muted-foreground">
                          Get notified about relevant job opportunities
                        </p>
                      </div>
                      <Switch
                        checked={jobAlerts}
                        onCheckedChange={(checked) => handleNotificationChange('alerts', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Weekly Reports</Label>
                        <p className="text-xs text-muted-foreground">
                          Summary of your activity and progress
                        </p>
                      </div>
                      <Switch
                        checked={weeklyReports}
                        onCheckedChange={(checked) => handleNotificationChange('reports', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Marketing Emails</Label>
                        <p className="text-xs text-muted-foreground">
                          Product updates and feature announcements
                        </p>
                      </div>
                      <Switch
                        checked={marketingEmails}
                        onCheckedChange={(checked) => handleNotificationChange('marketing', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Privacy & Security */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Privacy & Security
                  </CardTitle>
                  <CardDescription>
                    Manage your privacy and security settings
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <Mail className="h-4 w-4 mr-2" />
                    Change Email Address
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <Shield className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <Zap className="h-4 w-4 mr-2" />
                    Two-Factor Authentication
                  </Button>

                  <div className="pt-4 border-t">
                    <Button variant="outline" className="w-full justify-start" disabled>
                      Download My Data
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Get a copy of all your data in Hire Mate
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button variant="outline" className="w-full justify-start text-error hover:text-error" disabled>
                      Delete Account
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Permanently delete your account and all data
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground text-center pt-4">
                    These features are coming soon in a future update
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Help & Support */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <HelpCircle className="h-5 w-5 mr-2" />
                    Help & Support
                  </CardTitle>
                  <CardDescription>
                    Get help and provide feedback
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Help Center
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <Zap className="h-4 w-4 mr-2" />
                    Feature Requests
                  </Button>

                  <div className="pt-4 border-t">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Version:</span>
                        <span className="font-mono">1.0.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last updated:</span>
                        <span>{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      Made with ❤️ by the Hire Mate team
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Save Settings Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <Button 
              className="px-8"
              onClick={() => toast({
                title: "Settings saved",
                description: "All your preferences have been saved successfully.",
              })}
            >
              Save All Settings
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;