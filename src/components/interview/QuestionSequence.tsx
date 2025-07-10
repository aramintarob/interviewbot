import { useState, useEffect } from 'react';
import { Question, QuestionSequence as IQuestionSequence } from '@/types/questions';
import { questionService } from '@/services/questionService';
import { QuestionPreview } from './QuestionPreview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface QuestionSequenceProps {
  sequence: IQuestionSequence;
  onQuestionSelect?: (question: Question) => void;
  className?: string;
}

export function QuestionSequence({
  sequence,
  onQuestionSelect,
  className = '',
}: QuestionSequenceProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuestions();
  }, [sequence]);

  async function loadQuestions() {
    try {
      setLoading(true);
      const loadedQuestions = await Promise.all(
        sequence.questions.map(id => questionService.getQuestion(id))
      );
      setQuestions(loadedQuestions.filter((q): q is Question => q !== undefined));
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleQuestionSelect(question: Question) {
    setSelectedQuestionId(question.id);
    onQuestionSelect?.(question);
  }

  if (loading) {
    return <div>Loading questions...</div>;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="text-xl">{sequence.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {sequence.description}
            </p>
          </div>
          <Badge variant="secondary">
            {sequence.estimatedDuration} min
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline">{sequence.category}</Badge>
          <Badge variant={
            sequence.difficulty === 'advanced' ? 'destructive' : 
            sequence.difficulty === 'intermediate' ? 'default' : 
            'secondary'
          }>
            {sequence.difficulty}
          </Badge>
          {sequence.tags.map(tag => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {questions.map((question, index) => (
            <QuestionPreview
              key={question.id}
              question={question}
              isActive={question.id === selectedQuestionId}
              onSelect={() => handleQuestionSelect(question)}
              className="transition-all"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 