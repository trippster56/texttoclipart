import { supabase } from './supabaseClient';
import { GeneratedImage, ImagePrivacy } from '../types/database.types';

export async function saveGeneratedImage(
  userId: string,
  prompt: string,
  imageUrl: string,
  privacy: ImagePrivacy = 'private',
  metadata: Partial<GeneratedImage> = {}
): Promise<GeneratedImage> {
  const { data, error } = await supabase
    .from('generated_images')
    .insert([
      {
        user_id: userId,
        prompt,
        image_url: imageUrl,
        privacy,
        ...metadata,
        created_at: new Date().toISOString(),
      },
    ])
    .select('*')
    .single();

  if (error) {
    console.error('Error saving image:', error);
    throw new Error('Failed to save image to database');
  }

  return data as GeneratedImage;
}

export async function getUserImages(userId: string, limit = 20, offset = 0): Promise<GeneratedImage[]> {
  const { data, error } = await supabase
    .from('generated_images')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching user images:', error);
    return [];
  }

  return data as GeneratedImage[];
}

export async function getPublicImages(limit = 20, offset = 0): Promise<Array<{
  id: string;
  prompt: string;
  image_url: string;
  created_at: string;
  user: {
    id: string;
    email: string;
    user_metadata: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}>> {
  const { data, error } = await supabase
    .from('generated_images')
    .select(`
      id,
      prompt,
      image_url,
      created_at,
      user:user_id (id, email, user_metadata)
    `)
    .eq('privacy', 'public')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching public images:', error);
    return [];
  }

  // Map the data to include the user object
  return (data || []).map(item => ({
    ...item,
    user: item.user as any, // Type assertion since we know the shape
  }));
}

export async function updateImagePrivacy(
  imageId: string,
  userId: string,
  privacy: ImagePrivacy
): Promise<boolean> {
  const { error } = await supabase
    .from('generated_images')
    .update({ privacy })
    .eq('id', imageId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating image privacy:', error);
    return false;
  }

  return true;
}
