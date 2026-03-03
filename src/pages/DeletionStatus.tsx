import { useSearchParams } from 'react-router-dom';

const DeletionStatus = () => {
  const [searchParams] = useSearchParams();
  const confirmationId = searchParams.get('id');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-card rounded-lg border border-border p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Data Deletion Request</h1>
        
        {confirmationId ? (
          <>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-sm text-foreground">Your data deletion request has been processed.</p>
              <p className="text-xs text-muted-foreground mt-2">
                Confirmation code: <span className="font-mono font-bold">{confirmationId}</span>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              All data associated with your account has been deactivated from our systems. 
              This includes your Instagram connection details and any stored access tokens.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No deletion request ID provided. If you believe this is an error, 
            please contact us at <a href="mailto:support@cimmi.co" className="text-primary hover:underline">support@cimmi.co</a>.
          </p>
        )}

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Cimmi LLC. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeletionStatus;
