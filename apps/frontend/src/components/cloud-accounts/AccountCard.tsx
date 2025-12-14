'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type CloudProvider = 'aws' | 'azure' | 'gcp';

export interface CloudAccount {
  id: string;
  name: string;
  provider: CloudProvider;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  resourceCount?: number;
  createdAt: string;
}

export interface AccountCardProps {
  account: CloudAccount;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  onSync?: () => void;
}

const providerIcons = {
  aws: (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.76 10.63c0 .38.03.69.09.93.06.24.15.49.27.76.05.1.07.2.07.28 0 .12-.08.24-.23.37l-.77.51c-.11.07-.22.11-.32.11-.12 0-.24-.06-.36-.17a3.97 3.97 0 01-.43-.56 10.2 10.2 0 01-.37-.69c-.93 1.1-2.1 1.65-3.51 1.65-.95 0-1.71-.27-2.27-.82-.56-.55-.84-1.28-.84-2.2 0-.97.34-1.76 1.03-2.35.69-.59 1.6-.89 2.75-.89.38 0 .77.03 1.18.09.41.06.83.15 1.28.26V6.9c0-.68-.14-1.16-.43-1.44-.29-.29-.78-.43-1.48-.43-.32 0-.65.04-.99.11-.34.07-.67.17-.99.28-.15.05-.26.09-.32.11-.06.01-.11.02-.14.02-.12 0-.18-.09-.18-.27V4.8c0-.14.02-.24.07-.31.05-.06.14-.12.28-.18.32-.16.7-.3 1.15-.41A5.4 5.4 0 015.77 3.7c1.02 0 1.77.23 2.26.7.48.47.72 1.19.72 2.16v2.85l.01.22zm-4.84 1.81c.37 0 .75-.07 1.15-.2.4-.14.76-.38 1.06-.73.18-.22.32-.46.4-.74.08-.28.13-.61.13-.99v-.48c-.34-.08-.7-.15-1.07-.2-.37-.05-.74-.08-1.1-.08-.63 0-1.09.12-1.39.37-.3.25-.45.6-.45 1.07 0 .44.11.77.34 1 .23.24.56.36 1.01.36l-.08.02zm9.61 1.3c-.15 0-.25-.03-.33-.08-.08-.05-.15-.17-.21-.34l-2.37-7.8c-.06-.19-.09-.32-.09-.39 0-.15.08-.23.23-.23h.95c.16 0 .27.03.34.08.08.05.14.17.2.34l1.7 6.7 1.57-6.7c.05-.19.12-.31.19-.34.08-.05.19-.08.35-.08h.77c.16 0 .27.03.35.08.08.05.15.17.19.34l1.59 6.78 1.75-6.78c.06-.19.13-.31.21-.34.08-.05.19-.08.34-.08h.9c.15 0 .23.08.23.23 0 .06-.01.12-.03.19-.02.07-.05.16-.1.29l-2.43 7.8c-.06.19-.13.31-.21.34-.08.05-.19.08-.34.08h-.83c-.16 0-.27-.03-.35-.08-.08-.06-.15-.17-.19-.34l-1.56-6.49-1.55 6.48c-.05.19-.12.31-.19.34-.08.05-.19.08-.35.08h-.83zm15.33.32c-.62 0-1.24-.07-1.84-.22-.6-.15-1.07-.32-1.39-.52-.18-.11-.3-.23-.35-.34a.85.85 0 01-.08-.36v-.48c0-.18.07-.27.2-.27.05 0 .1.01.16.03.05.02.13.05.24.1.46.2.96.36 1.49.47.54.11 1.07.17 1.59.17.85 0 1.5-.15 1.97-.44.47-.29.71-.72.71-1.27 0-.37-.12-.69-.36-.94-.24-.25-.69-.48-1.34-.69l-1.92-.6c-.97-.31-1.69-.76-2.13-1.35-.44-.59-.66-1.24-.66-1.94 0-.56.12-1.06.36-1.49.24-.43.56-.8.97-1.11.4-.31.88-.54 1.42-.71.54-.16 1.13-.24 1.75-.24.27 0 .54.01.82.04.28.03.54.07.8.11.25.05.49.1.72.16.23.06.42.13.58.19.15.09.27.19.34.29.07.1.11.23.11.38v.44c0 .18-.07.27-.2.27-.07 0-.19-.04-.35-.11-.54-.25-1.15-.37-1.83-.37-.77 0-1.38.13-1.8.38-.43.25-.64.63-.64 1.14 0 .37.13.68.39.93.26.25.74.51 1.44.75l1.88.6c.95.3 1.65.73 2.08 1.27.43.54.64 1.16.64 1.85 0 .57-.12 1.09-.36 1.54-.24.45-.58.85-1.01 1.18-.43.33-.95.59-1.56.77-.62.18-1.29.27-2.01.27l.01-.01z" />
    </svg>
  ),
  azure: (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.05 10.43L9.09 18.8H4.3l8.75-15.37L9.09 5.57 13.05 10.43zM19.7 18.8h-5.43l-3.96-8.37 1.74-3.06 3.96 6.88 3.69-6.88 3.96 6.88-3.96 6.88z" />
    </svg>
  ),
  gcp: (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.19 2.38a9.344 9.344 0 00-9.234 6.893c.053-.02.108-.029.166-.029.195 0 .395.08.535.227.12.133.175.297.193.459.019.167.009.338.009.508v3.145h.006v.001a.75.75 0 00.75.75h3.293a.75.75 0 00.75-.75v-.001-3.27a.75.75 0 00-.75-.75H5.334v-.002c0-.084-.005-.168-.012-.251a5.684 5.684 0 015.808-5.187 5.688 5.688 0 015.675 5.027h.001v.002h-.001a.717.717 0 00-.012.251v.002h-.001c0 .414.336.75.75.75h3.293a.75.75 0 00.75-.75v-.002-3.27c0-.17-.01-.341.009-.508.018-.162.073-.326.193-.459.14-.146.34-.227.535-.227.058 0 .113.009.166.029A9.344 9.344 0 0012.19 2.38zm-.002 19.24a9.352 9.352 0 008.148-4.787.455.455 0 00-.085-.518.738.738 0 00-.286-.174.717.717 0 00-.679.091l-2.485 1.661a.75.75 0 00-.258.983l.001.002 1.545 2.314a.75.75 0 001.247-.832l-.904-1.355.943-.63a7.853 7.853 0 01-12.217 1.976 7.853 7.853 0 01-1.934-7.647l.002-.004a.75.75 0 00-1.442-.389l-.001.004a9.353 9.353 0 008.405 9.305z" />
    </svg>
  ),
};

