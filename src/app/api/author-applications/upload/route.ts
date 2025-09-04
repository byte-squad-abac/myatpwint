import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'application/pdf',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.webp'];
const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.com', '.scr', '.js', '.vbs', '.ps1', '.sh'];

// File magic number validation
const FILE_SIGNATURES = {
  'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffdb'],
  'image/png': ['89504e47'],
  'image/gif': ['47494638'],
  'application/pdf': ['25504446'],
  'image/webp': ['52494646'] // First 4 bytes, WEBP has additional signature after
};

function validateFileExtension(filename: string): boolean {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  
  // Check for dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    return false;
  }
  
  // Check for allowed extensions
  return ALLOWED_EXTENSIONS.includes(extension);
}

function validateFileSignature(buffer: ArrayBuffer, mimeType: string): boolean {
  const uint8Array = new Uint8Array(buffer.slice(0, 8)); // First 8 bytes
  const hex = Array.from(uint8Array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const signatures = FILE_SIGNATURES[mimeType as keyof typeof FILE_SIGNATURES];
  if (!signatures) return false;
  
  return signatures.some(signature => hex.startsWith(signature));
}

function sanitizeFilename(filename: string): string {
  // Remove or replace dangerous characters
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Enhanced file validation
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Validate file extension
    if (!validateFileExtension(file.name)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images (JPG, PNG, GIF, WEBP) and PDF files are allowed.' },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
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
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${fileExtension}`;
    const filePath = `${user.id}/author-applications/association-proofs/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents') // Make sure this bucket exists
      .upload(filePath, buffer, {
        contentType: file.type,
        metadata: {
          uploadedBy: user.id,
          originalName: file.name,
          fileSize: file.size.toString()
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
        type: file.type
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