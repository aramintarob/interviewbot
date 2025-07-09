import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">InterviewBot</h1>
          <p className="text-lg text-gray-600 mb-8">AI-Powered Expert Interview Platform</p>
          
          <Link
            to="/interview/demo"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Start Demo Interview
          </Link>
        </div>
      </div>
    </div>
  );
} 