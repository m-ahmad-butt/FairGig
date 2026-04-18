import { useLocation, Link } from 'react-router-dom';

export default function PendingApprovalPage() {
  const location = useLocation();
  const email = location.state?.email;
  const role = location.state?.role;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Approval Pending
          </h2>
          
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gray-600">
              Your email <strong>{email}</strong> has been verified successfully!
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-800">
                As a <strong>{role}</strong>, your account requires admin approval before you can log in.
              </p>
            </div>
            
            <p className="text-sm text-gray-600">
              You will receive an email notification once your account has been approved by the administrator.
            </p>
            
            <p className="text-sm text-gray-500">
              Admin email: <strong>l233059@lhr.nu.edu.pk</strong>
            </p>
          </div>

          <div className="mt-8">
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
