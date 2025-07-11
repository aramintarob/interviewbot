import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">Interview session not found</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-primary hover:text-primary/90 hover:underline"
        >
          Return home
        </Link>
      </div>
    </div>
  );
} 