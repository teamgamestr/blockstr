// NOTE: This file is stable and usually should not be modified.
// It is important that all functionality in this file is preserved, and should only be modified if explicitly requested.

import { useState } from 'react';
import { User, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import LoginDialog from './LoginDialog';
import SignupDialog from './SignupDialog';
import { useLoggedInAccounts } from '@/hooks/useLoggedInAccounts';
import { AccountSwitcher } from './AccountSwitcher';
import { cn } from '@/lib/utils';

export interface LoginAreaProps {
  className?: string;
}

export function LoginArea({ className }: LoginAreaProps) {
  const { currentUser } = useLoggedInAccounts();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [signupDialogOpen, setSignupDialogOpen] = useState(false);

  const handleLogin = () => {
    setLoginDialogOpen(false);
    setSignupDialogOpen(false);
  };

  return (
    <div className={cn("inline-flex items-center justify-center", className)}>
      {currentUser ? (
        <AccountSwitcher onAddAccountClick={() => setLoginDialogOpen(true)} />
      ) : (
        <div className="flex gap-1.5 sm:gap-2 justify-center">
          <Button
            onClick={() => setLoginDialogOpen(true)}
            size="sm"
            className='flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded border border-gray-700 bg-black text-green-400 font-retro transition-all hover:border-green-400 hover:bg-gray-900 h-8 sm:h-9 text-[0.65rem] sm:text-xs uppercase'
          >
            <User className='w-3 h-3 sm:w-4 sm:h-4' />
            <span className='truncate'>Log in</span>
          </Button>
          <Button
            onClick={() => setSignupDialogOpen(true)}
            size="sm"
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded border border-gray-700 bg-black text-green-400 font-retro transition-all hover:border-green-400 hover:bg-gray-900 h-8 sm:h-9 text-[0.65rem] sm:text-xs uppercase hidden sm:flex"
          >
            <UserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Sign Up</span>
          </Button>
        </div>
      )}

      <LoginDialog
        isOpen={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        onLogin={handleLogin}
        onSignup={() => setSignupDialogOpen(true)}
      />

      <SignupDialog
        isOpen={signupDialogOpen}
        onClose={() => setSignupDialogOpen(false)}
      />
    </div>
  );
}