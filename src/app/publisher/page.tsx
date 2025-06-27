'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import {
  Container, Typography, Grid, TextField, Select, MenuItem,
  Button, Box, InputLabel, FormControl, Chip
} from '@mui/material';
import './publisher.css';

interface Book {
  id: string;
  manuscript_id: string | null;
  name: string;
  price: number;
  author: string;
  description: string;
  category: string;
  published_date: string;
  edition: string;
  tags: string[];
  image_url: string;
  created_at: string;
}

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
  const router = useRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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
  };

  useEffect(() => {
    const verifyPublisher = async () => {
      if (!session) { router.push('/login'); return; }

      const email = session.user.email;
      const { data, error } = await supabase
        .from('publishers')
        .select('email')
        .eq('email', email)
        .single();

      if (error || !data) {
        alert('❌ Access denied.');
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }

      fetchBooks();
      fetchTags();
      fetchManuscripts();
    };

    verifyPublisher();
  }, [session, search]);

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
    if (!error) {
      setForm((prev: any) => ({ ...prev, tags: [...prev.tags, tag], customTag: '' }));
      fetchTags();
    }
  };

  const openEdit = (book: Book) => {
    setEditingBook(book);
    setForm({ ...book, manuscript_id: book.manuscript_id ?? '', customTag: '', image: null });
    setPreview(book.image_url);
    setEditOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('books').delete().eq('id', id);
    fetchBooks();
  };

  const handleSubmit = async (e: React.FormEvent, isEdit = false) => {
    e.preventDefault();
    setStatus('Uploading...');
    let imageUrl = preview ?? '';

    if (form.image) {
      const fileName = `${Date.now()}-${form.image.name}`;
      const { error: uploadError } = await supabase.storage.from('book-covers').upload(fileName, form.image);
      if (uploadError) { setStatus('❌ Failed to upload image'); return; }

      const { data: urlData } = supabase.storage.from('book-covers').getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    }

    const bookData = {
      manuscript_id: form.manuscript_id || null,
      name: form.name,
      author: form.author,
      price: parseFloat(form.price),
      category: form.category,
      description: form.description,
      published_date: form.published_date,
      edition: form.edition,
      tags: form.tags,
      image_url: imageUrl,
    };

    if (isEdit && editingBook) {
      const { error } = await supabase.from('books').update(bookData).eq('id', editingBook.id);
      setEditOpen(false);
    } else {
      const { error } = await supabase.from('books').insert([bookData]);
      if (!error && form.manuscript_id) {
        await supabase.from('manuscripts').update({ status: 'published' }).eq('id', form.manuscript_id);
      }
      setUploadOpen(false);
    }

    setForm(getEmptyForm());
    setPreview(null);
    fetchBooks();
    fetchManuscripts();
  };

  if (!session) return null;

  return (
    <div className="publisher-container">
      <h1>📚 Publisher Dashboard</h1>

      <div className="toolbar">
        <button onClick={() => setUploadOpen(true)} className="upload-button">➕ Upload New Book</button>
        <a className="upload-button" href="/publisher/manuscripts">View Manuscript</a>
        <input
          type="text"
          placeholder="Search books by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-bar"
        />
      </div>

      {(isUploadOpen || isEditOpen) && (
        <div className="modal-overlay">
          <div className="modal-content">
            <Container sx={{ px: 2 }}>
              <Typography variant="h5" align="center" gutterBottom>
                {isEditOpen ? '✏️ Edit Book' : '📦 Upload New Book'}
              </Typography>

              <form onSubmit={(e) => handleSubmit(e, isEditOpen)}>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>Manuscript</InputLabel>
                    <Select
                      name="manuscript_id"
                      value={form.manuscript_id}
                      onChange={handleChange}
                    >
                      {manuscripts.map((m) => (
                        <MenuItem key={m.id} value={m.id}>{m.title}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <TextField fullWidth label="Book Name" name="name" value={form.name} onChange={handleChange} required />
                  <TextField label="Author" name="author" value={form.author} onChange={handleChange} required sx={{ width: '32%' }} />
                  <TextField label="Price" name="price" value={form.price} onChange={handleChange} type="number" sx={{ width: '32%' }} />
                  <FormControl sx={{ width: '32%' }}>
                    <InputLabel>Category</InputLabel>
                    <Select name="category" value={form.category} onChange={handleChange}>
                      {categories.map((cat) => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <TextField
                    fullWidth multiline rows={2}
                    name="description"
                    label="Description"
                    value={form.description}
                    onChange={handleChange}
                  />
                  <Box className="tag-container">
                    tags:
                    {suggestedTags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        color={form.tags.includes(tag) ? 'primary' : 'default'}
                        onClick={() => handleTagToggle(tag)}
                        variant="outlined"
                      />
                    ))}
                  </Box>

                  <Box className="tag-upload-row">
                    <TextField
                      name="customTag"
                      label="Custom Tag"
                      value={form.customTag}
                      onChange={handleChange}
                      sx={{ flex: 1 }}
                    />
                    <Button onClick={addCustomTag} variant="outlined" className="add-tag-button">
                      ➕ Add Tag
                    </Button>
                    <label className="custom-file-upload">
                      📁 Choose Cover Image
                      <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                    </label>
                  </Box>

                  {preview && (
                    <Box mt={2}>
                      <img src={preview} alt="Preview" style={{ width: '150px', borderRadius: '8px' }} />
                    </Box>
                  )}
                </Grid>

                <Grid container spacing={2} sx={{ mt: 3 }}>
                  <Button type="submit" variant="contained">Save</Button>
                  <Button variant="outlined" color="error" onClick={() => { setUploadOpen(false); setEditOpen(false); setForm(getEmptyForm()); setPreview(null); }}>
                    Cancel
                  </Button>
                </Grid>

                <Typography color="text.secondary" sx={{ mt: 2 }}>{status}</Typography>
              </form>
            </Container>
          </div>
        </div>
      )}

      <ul className="book-list">
        {books.map((book) => (
          <li key={book.id}>
            <img src={book.image_url} alt={book.name} />
            <div className="book-info">
              <h3>{book.name}</h3>
              <p><strong>Author:</strong> {book.author} | <strong>Price:</strong> {book.price} kyats</p>
              <p><strong>Category:</strong> {book.category}</p>
              <p><strong>Published:</strong> {new Date(book.published_date).toLocaleDateString()} | <strong>Edition:</strong> {book.edition}</p>
              <p><strong>Tags:</strong> {book.tags.join(', ')}</p>
              <p><strong>Added on:</strong> {new Date(book.created_at).toLocaleDateString()}</p>
              <p><strong>Description:</strong> {book.description}</p>
            </div>
            <div className="card-buttons">
              <button onClick={() => openEdit(book)} className="edit-button">✏️ Edit</button>
              <button onClick={() => handleDelete(book.id)} className="delete-button">🗑 Delete</button>
              {book.manuscript_id && (
                <button onClick={() => router.push(`/books/${book.id}`)} className="view-button">
                  🔍 View
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