const providerNames = {
  aws: 'Amazon Web Services',
  azure: 'Microsoft Azure',
  gcp: 'Google Cloud Platform',
};

const providerColors = {
  aws: 'text-amber-600',
  azure: 'text-blue-600',
  gcp: 'text-blue-500',
};

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onEdit,
  onDelete,
  onTest,
  onSync,
}) => {
  const statusColors = {
    connected: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    disconnected: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <Card className="transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={providerColors[account.provider]}
            aria-label={`Provider: ${providerNames[account.provider]}`}
          >
            {/* Cloud provider icon: screen reader label on parent div */}
            {providerIcons[account.provider]}
          </div>
          <div>
            <CardTitle className="text-lg">{account.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {providerNames[account.provider]}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="Account actions menu">
              {/* More options icon: decorative, aria-label provides context */}
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onSync && (
              <DropdownMenuItem onClick={onSync}>
                {/* Sync icon: decorative, menu item text provides context */}
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Sync now
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onTest}>
              {/* Test/check icon: decorative, menu item text provides context */}
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Test connection
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              {/* Edit pencil icon: decorative, menu item text provides context */}
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-600 focus:text-red-600"
            >
              {/* Trash/delete icon: decorative, menu item text provides context */}
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <Badge className={statusColors[account.status]}>
            {account.status}
          </Badge>
        </div>
        {account.resourceCount !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Resources</span>
            <span className="font-medium">{account.resourceCount}</span>
          </div>
        )}
        {account.lastSync && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last sync</span>
            <time dateTime={account.lastSync} className="text-xs">
              {new Date(account.lastSync).toLocaleDateString()}
            </time>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
