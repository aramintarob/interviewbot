import { Question } from '@/types/questions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  const { text, type, difficulty, category, expectedDuration, tags } = question;

  return (
    <Card 
      className={`${className} ${isActive ? 'border-primary' : ''} cursor-pointer hover:border-primary/50 transition-colors`}
      onClick={onSelect}
    >
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <CardTitle className="text-lg font-semibold">{text}</CardTitle>
          <Badge variant={difficulty === 'hard' ? 'destructive' : difficulty === 'medium' ? 'default' : 'secondary'}>
            {difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">{type}</span>
            <span>•</span>
            <span>{category}</span>
            <span>•</span>
            <span>{Math.round(expectedDuration / 60)} min</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 