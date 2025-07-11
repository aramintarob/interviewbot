import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">InterviewBot</h1>
          <p className="text-lg text-muted-foreground mb-8">AI-Powered Expert Interview Platform</p>
          
          <div className="flex flex-col gap-4">
            <Link to="/interview">
              <Button 
                className="w-full text-lg"
                size="lg"
              >
                Start Interview
              </Button>
            </Link>

            <Link to="/interview?mode=test">
              <Button 
                variant="outline"
                className="w-full text-lg"
                size="lg"
              >
                Practice Mode
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Practice Mode lets you test the interview experience with sample questions
          </p>
        </div>
      </div>
    </div>
  );
} 