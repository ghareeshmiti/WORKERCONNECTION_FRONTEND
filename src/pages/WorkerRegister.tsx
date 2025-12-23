import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function WorkerRegister() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <h1 className="text-2xl font-display font-bold mb-6">Worker Registration</h1>
        <p className="text-muted-foreground">Multi-step registration form coming soon.</p>
        <Link to="/auth" className="mt-4 inline-block">
          <Button>Go to Login</Button>
        </Link>
      </div>
    </div>
  );
}
