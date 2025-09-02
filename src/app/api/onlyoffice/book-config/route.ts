import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateJWTToken, generateDocumentKey } from '@/lib/onlyoffice-jwt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { bookId, userId } = await request.json();

    if (!bookId || !userId) {
      return NextResponse.json({ error: 'Missing required parameters: bookId and userId' }, { status: 400 });
    }

    // 1. Verify user owns the book (check purchases table)
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('id, delivery_type, status')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .eq('status', 'completed')
      .single();

    if (purchaseError || !purchase) {
      return NextResponse.json({ error: 'Book not purchased or access denied' }, { status: 403 });
    }

    // 2. Fetch book and user data
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // 3. Generate version-aware document key for book
    const documentKey = generateDocumentKey(`book-${bookId}`, book.updated_at);

    // 4. Generate signed URL for book file from storage
    const fileName = `book-${bookId}.docx`;
    let documentUrl = null;
    
    try {
      // First, try to get existing book file from storage
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('manuscripts') // Using manuscripts bucket for now, can be changed to 'books' bucket later
        .createSignedUrl(fileName, 7200); // 2 hours for reading session

      if (urlError || !signedUrlData?.signedUrl) {
        console.log(`Book file not found in storage: ${fileName}`);
        
        // Try to create book file from manuscript if book has manuscript_id
        if (book.manuscript_id) {
          console.log(`Attempting to create book file from manuscript: ${book.manuscript_id}`);
          
          const manuscriptFileName = `manuscript-${book.manuscript_id}.docx`;
          
          // Get the manuscript file
          const { data: manuscriptSignedUrl } = await supabase.storage
            .from('manuscripts')
            .createSignedUrl(manuscriptFileName, 600); // Short-lived URL for copying
          
          if (manuscriptSignedUrl?.signedUrl) {
            try {
              // Fetch the manuscript file
              const response = await fetch(manuscriptSignedUrl.signedUrl);
              if (response.ok) {
                const bookFileBuffer = await response.arrayBuffer();
                
                // Upload as book file
                const { error: uploadError } = await supabase.storage
                  .from('manuscripts')
                  .upload(fileName, bookFileBuffer, {
                    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    upsert: true
                  });
                
                if (uploadError) {
                  console.error('Failed to create book file:', uploadError);
                } else {
                  console.log(`Successfully created book file: ${fileName}`);
                  
                  // Now get signed URL for the new book file
                  const { data: newSignedUrlData } = await supabase.storage
                    .from('manuscripts')
                    .createSignedUrl(fileName, 7200);
                  
                  if (newSignedUrlData?.signedUrl) {
                    documentUrl = newSignedUrlData.signedUrl;
                  }
                }
              }
            } catch (copyError) {
              console.error('Error copying manuscript to book file:', copyError);
            }
          }
        }
        
        // If still no file, create a placeholder
        if (!documentUrl) {
          console.log('Creating text placeholder for book');
          
          try {
            const placeholderContent = `${book.name}\nby ${book.author}\n\n[Book content will be available here...]`;
            const textBuffer = new TextEncoder().encode(placeholderContent);
            
            const textFileName = `book-${bookId}.txt`;
            const { error: createError } = await supabase.storage
              .from('manuscripts')
              .upload(textFileName, textBuffer, {
                contentType: 'text/plain',
                upsert: true
              });
              
            if (!createError) {
              const { data: finalSignedUrlData } = await supabase.storage
                .from('manuscripts')
                .createSignedUrl(textFileName, 7200);
                
              if (finalSignedUrlData?.signedUrl) {
                documentUrl = finalSignedUrlData.signedUrl;
                console.log('Created text placeholder for book');
              }
            }
          } catch (createError) {
            console.error('Error creating book placeholder:', createError);
          }
        }
        
      } else {
        documentUrl = signedUrlData.signedUrl;
        console.log(`Using existing book file: ${fileName}`);
      }
    } catch (storageError) {
      console.error('Storage operation error:', storageError);
    }

    if (!documentUrl) {
      return NextResponse.json({ error: 'Unable to access book file' }, { status: 500 });
    }

    // Add cache-busting parameter
    const separator = documentUrl.includes('?') ? '&' : '?';
    documentUrl += `${separator}v=${Date.now()}`;

    // 5. Configure OnlyOffice in viewer mode
    const config = {
      document: {
        fileType: 'docx',
        key: documentKey,
        title: `${book.name} - ${book.author}`,
        url: documentUrl,
        permissions: {
          edit: false,                    // Always false for reading
          download: purchase.delivery_type === 'digital', // Allow download for digital purchases
          print: purchase.delivery_type === 'digital',    // Allow print for digital purchases
          review: false,                  // No review for books
          comment: false,                 // No commenting for books
          chat: false,                    // No chat for books
          fillForms: false,              // No form filling
          modifyFilter: false,           // No modifications
          modifyContentControl: false    // No modifications
        },
        info: {
          owner: `${book.name} by ${book.author}`,
          folder: 'My Library',
          uploaded: book.published_date
        }
      },
      documentType: 'word',
      editorConfig: {
        mode: 'view',                    // Always view mode for books
        lang: 'en',
        uiTheme: 'default-light',        // Set UI theme
        user: {
          id: userId,
          name: user.name || 'Reader'
        },
        customization: {
          about: false,
          feedback: false,
          header: false,                 // Hide document title bar  
          leftMenu: false,               // Hide left sidebar
          rightMenu: false,              // Hide right sidebar for clean experience
          statusBar: true,               // Keep page numbers at bottom
          chat: false,
          comments: false,
          plugins: false,
          hideRulers: true,              // Hide rulers
          goback: {
            url: '/library',
            text: 'Back to Library'
          },
          // Minimal toolbar configuration
          toolbar: {
            file: false,                 // Hide File tab
            home: true,                  // Keep Home tab for basic tools
            data: false,                 // Hide Data tab
            view: false,                 // Hide View tab  
            insert: false,               // Hide Insert tab
            layout: false,               // Hide Layout tab
            references: false,           // Hide References tab
            review: false,               // Hide Review/Collaboration tab
            plugins: false,              // Hide Plugins tab
            draw: false                  // Hide Draw tab
          }
        }
      }
    };

    // 6. Generate JWT token for the configuration
    const token = generateJWTToken(config);
    (config as Record<string, unknown>).token = token;

    // Optional: Log reading activity
    try {
      await supabase
        .from('purchases')
        .update({ 
          updated_at: new Date().toISOString() // Update last accessed time
        })
        .eq('id', purchase.id);
    } catch (logError) {
      // Silent fail for logging - don't block the reading experience
      console.log('Could not update last accessed time:', logError);
    }

    return NextResponse.json(config);

  } catch (error) {
    console.error('Book reading config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint for API information
export async function GET() {
  return NextResponse.json({
    message: 'OnlyOffice Book Reading Configuration API',
    endpoints: {
      configure: 'POST /api/onlyoffice/book-config',
      body: {
        bookId: 'string (required)',
        userId: 'string (required)'
      },
      authentication: 'Required - User must have purchased the book',
      description: 'Generates OnlyOffice viewer configuration for purchased books'
    }
  });
}