import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SingleSessionEntry from './SingleSessionEntry';
import BulkCSVImport from './BulkCSVImport';
import authService from '../../services/api/authService';
import Navbar from '../../components/Navigation/Navbar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

export default function EarningsLogPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState('single');
  const [completedSessionId, setCompletedSessionId] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializePage = async () => {
    try {
      const profile = await authService.getMe();

      if (profile?.role !== 'worker') {
        toast.error('Earnings page is available for workers only');
        navigate('/dashboard');
        return;
      }

      setUser(profile);
    } catch (error) {
      toast.error(error.message || 'Please login again');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = (sessionId) => {
    setCompletedSessionId(sessionId || 'bulk-import');
  };

  const handleReset = () => {
    setCompletedSessionId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-zinc-600">Loading earnings tools...</div>
      </div>
    );
  }

  if (completedSessionId) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Navbar user={user} />

        <main className="mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md">
            <CardHeader className="items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <Badge variant="success">Saved</Badge>
              <CardTitle className="mt-2 text-2xl">Session Logged</CardTitle>
              <CardDescription>
                Your session and earnings were recorded successfully.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleReset} className="h-11 w-full">
                Log Another Session
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar user={user} />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Log Earnings</h1>
            <p className="text-sm text-zinc-500">
              Add one work session or upload multiple sessions via CSV.
            </p>
          </div>
          <Badge variant="secondary">Worker tools</Badge>
        </div>

        <Card className="mb-6">
          <CardContent className="p-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant={method === 'single' ? 'default' : 'ghost'}
                onClick={() => setMethod('single')}
                className="h-10"
              >
                Single Session
              </Button>
              <Button
                size="sm"
                variant={method === 'bulk' ? 'default' : 'ghost'}
                onClick={() => setMethod('bulk')}
                className="h-10"
              >
                Bulk CSV Import
              </Button>
            </div>
          </CardContent>
        </Card>

        {method === 'single' && <SingleSessionEntry onComplete={handleComplete} />}
        {method === 'bulk' && <BulkCSVImport onComplete={handleComplete} />}
      </main>
    </div>
  );
}