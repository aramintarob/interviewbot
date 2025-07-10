import { useState, useEffect } from 'react';
import { Question } from '@/types/questions';
import { questionService } from '@/services/questionService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface QuestionFormData {
  text: string;
  type: Question['type'];
  difficulty: Question['difficulty'];
  category: string;
  expectedDuration: number;
  tags: string[];
}

const initialFormData: QuestionFormData = {
  text: '',
  type: 'open_ended',
  difficulty: 'medium',
  category: '',
  expectedDuration: 180,
  tags: [],
};

export function QuestionManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [formData, setFormData] = useState<QuestionFormData>(initialFormData);
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    try {
      setIsLoading(true);
      const loadedQuestions = await questionService.getAllQuestions();
      setQuestions(loadedQuestions);
    } catch (err) {
      console.error('Error loading questions:', err);
      setError('Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(undefined);

      const newQuestion = await questionService.addQuestion(formData);
      setQuestions(prev => [...prev, newQuestion]);
      setFormData(initialFormData);
      setTagInput('');
    } catch (err) {
      console.error('Error adding question:', err);
      setError('Failed to add question');
    } finally {
      setIsLoading(false);
    }
  }

  function handleAddTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, tagInput.trim()],
        }));
      }
      setTagInput('');
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Add New Question</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text">Question Text</Label>
              <Input
                id="text"
                value={formData.text}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Enter your question"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Question Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={value => setFormData(prev => ({ ...prev, type: value as Question['type'] }))}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open_ended">Open Ended</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={value => setFormData(prev => ({ ...prev, difficulty: value as Question['difficulty'] }))}
                >
                  <SelectTrigger id="difficulty">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., React, TypeScript, System Design"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDuration">Expected Duration (seconds)</Label>
              <Input
                id="expectedDuration"
                type="number"
                min="30"
                max="600"
                value={formData.expectedDuration}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData(prev => ({ ...prev, expectedDuration: parseInt(e.target.value) }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tagInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type tag and press Enter"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Question'}
            </Button>

            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {questions.map(question => (
              <div
                key={question.id}
                className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex justify-between items-start gap-4">
                  <p className="font-medium">{question.text}</p>
                  <Badge variant={
                    question.difficulty === 'hard' ? 'destructive' :
                    question.difficulty === 'medium' ? 'default' :
                    'secondary'
                  }>
                    {question.difficulty}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{question.type}</span>
                  <span>•</span>
                  <span>{question.category}</span>
                  <span>•</span>
                  <span>{Math.round(question.expectedDuration / 60)} min</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {question.tags.map(tag => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 