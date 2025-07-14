import { useState, useEffect } from 'react';
import { Question } from '@/types/questions';
import { questionService } from '@/services/questionService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function QuestionEditor() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestions, setNewQuestions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    try {
      setIsLoading(true);
      setError(undefined);
      const loadedQuestions = await questionService.getAllQuestions();
      setQuestions(loadedQuestions);
    } catch (err) {
      console.error('Error loading questions:', err);
      setError('Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveQuestions(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuestions.trim()) return;

    try {
      setIsLoading(true);
      setError(undefined);

      // Delete all existing questions
      for (const question of questions) {
        await questionService.deleteQuestion(question.id);
      }

      // Split the text into lines and filter out empty lines
      const questionLines = newQuestions
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Add each question in order
      const newQuestionsList: Question[] = [];
      for (const text of questionLines) {
        const question = await questionService.addQuestion({ text });
        newQuestionsList.push(question);
      }

      setQuestions(newQuestionsList);
      setNewQuestions(''); // Clear the input after successful save
    } catch (err) {
      console.error('Error saving questions:', err);
      setError('Failed to save questions');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Manage Interview Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveQuestions} className="space-y-4">
            <div>
              <textarea
                value={newQuestions}
                onChange={(e) => setNewQuestions(e.target.value)}
                placeholder="Enter your questions here, one per line..."
                className="w-full min-h-[300px] p-4 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="text-red-500">
                <p>{error}</p>
                <Button onClick={loadQuestions} variant="link" className="p-0">
                  Retry
                </Button>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={!newQuestions.trim() || isLoading}
            >
              Save Questions
            </Button>
          </form>

          {questions.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="font-medium text-lg">Current Questions</h3>
              <div className="space-y-2">
                {questions.map((question, index) => (
                  <div 
                    key={question.id} 
                    className="p-4 rounded-lg border"
                  >
                    <span className="text-sm font-medium text-muted-foreground mr-3">
                      {index + 1}.
                    </span>
                    {question.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 