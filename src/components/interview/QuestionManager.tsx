import { useState, useEffect } from 'react';
import { Question, NewQuestion, BranchingCondition } from '@/types/questions';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function QuestionManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [newBranchingCondition, setNewBranchingCondition] = useState<Partial<BranchingCondition>>({
    type: 'keyword',
    value: '',
    nextQuestionId: '',
  });

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

  async function handleAddBranchingCondition(questionId: string) {
    if (!selectedQuestion || !newBranchingCondition.type || !newBranchingCondition.value || !newBranchingCondition.nextQuestionId) {
      return;
    }

    try {
      const updatedQuestion = {
        ...selectedQuestion,
        branchingConditions: [
          ...(selectedQuestion.branchingConditions || []),
          newBranchingCondition as BranchingCondition,
        ],
      };

      await questionService.updateQuestion(questionId, updatedQuestion);
      await loadQuestions();
      setNewBranchingCondition({
        type: 'keyword',
        value: '',
        nextQuestionId: '',
      });
    } catch (err) {
      console.error('Error adding branching condition:', err);
      setError('Failed to add branching condition');
    }
  }

  async function handleRemoveBranchingCondition(questionId: string, conditionIndex: number) {
    if (!selectedQuestion) return;

    try {
      const updatedQuestion = {
        ...selectedQuestion,
        branchingConditions: selectedQuestion.branchingConditions?.filter((_, index) => index !== conditionIndex),
      };

      await questionService.updateQuestion(questionId, updatedQuestion);
      await loadQuestions();
    } catch (err) {
      console.error('Error removing branching condition:', err);
      setError('Failed to remove branching condition');
    }
  }

  function renderBranchingConditions(question: Question) {
    if (!question.branchingConditions?.length) {
      return (
        <div className="text-sm text-muted-foreground">
          No branching conditions set
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {question.branchingConditions.map((condition, index) => (
          <div key={index} className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
            <div className="flex items-center gap-2">
              <Badge>{condition.type}</Badge>
              <span className="text-sm">{condition.value}</span>
              <span className="text-sm text-muted-foreground">→</span>
              <span className="text-sm">{questions.find(q => q.id === condition.nextQuestionId)?.text.substring(0, 30)}...</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveBranchingCondition(question.id, index)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        <p>{error}</p>
        <Button onClick={loadQuestions} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Interview Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="questions">
            <TabsList>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="branching">Branching Logic</TabsTrigger>
            </TabsList>
            
            <TabsContent value="questions">
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No questions available.</p>
                    <p className="text-sm">Questions created during interview sessions will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {questions.map((question, index) => (
                      <div key={question.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground">
                                {index + 1}.
                              </span>
                              <p className="font-medium">{question.text}</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant={
                                question.difficulty === 'hard' ? 'destructive' :
                                question.difficulty === 'medium' ? 'default' :
                                'secondary'
                              }>
                                {question.difficulty}
                              </Badge>
                              <span>•</span>
                              <span>{question.type}</span>
                              <span>•</span>
                              <span>{question.category}</span>
                              <span>•</span>
                              <span>{Math.round(question.expected_duration / 60)} min</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {question.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="branching">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>Select Question</Label>
                  <Select
                    value={selectedQuestion?.id}
                    onValueChange={(value) => setSelectedQuestion(questions.find(q => q.id === value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a question" />
                    </SelectTrigger>
                    <SelectContent>
                      {questions.map(question => (
                        <SelectItem key={question.id} value={question.id}>
                          {question.text.substring(0, 50)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedQuestion && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Current Branching Conditions</h3>
                      {renderBranchingConditions(selectedQuestion)}
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-medium">Add New Condition</h3>
                      <div className="grid gap-4">
                        <div>
                          <Label>Condition Type</Label>
                          <Select
                            value={newBranchingCondition.type}
                            onValueChange={(value) => setNewBranchingCondition(prev => ({ ...prev, type: value as BranchingCondition['type'] }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="keyword">Keyword</SelectItem>
                              <SelectItem value="sentiment">Sentiment</SelectItem>
                              <SelectItem value="duration">Duration</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Value</Label>
                          <Input
                            value={newBranchingCondition.value}
                            onChange={(e) => setNewBranchingCondition(prev => ({ ...prev, value: e.target.value }))}
                            placeholder={newBranchingCondition.type === 'duration' ? 'Duration in seconds' : 'Value'}
                          />
                        </div>

                        <div>
                          <Label>Next Question</Label>
                          <Select
                            value={newBranchingCondition.nextQuestionId}
                            onValueChange={(value) => setNewBranchingCondition(prev => ({ ...prev, nextQuestionId: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select next question" />
                            </SelectTrigger>
                            <SelectContent>
                              {questions
                                .filter(q => q.id !== selectedQuestion.id)
                                .map(question => (
                                  <SelectItem key={question.id} value={question.id}>
                                    {question.text.substring(0, 50)}...
                                  </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          onClick={() => handleAddBranchingCondition(selectedQuestion.id)}
                          disabled={!newBranchingCondition.type || !newBranchingCondition.value || !newBranchingCondition.nextQuestionId}
                        >
                          Add Branching Condition
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 