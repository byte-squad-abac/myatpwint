'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import { Book } from '@/lib/types';
import {
  Container, Typography, Grid, TextField, Select, MenuItem,
  Button, Box, InputLabel, FormControl, Chip,
} from '@mui/material';
import './publisher.css';

interface Manuscript {
  id: string;
  title: string;
  author: string;
}

const categories = [
  'Information technology', 'astrology', 'horoscope', 'music', 'programming',
  'engineering', 'language', 'math', 'learning', 'history',
  'fiction', 'mystery', 'romance', 'magic',
];

const editions = ['1st', '2nd', '3rd', '4th', '5th'];

export default function PublisherPage() {
  const session = useSession();
  const router   = useRouter();
  
  const [isPublisher, setIsPublisher] = useState<boolean | null>(null);
  const [isEditor, setIsEditor] = useState<boolean | null>(null);


  const [books,         setBooks]        = useState<Book[]>([]);
  const [manuscripts,   setManuscripts]  = useState<Manuscript[]>([]);
  const [suggestedTags, setSuggestedTags]= useState<string[]>([]);
  const [status,        setStatus]       = useState('');
  const [isUploadOpen,  setUploadOpen]   = useState(false);
  const [isEditOpen,    setEditOpen]     = useState(false);
  const [editingBook,   setEditingBook]  = useState<Book | null>(null);
  const [preview,       setPreview]      = useState<string | null>(null);
  const [search,        setSearch]       = useState('');

  const [form, setForm] = useState<any>(getEmptyForm());

  function getEmptyForm() {
    return {
      manuscript_id: '',
      name: '',
      author: '',
      price: '',
      category: '',
      description: '',
      published_date: '',
      edition: '',
      tags: [] as string[],
      customTag: '',
      image: null as File | null,
    };
  }

  const fetchBooks = async () => {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .ilike('name', `%${search}%`)
      .order('created_at', { ascending: false });

    if (!error) setBooks(data ?? []);
  };

  const fetchTags = async () => {
    const { data } = await supabase.from('tags').select('name');
    if (data) setSuggestedTags(data.map(t => t.name));
  };

  const fetchManuscripts = async () => {
    const { data, error } = await supabase
      .from('manuscripts')
      .select('*')
      .eq('status', 'waiting_upload');

    if (!error) setManuscripts(data ?? []);
    else console.error('[Supabase] manuscripts waiting_upload', error);
  };

  useEffect(() => {
    console.log('Session:', session);  // Log session before checking it
    console.log("Router:", router);  // log router to see if it is properly initialized

    const verifyPublisher = async () => {
      if (!session) {
        console.log('No session, redirecting...');
        router.push('/login');
        return;
      }

      
    console.log("Session Data:", session); // Log session data

      const email = session.user.email;
      const { data, error } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('email', email)
        .single();

      if (error || !data) {
      console.error("Error fetching publisher role:", error);
      alert('❌ Access denied. You do not have publisher permissions.');
      await supabase.auth.signOut();
      router.push('/login');
      return;
      // setIsPublisher(false); 
      // ❌ Not a publisher
    } 

    
    // Log role to verify
    console.log("User Role:", data.role);


    // Set role based on the user data
    if (data.role === 'publisher') {
      setIsPublisher(true);
      setIsEditor(false); // Ensure editor is false for publisher
      fetchBooks();
      fetchTags();
      fetchManuscripts();
    } else if (data.role === 'editor') {
      setIsEditor(true); // Add editor role
      setIsPublisher(false); // Ensure publisher is false for editor
      fetchManuscripts(); // Load manuscripts for editing
    } else {
      setIsPublisher(false);
    }

    if (session && session.user) {
  console.log("Session is initialized and user is logged in");
} else {
  console.log("Session not initialized or user not logged in");
}

  
  };
    verifyPublisher();
  }, [session, router]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: any) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setForm((prev: any) => ({ ...prev, image: file }));
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleTagToggle = (tag: string) => {
    setForm((prev: any) => {
      const tags = prev.tags.includes(tag)
        ? prev.tags.filter((t: string) => t !== tag)
        : [...prev.tags, tag];
      return { ...prev, tags };
    });
  };

  const addCustomTag = async () => {
    const tag = form.customTag.trim();
    if (!tag || form.tags.includes(tag)) return;

    const { error } = await supabase.from('tags').insert({ name: tag });
    if (error) console.warn('Tag insert failed (likely duplicate):', error.message);

    setForm((prev: any) => ({ ...prev, tags: [...prev.tags, tag], customTag: '' }));
    fetchTags();
  };

  const openEdit = (book: Book) => {
    setEditingBook(book);
    setForm({ ...book, manuscript_id: book.manuscript_id ?? '', customTag: '', image: null });
    setPreview(book.image_url);
    setEditOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('books').delete().eq('id', id); //Deleting the book

    const bookToDelete = books.find(b => b.id === id); //Finding the book deleted

    // If that book had a manuscript, update its status
    if (bookToDelete?.manuscript_id) {
    const { error } = await supabase
      .from('manuscripts')
      .update({ status: 'waiting_upload' })
      .eq('id', bookToDelete.manuscript_id);

    if (error) {
      console.error('❌ Manuscript status update failed:', error.message);
    } else {
      console.log('✅ Manuscript status set to waiting_upload');
    }
  }
    setStatus('✅ Book deleted');
    fetchBooks();
  };

  const handleSubmit = async (e: React.FormEvent, isEdit = false) => {
    e.preventDefault();
    setStatus('Uploading...');
    let imageUrl = preview ?? '';
    let fileUrl = null;

    if (form.manuscript_id) {
      const { data: manuscriptData, error: manuscriptErr } = await supabase
        .from('manuscripts')
        .select('file_url')
        .eq('id', form.manuscript_id)
        .single();

      if (manuscriptErr) {
        console.error('❌ Failed to fetch manuscript file_url:', manuscriptErr.message);
      } else {
        fileUrl = manuscriptData?.file_url;
      }
    }

    if (form.image) {
      const file     = form.image;
      const bookTitle = form.name.replace(/\s+/g, '_');
      const filePath = `${bookTitle}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('book-covers').upload(filePath, file);
      if (upErr) { setStatus('❌ Failed to upload image'); return; }
      const { data: urlData } = supabase.storage.from('book-covers').getPublicUrl(filePath);
      imageUrl = urlData.publicUrl;
    }

    const bookData = {
      manuscript_id : form.manuscript_id || null,
      file_url: fileUrl || null,
      name          : form.name,
      author        : form.author,
      price         : parseFloat(form.price),
      category      : form.category,
      description   : form.description,
      published_date: form.published_date,
      edition       : form.edition,
      tags          : form.tags,
      image_url     : imageUrl,
    };

    if (isEdit && editingBook) {
      await supabase.from('books').update(bookData).eq('id', editingBook.id);
      setEditOpen(false);
    } else {
      const { error: insertError } = await supabase.from('books').insert([bookData]);
      if (!insertError && form.manuscript_id) {
        const { error: mErr } = await supabase
    .from('manuscripts')
    .update({ status: 'published' })
    .eq('id', form.manuscript_id);

  if (mErr) {
    console.error('[Supabase] manuscript update error:', mErr);
  } else {
    console.log('✅ Manuscript status updated to published');
  }
}
      setUploadOpen(false);
    }

    setForm(getEmptyForm());
    setPreview(null);
    setStatus('✅ Book saved');
    fetchBooks();
    fetchManuscripts();
  };

  if (!session) return(<div>Loading...</div>);

  if (isPublisher === false) {
  return (
    <div style={{ color: 'black', textAlign: 'center', marginTop: '50px' }}>
      <h2>❌ Access Denied</h2>
      <p>You are not a publisher.</p>
      <Button
        variant="contained"
        color="error"
        onClick={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
        sx={{ mt: 2 }}
      >
        Logout
      </Button>
    </div>
  );
}

// Still verifying publisher role
if (isPublisher === null) {
  return (<div style={{ color: 'white', textAlign: 'center' }}>Verifying publisher access...</div>);
}

  return (
    <div className="publisher-container">
      <h1>📚 Publisher Dashboard</h1>
      <div className="toolbar">
      <button onClick={() => setUploadOpen(true)} className="upload-button">
        ➕ Upload New Book
      </button>
      <a className="upload-button" href="/publisher/manuscripts">View Manuscript</a>
      <a className="upload-button" href="/publisher/author-manage">Manage Author</a>
      </div>
      <div style={{ marginBottom: 20, marginTop: 20, color: 'white' }}>
        <input
          type="text"
          placeholder="Search books by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyUp={fetchBooks}
          className="search-bar"
        />
      </div>

      {/* --------------------- Modal (upload / edit) --------------------- */}
      {(isUploadOpen || isEditOpen) && (
        <div
          style={{
            background: '#FFF',
            border: '1px solid #ccc',
            borderRadius: 16,
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: 20,
            margin: 'auto',
            width: '50%',
            maxHeight: '70vh',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <Container sx={{ px: 2 }}>
            <Typography variant="h5" align="center" gutterBottom>
              {isEditOpen ? '✏️ Edit Book' : '📦 Upload New Book'}
            </Typography>

            <form onSubmit={(e) => handleSubmit(e, isEditOpen)}>
              {/* ---------- Manuscript dropdown ---------- */}
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <FormControl sx={{ width: '100%' }} fullWidth>
                  <InputLabel>Manuscript (select only if ready to publish)</InputLabel>
                  <Select
                    name="manuscript_id"
                    value={form.manuscript_id}
                    onChange={handleChange}
                    label="Manuscript (waiting_upload)"
                  >
                    {manuscripts.map((m) => (
                      <MenuItem key={m.id} value={m.id}>
                        {m.title} 
                        {/* — {m.author}  */}
                        {/* add author later */}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* ---------- existing fields ---------- */}
              <Grid container spacing={2} justifyContent="left" sx={{ mt: 3 }}>
                <TextField label="Book Name" name="name" sx={{ width: '100%' }} fullWidth value={form.name} onChange={handleChange} required />
                <TextField label="Author"    name="author" sx={{ width: '32%' }} fullWidth value={form.author} onChange={handleChange} required />
                <TextField label="Price"     name="price"  sx={{ width: '31%' }} type="number" fullWidth value={form.price} onChange={handleChange} required />
                <FormControl sx={{ width: '31%' }} fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select name="category" value={form.category} onChange={handleChange} required>
                    {categories.map((cat) => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>

              <Grid container spacing={2} justifyContent="left" sx={{ mt: 3 }}>
                <TextField name="published_date" sx={{ width: '65%' }} label="Published Date" type="date" fullWidth InputLabelProps={{ shrink: true }} value={form.published_date} onChange={handleChange} />
                <FormControl sx={{ width: '21.5%' }} fullWidth>
                  <InputLabel>Edition</InputLabel>
                  <Select name="edition" value={form.edition} onChange={handleChange}>
                    {editions.map((ed) => <MenuItem key={ed} value={ed}>{ed}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>

              <Grid container spacing={2} sx={{ mt: 2 }}>
                  <TextField fullWidth multiline rows={2} label="Description" name="description" value={form.description} onChange={handleChange} />
                  <Box className="tag-container">
                    tags:
                    {suggestedTags.map(tag => (
                      <Chip key={tag} label={tag} color={form.tags.includes(tag) ? 'primary' : 'default'} onClick={() => handleTagToggle(tag)} variant="outlined" />
                    ))}
                  </Box>

                  <Box className="tag-upload-row">
                    <TextField name="customTag" label="Custom Tag" value={form.customTag} onChange={handleChange} sx={{ flex: 1 }} />
                    <Button onClick={addCustomTag} className="add-tag-button" variant="outlined">➕ Add Tag</Button>
                    <label className="custom-file-upload">
                      📁 Choose Cover Image
                      <input type="file" accept="image/*" hidden onChange={handleFileChange} />
                    </label>
                  </Box>

                  {preview && (
                    <Box mt={2}>
                      <img src={preview} alt="Preview" style={{ width: '150px', borderRadius: 8 }} />
                    </Box>
                  )}
                </Grid>

              <Grid container spacing={2} justifyContent="left" sx={{ mt: 3 }}>
                <Button type="submit" variant="contained">Save</Button>
                <Button variant="outlined" color="error" onClick={() => { setUploadOpen(false); setEditOpen(false); setForm(getEmptyForm()); setPreview(null); }}>
                  Cancel
                </Button>
              </Grid>

              <Typography color="text.secondary" sx={{ mt: 2 }}>{status}</Typography>
            </form>
          </Container>
        </div>
      )}

      {/* --------------------- book list ------------------ */}
      <ul className="book-list">
        {books.map((book) => (
          <li key={book.id}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <img src={book.image_url || "null"} alt={book.name} style={{ width: 200, height: 'auto', objectFit: 'cover', borderRadius: 6 }} />
            </div>

            <div className="book-info">

              <h3>{book.name}</h3>
              <p><strong>Author:</strong> {book.author} | <strong>Price:</strong> {book.price} kyats</p>
              <p><strong>Category:</strong> {book.category}</p>
              <p><strong>Published:</strong> {new Date(book.published_date).toLocaleDateString()} | <strong>Edition:</strong> {book.edition}</p>
              <p><strong>Tags:</strong> {book.tags?.join(', ') || 'No tags'}</p>
              <p><strong>Added on:</strong> {new Date(book.created_at).toLocaleDateString()}</p>
              <strong>Description:</strong>
              <p>{book.description}</p>
              </div>
            <div className="card-buttons">
              <button onClick={() => openEdit(book)} className="edit-button">✏️ Edit</button>
              <button onClick={() => handleDelete(book.id)} className="delete-button">🗑 Delete</button>
              {/* ---------- VIEW button ---------- */}
              {book.manuscript_id && book.file_url && (
                <div>
                <button onClick={() => router.push(`/books/${book.id}`)} className="view-button">
                  🔍 View
                </button>

                <a href={book.file_url} target="_blank" rel="noopener noreferrer">View Finalized Manuscript</a>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}