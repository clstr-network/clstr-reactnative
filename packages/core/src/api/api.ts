import type { SupabaseClient } from '@supabase/supabase-js';
import { createAppError } from '../errors';

/**
 * Fetches the user's notes
 */
export const fetchNotes = async (client: SupabaseClient) => {
  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await client
      .from('notes')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw createAppError(
      'Failed to load notes. Please try again.',
      'fetchNotes',
      error,
    );
  }
};

/**
 * Creates a new note
 */
export const createNote = async (client: SupabaseClient, title: string, content: string) => {
  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await client
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
    throw createAppError(
      'Failed to create note. Please try again.',
      'createNote',
      error,
    );
  }
};

/**
 * Updates an existing note
 */
export const updateNote = async (
  client: SupabaseClient,
  id: string,
  updates: { title?: string; content?: string },
) => {
  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await client
      .from('notes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw createAppError(
      'Failed to update note. Please try again.',
      'updateNote',
      error,
    );
  }
};

/**
 * Deletes a note
 */
export const deleteNote = async (client: SupabaseClient, id: string) => {
  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    const { error } = await client
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    throw createAppError(
      'Failed to delete note. Please try again.',
      'deleteNote',
      error,
    );
  }
};
