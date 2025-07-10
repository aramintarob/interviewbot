import { createClient } from '@supabase/supabase-js';
import { Question, QuestionSequence } from '@/types/questions';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

class QuestionService {
  private logError(method: string, error: any) {
    console.error(`QuestionService.${method} error:`, {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      response: {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
      },
    });
  }

  async getAllQuestions(): Promise<Question[]> {
    try {
      console.log('Fetching all questions...');
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        this.logError('getAllQuestions', error);
        throw new Error(`Failed to fetch questions: ${error.message}`);
      }

      console.log('Successfully fetched questions:', data?.length);
      return data || [];
    } catch (error) {
      this.logError('getAllQuestions', error);
      throw new Error('Failed to fetch questions');
    }
  }

  async getQuestionById(id: string): Promise<Question | null> {
    try {
      console.log('Fetching question by ID:', id);
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        this.logError('getQuestionById', error);
        throw new Error(`Failed to fetch question: ${error.message}`);
      }

      console.log('Successfully fetched question:', data?.id);
      return data;
    } catch (error) {
      this.logError('getQuestionById', error);
      throw new Error('Failed to fetch question');
    }
  }

  async addQuestion(question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>): Promise<Question> {
    try {
      console.log('Adding new question:', question);
      const { data, error } = await supabase
        .from('questions')
        .insert([{
          ...question,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        this.logError('addQuestion', error);
        throw new Error(`Failed to add question: ${error.message}`);
      }

      console.log('Successfully added question:', data?.id);
      return data;
    } catch (error) {
      this.logError('addQuestion', error);
      throw new Error('Failed to add question');
    }
  }

  async updateQuestion(id: string, updates: Partial<Question>): Promise<Question> {
    try {
      console.log('Updating question:', { id, updates });
      const { data, error } = await supabase
        .from('questions')
        .update({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        this.logError('updateQuestion', error);
        throw new Error(`Failed to update question: ${error.message}`);
      }

      console.log('Successfully updated question:', data?.id);
      return data;
    } catch (error) {
      this.logError('updateQuestion', error);
      throw new Error('Failed to update question');
    }
  }

  async deleteQuestion(id: string): Promise<void> {
    try {
      console.log('Deleting question:', id);
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) {
        this.logError('deleteQuestion', error);
        throw new Error(`Failed to delete question: ${error.message}`);
      }

      console.log('Successfully deleted question:', id);
    } catch (error) {
      this.logError('deleteQuestion', error);
      throw new Error('Failed to delete question');
    }
  }

  async getAllSequences(): Promise<QuestionSequence[]> {
    try {
      console.log('Fetching all sequences...');
      const { data, error } = await supabase
        .from('question_sequences')
        .select(`
          *,
          questions:question_sequence_items(
            question:questions(*)
          )
        `)
        .order('createdAt', { ascending: false });

      if (error) {
        this.logError('getAllSequences', error);
        throw new Error(`Failed to fetch sequences: ${error.message}`);
      }

      console.log('Successfully fetched sequences:', data?.length);
      return (data || []).map((sequence: any) => ({
        ...sequence,
        questions: sequence.questions.map((item: any) => item.question),
        totalDuration: sequence.questions.reduce((total: number, item: any) => 
          total + item.question.expectedDuration, 0),
        categories: Array.from(new Set(sequence.questions.map((item: any) => 
          item.question.category))),
        tags: Array.from(new Set(sequence.questions.flatMap((item: any) => 
          item.question.tags))),
      }));
    } catch (error) {
      this.logError('getAllSequences', error);
      throw new Error('Failed to fetch sequences');
    }
  }

  async createSequence(sequence: Omit<QuestionSequence, 'id' | 'createdAt' | 'updatedAt'>): Promise<QuestionSequence> {
    try {
      console.log('Creating new sequence:', sequence);
      const { data: sequenceData, error: sequenceError } = await supabase
        .from('question_sequences')
        .insert([{
          name: sequence.name,
          description: sequence.description,
          difficulty: sequence.difficulty,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }])
        .select()
        .single();

      if (sequenceError) {
        this.logError('createSequence', sequenceError);
        throw new Error(`Failed to create sequence: ${sequenceError.message}`);
      }

      console.log('Successfully created sequence:', sequenceData?.id);

      // Add questions to the sequence
      const questionItems = sequence.questions.map((question, index) => ({
        sequence_id: sequenceData.id,
        question_id: question.id,
        order: index,
      }));

      console.log('Adding questions to sequence:', questionItems);
      const { error: itemsError } = await supabase
        .from('question_sequence_items')
        .insert(questionItems);

      if (itemsError) {
        this.logError('createSequence', itemsError);
        // Cleanup the sequence if adding questions failed
        await supabase
          .from('question_sequences')
          .delete()
          .eq('id', sequenceData.id);
        throw new Error(`Failed to add questions to sequence: ${itemsError.message}`);
      }

      console.log('Successfully added questions to sequence');

      // Return the complete sequence
      return {
        ...sequenceData,
        questions: sequence.questions,
        totalDuration: sequence.questions.reduce((total, q) => total + q.expectedDuration, 0),
        categories: Array.from(new Set(sequence.questions.map(q => q.category))),
        tags: Array.from(new Set(sequence.questions.flatMap(q => q.tags))),
      };
    } catch (error) {
      this.logError('createSequence', error);
      throw new Error('Failed to create sequence');
    }
  }
}

export const questionService = new QuestionService(); 