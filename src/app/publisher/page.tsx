'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import {
  Container, Typography, Grid, TextField, Select, MenuItem,
  Button, Box, InputLabel, FormControl, Chip,
} from '@mui/material';


interface Book {
  id: string;
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

const categories = [
  'Information technology', 'astrology', 'horoscope', 'music', 'programming',
  'engineering', 'language', 'math', 'learning', 'history',
  'fiction', 'mystery', 'romance', 'magic'
];

const editions = ['1st', '2nd', '3rd', '4th', '5th'];

export default function PublisherPage() {
  const session = useSession();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [form, setForm] = useState<any>(getEmptyForm());
  const [preview, setPreview] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  function getEmptyForm() {
    return {
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

    if (!error) setBooks(data || []);
  };

  const fetchTags = async () => {
    const { data } = await supabase.from('tags').select('name');
    if (data) setSuggestedTags(data.map(t => t.name));
  };

  useEffect(() => {
    const verifyPublisher = async () => {
      if (!session) {
        router.push('/login');
        return;
      }

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
      } else {
        fetchBooks();
        fetchTags();
      }
    };

    verifyPublisher();
  }, [session]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: any) => {
    if (e.target.files) {
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
    setForm({ ...book, customTag: '', image: null });
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

    let imageUrl = preview || '';

    if (form.image) {
      const file = form.image;
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('book-covers').upload(fileName, file);
      if (uploadError) {
        console.error('Upload error:', uploadError);
        setStatus('❌ Failed to upload image');
        return;
      }
      const { data: urlData } = supabase.storage.from('book-covers').getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    }

    const bookData = {
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
      await supabase.from('books').update(bookData).eq('id', editingBook.id);
      setEditOpen(false);
    } else {
      await supabase.from('books').insert([bookData]);
      setUploadOpen(false);
    }

    setForm(getEmptyForm());
    setPreview(null);
    setStatus('✅ Book saved');
    fetchBooks();
  };

  if (!session) return null;

  return (
    <div>
      <h1>📚 Publisher Dashboard</h1>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search books by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyUp={fetchBooks}
          style={{ padding: '8px', width: '100%', maxWidth: '300px' }}
        />
      </div>

      <button onClick={() => setUploadOpen(true)} style={{ marginBottom: '20px' }}>
        ➕ Upload New Book
      </button>

      {(isUploadOpen || isEditOpen) && (
        <div style={{
            background: '#FFFFFF',
            border: '1px solid #ccc',
            borderRadius: '16px',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px',
            margin: 'auto',
            width: '50%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>

          <Container sx={{ px: 2 }}>
            <Typography variant="h5" align="center" gutterBottom>
              {isEditOpen ? '✏️ Edit Book' : '📦 Upload New Book'}
            </Typography>

            <form onSubmit={(e) => handleSubmit(e, isEditOpen)}>
              <Grid container spacing={2} justifyContent="left" sx={{ mt: 3 }}>
                  <TextField label="Book Name" name="name" sx={{ width: '100%' }} fullWidth value={form.name} onChange={handleChange} required />
                  <TextField label="Author" name="author" sx={{ width: '32%' }} fullWidth value={form.author} onChange={handleChange} required />
                
                  <TextField label="Price" name="price" sx={{ width: '31%' }} type="number" fullWidth value={form.price} onChange={handleChange} required />
                
                
                  <FormControl sx={{ width: '31%' }} fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select name="category" value={form.category} onChange={handleChange} required>
                      {categories.map((cat) => (
                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
              </Grid>
              <Grid container spacing={2} justifyContent="left" sx={{ mt: 3}}>
                  <TextField name="published_date" sx={{ width: '65%' }} label="Published Date" type="date" fullWidth InputLabelProps={{ shrink: true }} value={form.published_date} onChange={handleChange} />
                  
                
                  <FormControl sx={{ width: '21.5%' }} fullWidth>
                    <InputLabel>Edition</InputLabel>
                    <Select name="edition" value={form.edition} onChange={handleChange}>
                      {editions.map((ed) => (
                        <MenuItem key={ed} value={ed}>{ed}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
              
              </Grid>
              <Grid container spacing={2} justifyContent="left" sx={{ mt: 3}}>
                  <TextField name="description" label="Description" sx={{ width: '100%' }} fullWidth multiline rows={2} value={form.description} onChange={handleChange} />
                
                  <Box display="flex" flexWrap="wrap" gap={1}>tags: 
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
                  <TextField name="customTag" label="Custom Tag" value={form.customTag} onChange={handleChange} sx={{ width: '40%'}} fullWidth />
                  <Button onClick={addCustomTag} sx={{ mt: 2 }} variant="outlined">➕ Add Tag</Button>
                </Grid>

                <Grid container spacing={2} justifyContent="left"  sx={{ mt: 3 }}>
                  <Typography variant="subtitle1">Upload Cover Image:</Typography>
                  <input type="file" accept="image/*" onChange={handleFileChange} />
                  {preview && <Box mt={2}><img src={preview} alt="preview" style={{ width: '90%', maxHeight: '250px', objectFit: 'contain' }} /></Box>}
                </Grid>
                <Grid container spacing={2} justifyContent="left" sx={{ mt: 3 }}>
                  <Button type="submit" variant="contained">Save</Button>
                  <Button variant="outlined" color="error" onClick={() => {
                    setUploadOpen(false);
                    setEditOpen(false);
                    setForm(getEmptyForm());
                    setPreview(null);
                  }}>
                    Cancel
                  </Button>
                  
              </Grid>
              <Typography color="text.secondary" sx={{ mt: 2 }}>{status}</Typography>
            </form>
          </Container>

        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {books.map((book) => (
          <li key={book.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', borderBottom: '5px solid #ccc', paddingBottom: '16px' }}>
            <img src={book.image_url} alt={book.name} style={{ width: '200px', height: 'auto', objectFit: 'cover', borderRadius: '6px' }} />
            <div>
              <h3>{book.name}</h3>
              <p><strong>Author:</strong> {book.author} | <strong>Price:</strong> {book.price} kyats</p>
              <p><strong>Category:</strong> {book.category}</p>
              <p><strong>Published:</strong> {new Date(book.published_date).toLocaleDateString()} | <strong>Edition:</strong> {book.edition}</p>
              <p><strong>Tags:</strong> {book.tags.join(', ')}</p>
              <p><strong>Added on:</strong> {new Date(book.created_at).toLocaleDateString()}</p>
              <strong>Description:</strong>
              <p>{book.description}</p>
              <button onClick={() => openEdit(book)}>✏️ Edit</button>
              <button onClick={() => handleDelete(book.id)} style={{ marginLeft: '8px', color: 'red' }}>🗑 Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
