import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllQuestions() {
  try {
    // First get all questions
    const { data: questions, error: fetchError } = await supabase
      .from('questions')
      .select('*');

    if (fetchError) throw fetchError;

    if (!questions || questions.length === 0) {
      console.log('No questions found in the database');
      return;
    }

    console.log(`Found ${questions.length} questions`);

    // Delete all questions using raw SQL
    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .gt('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) throw deleteError;

    // Verify deletion
    const { data: remainingQuestions, error: verifyError } = await supabase
      .from('questions')
      .select('*');

    if (verifyError) throw verifyError;
    console.log(`\nRemaining questions: ${remainingQuestions?.length || 0}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
deleteAllQuestions(); 