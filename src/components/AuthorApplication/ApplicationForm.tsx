'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import FileUpload from '@/components/ui/FileUpload'
import type { AuthorApplicationFormData, FileUploadResult } from '@/types'

interface ApplicationFormProps {
  initialData?: Partial<AuthorApplicationFormData>
  onSubmit?: (data: AuthorApplicationFormData) => void
  mode?: 'create' | 'edit'
  loading?: boolean
}

const BOOK_CATEGORIES = [
  'Fiction',
  'Non-Fiction', 
  'Poetry',
  'Biography',
  'History',
  'Science',
  'Technology',
  'Business',
  'Self-Help',
  'Religion',
  'Philosophy',
  'Art',
  'Children',
  'Young Adult',
  'Romance',
  'Mystery',
  'Fantasy',
  'Horror',
  'Other'
]

export default function ApplicationForm({
  initialData,
  onSubmit,
  mode = 'create',
  loading = false
}: ApplicationFormProps) {
  const [formData, setFormData] = useState<AuthorApplicationFormData>({
    legal_name: initialData?.legal_name || '',
    author_name: initialData?.author_name || '',
    association_name: initialData?.association_name || '',
    membership_id: initialData?.membership_id || '',
    association_proof_url: initialData?.association_proof_url || '',
    why_publish_with_us: initialData?.why_publish_with_us || '',
    book_title: initialData?.book_title || '',
    book_synopsis: initialData?.book_synopsis || '',
    book_tags: initialData?.book_tags || [],
    book_category: initialData?.book_category || '',
    preferred_price: initialData?.preferred_price || undefined
  })
  
  // Convert book_category to array for multiple category support
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialData?.book_category ? initialData.book_category.split(', ').filter(c => c.trim()) : []
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  
  // Advanced tag/category state
  const [existingCategories, setExistingCategories] = useState<string[]>([])
  const [existingTags, setExistingTags] = useState<string[]>([])
  const [categorySearchTerm, setCategorySearchTerm] = useState('')
  const [tagSearchTerm, setTagSearchTerm] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  
  const router = useRouter()

  // Fetch existing categories and tags
  React.useEffect(() => {
    const fetchExistingData = async () => {
      try {
        // Fetch existing categories
        const { data: booksData } = await supabase
          .from('books')
          .select('category')
          .not('category', 'is', null)

        const { data: manuscriptsData } = await supabase
          .from('manuscripts')
          .select('category')
          .not('category', 'is', null)

        if (booksData || manuscriptsData) {
          const allCategoryStrings = [
            ...(booksData || []).map(item => item.category),
            ...(manuscriptsData || []).map(item => item.category)
          ]
          
          const allCategories = allCategoryStrings
            .flatMap(catString => catString.split(',').map((cat: string) => cat.trim()))
            .filter((cat: string) => cat)
            .filter((cat: string, index: number, arr: string[]) => arr.indexOf(cat) === index)
            .sort()
          
          setExistingCategories([...BOOK_CATEGORIES, ...allCategories].filter((cat, index, arr) => arr.indexOf(cat) === index).sort())
        } else {
          setExistingCategories(BOOK_CATEGORIES)
        }

        // Fetch existing tags
        const { data: bookTagsData } = await supabase
          .from('books')
          .select('tags')
          .not('tags', 'is', null)

        const { data: manuscriptTagsData } = await supabase
          .from('manuscripts')
          .select('tags')
          .not('tags', 'is', null)

        if (bookTagsData || manuscriptTagsData) {
          const allTagArrays = [
            ...(bookTagsData || []).map(item => item.tags || []),
            ...(manuscriptTagsData || []).map(item => item.tags || [])
          ]
          
          const allTags = allTagArrays
            .flat()
            .filter((tag: string) => tag)
            .filter((tag: string, index: number, arr: string[]) => arr.indexOf(tag) === index)
            .sort()
          
          setExistingTags(allTags)
        }
      } catch (error) {
        console.error('Error fetching existing data:', error)
        setExistingCategories(BOOK_CATEGORIES)
      }
    }

    fetchExistingData()
  }, [])

  // Handle clicking outside dropdowns to close them
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Close category dropdown if clicking outside
      if (showCategoryDropdown && !target.closest('.category-dropdown-container')) {
        setShowCategoryDropdown(false)
      }
      
      // Close tag dropdown if clicking outside
      if (showTagDropdown && !target.closest('.tag-dropdown-container')) {
        setShowTagDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCategoryDropdown, showTagDropdown])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'preferred_price' ? (value ? parseFloat(value) : undefined) : value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }


  const handleFileSelect = async (file: File) => {
    setProofFile(file)
    setUploadingProof(true)
    
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const response = await fetch('/api/author-applications/upload', {
        method: 'POST',
        body: uploadFormData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload file')
      }

      const result: { data: FileUploadResult } = await response.json()
      
      setFormData(prev => ({
        ...prev,
        association_proof_url: result.data.url
      }))
      
      if (errors.association_proof_url) {
        setErrors(prev => ({ ...prev, association_proof_url: '' }))
      }
    } catch (error) {
      console.error('File upload error:', error)
      setProofFile(null)
      setErrors(prev => ({
        ...prev,
        association_proof_url: error instanceof Error ? error.message : 'Failed to upload file'
      }))
    } finally {
      setUploadingProof(false)
    }
  }

  const handleFileRemove = () => {
    setProofFile(null)
    setFormData(prev => ({
      ...prev,
      association_proof_url: ''
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.legal_name.trim()) {
      newErrors.legal_name = 'Legal name is required'
    }

    if (!formData.author_name.trim()) {
      newErrors.author_name = 'Author name is required'
    }

    if (!formData.why_publish_with_us.trim()) {
      newErrors.why_publish_with_us = 'This field is required'
    } else if (formData.why_publish_with_us.length < 50) {
      newErrors.why_publish_with_us = 'Please provide at least 50 characters'
    }

    if (!formData.book_title.trim()) {
      newErrors.book_title = 'Book title is required'
    }

    if (!formData.book_synopsis.trim()) {
      newErrors.book_synopsis = 'Book synopsis is required'
    } else if (formData.book_synopsis.length < 100) {
      newErrors.book_synopsis = 'Synopsis must be at least 100 characters'
    }

    if (selectedCategories.length === 0) {
      newErrors.book_category = 'Please select or add at least one category'
    }

    if (formData.book_tags.length === 0) {
      newErrors.book_tags = 'Please add at least one tag'
    }

    if (formData.preferred_price && formData.preferred_price < 0) {
      newErrors.preferred_price = 'Price cannot be negative'
    }

    if (formData.preferred_price && formData.preferred_price < 1000) {
      newErrors.preferred_price = 'Price should be at least 1,000 MMK'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (onSubmit) {
      onSubmit({...formData, book_category: selectedCategories.join(', ')})
    } else {
      // Default submit logic
      try {
        const response = await fetch('/api/author-applications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({...formData, book_category: selectedCategories.join(', ')})
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to submit application')
        }

        // Redirect to profile page on success
        router.push('/profile')
        router.refresh()
      } catch (error) {
        console.error('Application submission error:', error)
        setErrors({
          submit: error instanceof Error ? error.message : 'Failed to submit application'
        })
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'edit' ? 'Update Author Application' : 'Apply as Author'}
          </h1>
          <p className="text-gray-600 mt-2">
            Submit your author application along with your first book pitch. Once approved, 
            you&apos;ll be able to submit manuscripts through our regular submission system.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Author Information */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Author Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                id="legal_name"
                name="legal_name"
                label="Legal Name *"
                value={formData.legal_name}
                onChange={handleInputChange}
                error={errors.legal_name}
                placeholder="Your full legal name"
                required
              />

              <Input
                id="author_name"
                name="author_name"
                label="Author/Pen Name *"
                value={formData.author_name}
                onChange={handleInputChange}
                error={errors.author_name}
                placeholder="Name to appear on publications"
                required
              />
            </div>
          </div>

          {/* Association Membership */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Association Membership (Optional)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                id="association_name"
                name="association_name"
                label="Association Name"
                value={formData.association_name}
                onChange={handleInputChange}
                error={errors.association_name}
                placeholder="e.g., Myanmar Writers Association"
                helperText="Any professional writing associations you belong to"
              />

              <Input
                id="membership_id"
                name="membership_id"
                label="Membership ID/Number"
                value={formData.membership_id}
                onChange={handleInputChange}
                error={errors.membership_id}
                placeholder="Your membership ID"
              />
            </div>

            <FileUpload
              label="Association Proof Document"
              accept="image/*,application/pdf"
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              value={proofFile}
              disabled={uploadingProof}
              error={errors.association_proof_url}
              helperText="Upload a photo of your membership card or certificate (optional)"
            />
          </div>

          {/* Application Details */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Application Details
            </h2>
            
            <div>
              <label htmlFor="why_publish_with_us" className="block text-sm font-medium text-gray-700 mb-1">
                Why do you want to publish with MyatPwint? *
              </label>
              <textarea
                id="why_publish_with_us"
                name="why_publish_with_us"
                rows={4}
                value={formData.why_publish_with_us}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Tell us why you want to publish with us and what makes you a good fit..."
                required
              />
              {errors.why_publish_with_us && (
                <p className="mt-1 text-sm text-red-600">{errors.why_publish_with_us}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.why_publish_with_us.length} characters (minimum 50)
              </p>
            </div>
          </div>

          {/* First Book Information */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              First Book Pitch
            </h2>
            
            <Input
              id="book_title"
              name="book_title"
              label="Book Title *"
              value={formData.book_title}
              onChange={handleInputChange}
              error={errors.book_title}
              placeholder="The title of your book"
              required
            />

            <div>
              <label htmlFor="book_synopsis" className="block text-sm font-medium text-gray-700 mb-1">
                Book Synopsis *
              </label>
              <textarea
                id="book_synopsis"
                name="book_synopsis"
                rows={6}
                value={formData.book_synopsis}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Provide a compelling summary of your book that would interest publishers..."
                required
              />
              {errors.book_synopsis && (
                <p className="mt-1 text-sm text-red-600">{errors.book_synopsis}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.book_synopsis.length} characters (minimum 100)
              </p>
            </div>

            {/* Categories with Advanced Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories *
              </label>
              
              {/* Search Input */}
              <div className="relative mb-3 category-dropdown-container">
                <input
                  type="text"
                  value={categorySearchTerm}
                  onChange={(e) => {
                    setCategorySearchTerm(e.target.value)
                    setShowCategoryDropdown(true)
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  placeholder="Search or add categories..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const filteredCategories = existingCategories.filter(category => 
                        category.toLowerCase().includes(categorySearchTerm.toLowerCase()) &&
                        !selectedCategories.includes(category)
                      )
                      if (filteredCategories.length > 0) {
                        setSelectedCategories(prev => [...prev, filteredCategories[0]])
                        setCategorySearchTerm('')
                        setShowCategoryDropdown(false)
                      } else if (categorySearchTerm.trim() && !selectedCategories.includes(categorySearchTerm.trim())) {
                        setSelectedCategories(prev => [...prev, categorySearchTerm.trim()])
                        setCategorySearchTerm('')
                        setShowCategoryDropdown(false)
                      }
                    }
                  }}
                />
                
                {/* Dropdown */}
                {showCategoryDropdown && (categorySearchTerm || existingCategories.length > 0) && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 border-t-0 rounded-b-md max-h-48 overflow-y-auto z-50 shadow-lg">
                    {/* Filtered existing categories */}
                    {existingCategories
                      .filter(category => 
                        category.toLowerCase().includes(categorySearchTerm.toLowerCase()) &&
                        !selectedCategories.includes(category)
                      )
                      .map((category) => (
                      <div
                        key={category}
                        onClick={() => {
                          setSelectedCategories(prev => [...prev, category])
                          setCategorySearchTerm('')
                          setShowCategoryDropdown(false)
                        }}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                      >
                        {category}
                      </div>
                    ))}
                    
                    {/* Add custom category option */}
                    {categorySearchTerm && 
                     !existingCategories.includes(categorySearchTerm) && 
                     !selectedCategories.includes(categorySearchTerm) && (
                      <div
                        onClick={() => {
                          setSelectedCategories(prev => [...prev, categorySearchTerm.trim()])
                          setCategorySearchTerm('')
                          setShowCategoryDropdown(false)
                        }}
                        className="px-3 py-2 cursor-pointer bg-blue-50 text-blue-700 hover:bg-blue-100 italic"
                      >
                        + Add &quot;{categorySearchTerm}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Categories Display */}
              {selectedCategories.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm text-gray-600 mb-2">Selected categories:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategories.map((category) => (
                      <span
                        key={category}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {category}
                        <button
                          type="button"
                          onClick={() => setSelectedCategories(prev => prev.filter(c => c !== category))}
                          className="hover:bg-blue-200 rounded-full p-1 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {errors.book_category && (
                <p className="mt-1 text-sm text-red-600">{errors.book_category}</p>
              )}
            </div>

            {/* Tags with Advanced Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags *
              </label>
              
              {/* Search Input */}
              <div className="relative mb-3 tag-dropdown-container">
                <input
                  type="text"
                  value={tagSearchTerm}
                  onChange={(e) => {
                    setTagSearchTerm(e.target.value)
                    setShowTagDropdown(true)
                  }}
                  onFocus={() => setShowTagDropdown(true)}
                  placeholder="Search or add tags..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const filteredTags = existingTags.filter(tag => 
                        tag.toLowerCase().includes(tagSearchTerm.toLowerCase()) &&
                        !formData.book_tags.includes(tag)
                      )
                      if (filteredTags.length > 0) {
                        setFormData(prev => ({...prev, book_tags: [...prev.book_tags, filteredTags[0]]}))
                        setTagSearchTerm('')
                        setShowTagDropdown(false)
                      } else if (tagSearchTerm.trim() && !formData.book_tags.includes(tagSearchTerm.trim())) {
                        setFormData(prev => ({...prev, book_tags: [...prev.book_tags, tagSearchTerm.trim()]}))
                        setTagSearchTerm('')
                        setShowTagDropdown(false)
                      }
                    }
                  }}
                />
                
                {/* Dropdown */}
                {showTagDropdown && (tagSearchTerm || existingTags.length > 0) && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 border-t-0 rounded-b-md max-h-48 overflow-y-auto z-50 shadow-lg">
                    {/* Filtered existing tags */}
                    {existingTags
                      .filter(tag => 
                        tag.toLowerCase().includes(tagSearchTerm.toLowerCase()) &&
                        !formData.book_tags.includes(tag)
                      )
                      .map((tag) => (
                      <div
                        key={tag}
                        onClick={() => {
                          setFormData(prev => ({...prev, book_tags: [...prev.book_tags, tag]}))
                          setTagSearchTerm('')
                          setShowTagDropdown(false)
                        }}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                      >
                        {tag}
                      </div>
                    ))}
                    
                    {/* Add custom tag option */}
                    {tagSearchTerm && 
                     !existingTags.includes(tagSearchTerm) && 
                     !formData.book_tags.includes(tagSearchTerm) && (
                      <div
                        onClick={() => {
                          setFormData(prev => ({...prev, book_tags: [...prev.book_tags, tagSearchTerm.trim()]}))
                          setTagSearchTerm('')
                          setShowTagDropdown(false)
                        }}
                        className="px-3 py-2 cursor-pointer bg-green-50 text-green-700 hover:bg-green-100 italic"
                      >
                        + Add &quot;{tagSearchTerm}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Tags Display */}
              {formData.book_tags.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm text-gray-600 mb-2">Selected tags:</div>
                  <div className="flex flex-wrap gap-2">
                    {formData.book_tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({...prev, book_tags: prev.book_tags.filter(t => t !== tag)}))}
                          className="hover:bg-green-200 rounded-full p-1 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {errors.book_tags && (
                <p className="mt-1 text-sm text-red-600">{errors.book_tags}</p>
              )}
            </div>

            <Input
              id="preferred_price"
              name="preferred_price"
              type="number"
              step="1000"
              min="0"
              label="Preferred Price (MMK)"
              value={formData.preferred_price || ''}
              onChange={handleInputChange}
              error={errors.preferred_price}
              placeholder="e.g., 25000"
              helperText="Optional: Your suggested selling price in Myanmar Kyat"
            />
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {errors.submit}
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading || uploadingProof}
              disabled={loading || uploadingProof}
            >
              {mode === 'edit' ? 'Update Application' : 'Submit Application'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}