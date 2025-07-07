import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Interview session not found</p>
        <Link
          to="/"
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Return home
        </Link>
      </div>
    </div>
  );
};

export default NotFound; 