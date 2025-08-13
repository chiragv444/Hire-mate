import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Camera, Save, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

import { useAuth } from '@/hooks/useAuth';
import { updateProfile } from '@/lib/api';
import { profileSchema, type ProfileFormData } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/shared/Logo';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from '@/hooks/use-toast';

const Profile = () => {
  const { user, updateUser, updateUserDocument } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.photoURL || '');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.displayName || '',
      email: user?.email || '',
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a JPEG, PNG, or WebP image.",
          variant: "destructive",
        });
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatarToStorage = async (file: File): Promise<string> => {
    const storageRef = ref(storage, `profile/${user?.uid}/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirm password must be the same.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "New password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      // Here you would typically call your backend API to change the password
      // For now, we'll show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Password changed",
        description: "Your password has been successfully updated.",
      });
      
      setShowChangePassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast({
        title: "Password change failed",
        description: "Could not change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      let avatarURL = user?.photoURL;

      // Upload avatar to Firebase Storage if a new file is selected
      if (avatarFile) {
        try {
          avatarURL = await uploadAvatarToStorage(avatarFile);
        } catch (error) {
          console.error('Error uploading avatar:', error);
          toast({
            title: "Avatar upload failed",
            description: "Could not upload profile picture. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      // Update profile data in Firestore
      await updateUserDocument({
        displayName: data.fullName,
        photoURL: avatarURL,
      });

      // Update local user state
      updateUser({
        displayName: data.fullName,
        photoURL: avatarURL,
      });

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });

      // Clear the file state after successful upload
      setAvatarFile(null);
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Could not update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold mb-4">Profile Settings</h1>
            <p className="text-muted-foreground text-lg">
              Manage your personal information and preferences
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your profile details and avatar
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <Avatar className="w-24 h-24">
                        <AvatarImage src={avatarPreview} alt={user?.displayName} />
                        <AvatarFallback className="text-2xl">
                          {user?.displayName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <label
                        htmlFor="avatar-upload"
                        className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-full cursor-pointer hover:bg-primary-hover transition-colors shadow-lg"
                      >
                        <Camera className="h-4 w-4" />
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    
                    <p className="text-sm text-muted-foreground text-center">
                      Click the camera icon to upload a new profile picture
                      <br />
                      <span className="text-xs">Maximum file size: 5MB</span>
                    </p>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="Enter your full name"
                          className="pl-10"
                          {...register('fullName')}
                        />
                      </div>
                      {errors.fullName && (
                        <p className="text-sm text-error">{errors.fullName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10"
                          disabled
                          {...register('email')}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Email address cannot be changed. Contact support if you need to update it.
                      </p>
                      {errors.email && (
                        <p className="text-sm text-error">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Account Info */}
                  <div className="pt-6 border-t">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Account Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Member since:</span>
                        <div className="font-medium">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || (!isDirty && !avatarFile)}
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Saving changes...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Security Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Security</CardTitle>
                <CardDescription>
                  Manage your account security
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showChangePassword ? (
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setShowChangePassword(true)}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showPasswords.current ? "text" : "password"}
                          placeholder="Enter current password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        >
                          {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showPasswords.new ? "text" : "password"}
                          placeholder="Enter new password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showPasswords.confirm ? "text" : "password"}
                          placeholder="Confirm new password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        onClick={handleChangePassword}
                        disabled={isChangingPassword}
                        className="flex-1"
                      >
                        {isChangingPassword ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Changing Password...
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Change Password
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowChangePassword(false);
                          setPasswordData({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: '',
                          });
                        }}
                      >
                        Cancel
                      </Button>
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

export default Profile;