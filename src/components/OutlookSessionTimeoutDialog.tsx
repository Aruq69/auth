import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface OutlookSessionTimeoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReconnect: () => void;
}

export const OutlookSessionTimeoutDialog = ({ 
  open, 
  onOpenChange, 
  onReconnect 
}: OutlookSessionTimeoutDialogProps) => {
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await onReconnect();
      onOpenChange(false);
    } catch (error) {
      console.error('Reconnection failed:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="text-center">
          <AlertDialogTitle className="text-xl font-semibold text-orange-600 flex items-center justify-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            Outlook Session Expired
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-muted-foreground mt-2">
            Your Outlook connection has expired and needs to be renewed. This happens for security reasons to protect your email data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="bg-muted/30 p-4 rounded-lg my-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Why did this happen?</strong></p>
            <p>Outlook access tokens expire after 1 hour for security. You need to reconnect to continue syncing emails.</p>
          </div>
        </div>

        <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isReconnecting}
          >
            Cancel
          </Button>
          <AlertDialogAction
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isReconnecting ? (
              <>
                <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Reconnect Outlook
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};