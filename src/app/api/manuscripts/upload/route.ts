import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MAX_MANUSCRIPT_SIZE = 50 * 1024 * 1024; // 50MB for manuscripts
const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5MB for covers

const MANUSCRIPT_FILE_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx only
];

const COVER_FILE_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp'
];

const MANUSCRIPT_EXTENSIONS = ['.docx'];
const COVER_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// File signatures for manuscript files
const MANUSCRIPT_SIGNATURES = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['504b0304'], // ZIP-based (DOCX)
  'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffdb'],
  'image/png': ['89504e47'],
  'image/gif': ['47494638'],
  'image/webp': ['52494646']
};

function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return allowedExtensions.includes(extension);
}

function validateFileSignature(buffer: ArrayBuffer, mimeType: string): boolean {
  const uint8Array = new Uint8Array(buffer.slice(0, 8));
  const hex = Array.from(uint8Array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const signatures = MANUSCRIPT_SIGNATURES[mimeType as keyof typeof MANUSCRIPT_SIGNATURES];
  if (!signatures) return false;
  
  return signatures.some(signature => hex.startsWith(signature));
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an author
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'author') {
      return NextResponse.json({ error: 'Only authors can upload manuscripts' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('type') as string; // 'manuscript' or 'cover'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!fileType || !['manuscript', 'cover'].includes(fileType)) {
      return NextResponse.json({ error: 'Invalid file type parameter' }, { status: 400 });
    }

    // Set validation rules based on file type
    const isManuscript = fileType === 'manuscript';
    const maxSize = isManuscript ? MAX_MANUSCRIPT_SIZE : MAX_COVER_SIZE;
    const allowedTypes = isManuscript ? MANUSCRIPT_FILE_TYPES : COVER_FILE_TYPES;
    const allowedExtensions = isManuscript ? MANUSCRIPT_EXTENSIONS : COVER_EXTENSIONS;

    // Validate file size
    if (file.size > maxSize) {
      const sizeMB = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json(
        { error: `File too large. Maximum size is ${sizeMB}MB.` },
        { status: 400 }
      );
    }

    // Validate file extension
    if (!validateFileExtension(file.name, allowedExtensions)) {
      const extensions = allowedExtensions.join(', ');
      return NextResponse.json(
        { error: `Invalid file type. Allowed extensions: ${extensions}` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid MIME type. File type does not match the file content.' },
        { status: 400 }
      );
    }

    // Convert file to buffer for signature validation
    const buffer = await file.arrayBuffer();

    // Validate file signature (magic numbers)
    if (!validateFileSignature(buffer, file.type)) {
      return NextResponse.json(
        { error: 'Invalid file format. File content does not match the expected format.' },
        { status: 400 }
      );
    }

    // Generate secure filename
    const sanitizedOriginalName = sanitizeFilename(file.name);
    const fileExtension = sanitizedOriginalName.substring(sanitizedOriginalName.lastIndexOf('.'));
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileName = `${user.id}_${timestamp}_${randomString}${fileExtension}`;
    const filePath = `${user.id}/manuscripts/${fileType}s/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        metadata: {
          uploadedBy: user.id,
          originalName: file.name,
          fileSize: file.size.toString(),
          fileType: fileType,
          uploadedAt: new Date().toISOString()
        }
      });

    if (uploadError) {
      console.error('Storage error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return NextResponse.json({
      data: {
        url: urlData.publicUrl,
        path: filePath,
        filename: fileName,
        originalName: file.name,
        size: file.size,
        type: file.type,
        fileType: fileType
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }

    // Verify the file belongs to the user (security check)
    if (!filePath.includes(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from('documents')
      .remove([filePath]);

    if (deleteError) {
      console.error('Storage delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}