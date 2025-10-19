// NOTE: This file is stable and usually should not be modified.
// It is important that all functionality in this file is preserved, and should only be modified if explicitly requested.

import { ChevronDown, LogOut, UserIcon, UserPlus, Wallet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { RelaySelector } from '@/components/RelaySelector';
import { WalletModal } from '@/components/WalletModal';
import { useLoggedInAccounts, type Account } from '@/hooks/useLoggedInAccounts';
import { genUserName } from '@/lib/genUserName';

interface AccountSwitcherProps {
  onAddAccountClick: () => void;
}

export function AccountSwitcher({ onAddAccountClick }: AccountSwitcherProps) {
  const { currentUser, otherUsers, setLogin, removeLogin } = useLoggedInAccounts();

  if (!currentUser) return null;

  const getDisplayName = (account: Account): string => {
    return account.metadata.name ?? genUserName(account.pubkey);
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className='flex items-center gap-1.5 sm:gap-2 lg:gap-3 p-1.5 sm:p-2 lg:p-2.5 rounded border border-gray-700 hover:border-green-400 transition-all w-full bg-black text-white font-retro'>
          <Avatar className='w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 border border-gray-700'>
            <AvatarImage src={currentUser.metadata.picture} alt={getDisplayName(currentUser)} />
            <AvatarFallback className="bg-gray-900 text-green-400 text-xs">{getDisplayName(currentUser).charAt(0)}</AvatarFallback>
          </Avatar>
          <div className='flex-1 text-left hidden md:block truncate min-w-0'>
            <p className='text-[0.65rem] lg:text-xs truncate text-green-400'>{getDisplayName(currentUser)}</p>
          </div>
          <ChevronDown className='w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0' />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56 p-2 bg-black border-gray-700 text-white font-retro'>
        <div className='text-[0.65rem] px-2 py-1.5 text-green-400 uppercase'>Switch Relay</div>
        <RelaySelector className="w-full" />
        <DropdownMenuSeparator className="bg-gray-700" />
        <div className='text-[0.65rem] px-2 py-1.5 text-green-400 uppercase'>Switch Account</div>
        {otherUsers.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onClick={() => setLogin(user.id)}
            className='flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-900 focus:bg-gray-900 border border-transparent hover:border-gray-700'
          >
            <Avatar className='w-8 h-8 border border-gray-700'>
              <AvatarImage src={user.metadata.picture} alt={getDisplayName(user)} />
              <AvatarFallback className="bg-gray-900 text-green-400 text-xs">{getDisplayName(user)?.charAt(0) || <UserIcon className="w-4 h-4" />}</AvatarFallback>
            </Avatar>
            <div className='flex-1 truncate'>
              <p className='text-xs text-white'>{getDisplayName(user)}</p>
            </div>
            {user.id === currentUser.id && <div className='w-2 h-2 rounded-full bg-green-400'></div>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-gray-700" />
        <WalletModal>
          <DropdownMenuItem
            className='flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-900 focus:bg-gray-900 border border-transparent hover:border-gray-700 text-xs'
            onSelect={(e) => e.preventDefault()}
          >
            <Wallet className='w-4 h-4 text-yellow-400' />
            <span>Wallet Settings</span>
          </DropdownMenuItem>
        </WalletModal>
        <DropdownMenuItem
          onClick={onAddAccountClick}
          className='flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-900 focus:bg-gray-900 border border-transparent hover:border-gray-700 text-xs'
        >
          <UserPlus className='w-4 h-4 text-blue-400' />
          <span>Add another account</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => removeLogin(currentUser.id)}
          className='flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-900 focus:bg-gray-900 border border-transparent hover:border-red-700 text-xs text-red-400'
        >
          <LogOut className='w-4 h-4' />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}