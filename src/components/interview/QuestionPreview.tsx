import { Question } from '@/types/questions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuestionPreviewProps {
  question: Question;
  isActive?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function QuestionPreview({
  question,
  isActive = false,
  onSelect,
  className = '',
}: QuestionPreviewProps) {
  return (
    <Card 
      className={`${className} ${isActive ? 'border-primary' : ''} cursor-pointer hover:border-primary/50 transition-colors`}
      onClick={onSelect}
    >
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{question.text}</CardTitle>
      </CardHeader>
    </Card>
  );
} 