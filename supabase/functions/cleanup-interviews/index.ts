import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface CleanupRecord {
  id: string;
  prefix: string;
  cleanup_date: string;
}

serve(async (req: Request) => {
  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get records due for cleanup
    const { data: cleanupRecords, error: fetchError } = await supabaseClient
      .from('interview_cleanups')
      .select('*')
      .lte('cleanup_date', new Date().toISOString()) as { data: CleanupRecord[], error: Error | null };

    if (fetchError) {
      throw new Error(`Failed to fetch cleanup records: ${fetchError.message}`);
    }

    if (!cleanupRecords?.length) {
      return new Response(JSON.stringify({ message: 'No files to clean up' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Process each cleanup record
    const results = await Promise.all(
      cleanupRecords.map(async (record) => {
        try {
          // List files in the prefix
          const { data: files, error: listError } = await supabaseClient.storage
            .from('interview-assets')
            .list(record.prefix);

          if (listError) {
            throw new Error(`Failed to list files for ${record.prefix}: ${listError.message}`);
          }

          if (!files?.length) {
            // No files found, just delete the cleanup record
            await supabaseClient
              .from('interview_cleanups')
              .delete()
              .eq('id', record.id);
            return `No files found for ${record.prefix}`;
          }

          // Delete all files in the prefix
          const { error: deleteError } = await supabaseClient.storage
            .from('interview-assets')
            .remove(files.map(file => `${record.prefix}/${file.name}`));

          if (deleteError) {
            throw new Error(`Failed to delete files for ${record.prefix}: ${deleteError.message}`);
          }

          // Delete the cleanup record
          await supabaseClient
            .from('interview_cleanups')
            .delete()
            .eq('id', record.id);

          return `Successfully cleaned up ${files.length} files for ${record.prefix}`;
        } catch (error) {
          return `Error processing ${record.prefix}: ${error.message}`;
        }
      })
    );

    return new Response(
      JSON.stringify({
        message: 'Cleanup completed',
        results,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: `Failed to process cleanup: ${error.message}`,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 