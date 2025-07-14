import { supabase } from '@/lib/supabase';
import { Question, NewQuestion } from '@/types/questions';

class QuestionService {
  async getAllQuestions(): Promise<Question[]> {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching questions:', error);
      throw error;
    }

    return data || [];
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching question:', error);
      return undefined;
    }

    return data;
  }

  async addQuestion(question: NewQuestion): Promise<Question> {
    const { data, error } = await supabase
      .from('questions')
      .insert([{
        ...question,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding question:', error);
      throw error;
    }

    return data;
  }

  async updateQuestion(id: string, updates: Partial<Question>): Promise<Question | undefined> {
    const { data, error } = await supabase
      .from('questions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating question:', error);
      return undefined;
    }

    return data;
  }

  async deleteQuestion(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting question:', error);
      return false;
    }

    return true;
  }
}

export const questionService = new QuestionService(); 