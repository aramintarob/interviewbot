import { Question, NewQuestion, QuestionSequence, NewQuestionSequence, BranchingCondition } from '@/types/questions';
import { supabase } from '@/lib/supabase';

class QuestionService {
  async getAllQuestions(): Promise<Question[]> {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching questions:', error);
      throw new Error('Failed to fetch questions');
    }

    return data || [];
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    const { data, error } = await supabase
      .from('questions')
      .select('*, followUpQuestions:questions(*), branchingConditions(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching question:', error);
      throw new Error('Failed to fetch question');
    }

    return data;
  }

  async addQuestion(question: NewQuestion): Promise<Question> {
    const { data, error } = await supabase
      .from('questions')
      .insert([question])
      .select()
      .single();

    if (error) {
      console.error('Error adding question:', error);
      throw new Error('Failed to add question');
    }

    return data;
  }

  async updateQuestion(id: string, question: Partial<Question>): Promise<Question> {
    const { data, error } = await supabase
      .from('questions')
      .update(question)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating question:', error);
      throw new Error('Failed to update question');
    }

    return data;
  }

  async deleteQuestion(id: string): Promise<void> {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting question:', error);
      throw new Error('Failed to delete question');
    }
  }

  async createSequence(sequence: NewQuestionSequence): Promise<QuestionSequence> {
    const { data, error } = await supabase
      .from('question_sequences')
      .insert([sequence])
      .select()
      .single();

    if (error) {
      console.error('Error creating sequence:', error);
      throw new Error('Failed to create sequence');
    }

    return data;
  }

  async getNextQuestion(currentQuestionId: string, response: string): Promise<Question | undefined> {
    // Get current question with branching conditions
    const currentQuestion = await this.getQuestion(currentQuestionId);
    if (!currentQuestion?.branchingConditions?.length) {
      return undefined;
    }

    // Check each branching condition
    for (const condition of currentQuestion.branchingConditions) {
      switch (condition.type) {
        case 'keyword':
          if (typeof condition.value === 'string' && response.toLowerCase().includes(condition.value.toLowerCase())) {
            return this.getQuestion(condition.nextQuestionId);
          }
          break;

        case 'sentiment':
          // TODO: Implement sentiment analysis
          // For now, use a simple positive/negative check
          const isPositive = response.toLowerCase().includes('yes') || 
                           response.toLowerCase().includes('good') ||
                           response.toLowerCase().includes('great');
          if ((condition.value === 'positive' && isPositive) ||
              (condition.value === 'negative' && !isPositive)) {
            return this.getQuestion(condition.nextQuestionId);
          }
          break;

        case 'duration':
          const duration = parseInt(condition.value as string);
          if (!isNaN(duration) && response.length > duration) {
            return this.getQuestion(condition.nextQuestionId);
          }
          break;
      }
    }

    // If no conditions match, return undefined to proceed with default sequence
    return undefined;
  }

  async getSequence(id: string): Promise<QuestionSequence | undefined> {
    const { data, error } = await supabase
      .from('question_sequences')
      .select('*, questions(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching sequence:', error);
      throw new Error('Failed to fetch sequence');
    }

    return data;
  }
}

export const questionService = new QuestionService(); 