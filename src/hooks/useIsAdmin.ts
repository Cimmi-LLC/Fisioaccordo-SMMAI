import { useAuth } from '@/contexts/AuthContext';

export const ADMIN_EMAILS = ['teamcimmi@gmail.com'];

export const useIsAdmin = (): boolean => {
  const { user } = useAuth();
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
};
