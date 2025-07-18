import { useState, useEffect } from 'react';
import { Question, QuestionSequence as IQuestionSequence } from '@/types/questions';
import { questionService } from '@/services/questionService';
import { QuestionPreview } from './QuestionPreview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      if (!sequence.questions?.length) {
        setQuestions([]);
        return;
      }
      
      // Since questions array now contains the full Question objects, not just IDs
      setQuestions(sequence.questions);
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
        <CardTitle className="text-xl">{sequence.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {questions.map((question) => (
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