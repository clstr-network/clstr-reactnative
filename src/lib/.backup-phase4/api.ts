
import { supabase } from "@/integrations/supabase/client";
import { handleApiError } from "@/lib/errorHandler";

// Note: The following notes-related functions will work with the database
// but TypeScript doesn't recognize them yet because the types file hasn't been updated
// These functions can be used once the types are regenerated

/**
 * Fetches the user's notes
 * @returns Array of user notes
 */
export const fetchNotes = async () => {
  try {
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw handleApiError(error, {
      operation: 'fetchNotes',
      userMessage: 'Failed to load notes. Please try again.',
    });
  }
};

/**
 * Creates a new note
 * @param title Note title
 * @param content Note content
 * @returns The created note
 */
export const createNote = async (title: string, content: string) => {
  try {
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('notes')
      .insert({
        title,
        content,
        user_id: session.user.id
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'createNote',
      userMessage: 'Failed to create note. Please try again.',
    });
  }
};

/**
 * Updates an existing note
 * @param id Note ID
 * @param updates Object containing title and/or content updates
 * @returns The updated note
 */
export const updateNote = async (id: string, updates: { title?: string; content?: string }) => {
  try {
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', session.user.id) // Ensure the user can only update their own notes
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'updateNote',
      userMessage: 'Failed to update note. Please try again.',
    });
  }
};

/**
 * Deletes a note
 * @param id Note ID
 * @returns Success status
 */
export const deleteNote = async (id: string) => {
  try {
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id); // Ensure the user can only delete their own notes

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'deleteNote',
      userMessage: 'Failed to delete note. Please try again.',
    });
  }
};
