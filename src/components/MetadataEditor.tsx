'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

interface MetadataEditorProps {
  manuscript: {
    id: string
    title: string
    description: string
    category: string
    tags: string[] | null
    cover_image_url: string
    suggested_price: number | null
    wants_physical: boolean | null
  }
  onClose: () => void
  onUpdate: () => void
}


export function MetadataEditor({ manuscript, onClose, onUpdate }: MetadataEditorProps) {
  const [formData, setFormData] = useState({
    title: manuscript.title,
    description: manuscript.description,
    suggested_price: manuscript.suggested_price || 0,
    wants_physical: manuscript.wants_physical || false
  })
  
  // Categories and tags state (matching submission form)
  const [existingCategories, setExistingCategories] = useState<string[]>([])
  const [existingTags, setExistingTags] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    manuscript.category ? manuscript.category.split(', ').filter(c => c.trim()) : []
  )
  const [selectedTags, setSelectedTags] = useState<string[]>(manuscript.tags || [])
  const [categorySearchTerm, setCategorySearchTerm] = useState('')
  const [tagSearchTerm, setTagSearchTerm] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const supabase = createClient()

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Fetch existing categories and tags
  const fetchExistingData = useCallback(async () => {
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
          ...(booksData || []).map(item => item.category || ''),
          ...(manuscriptsData || []).map(item => item.category || '')
        ]
        
        const allCategories = allCategoryStrings
          .flatMap(catString => catString.split(', '))
          .filter(cat => cat.trim())
          .filter((cat, index, arr) => arr.indexOf(cat) === index)
          .sort()
        
        setExistingCategories(allCategories)
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
    }
  }, [supabase])

  useEffect(() => {
    fetchExistingData()
  }, [fetchExistingData])

  const handleCoverUpload = (files: FileList) => {
    if (files && files[0]) {
      const file = files[0]
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file for the cover')
        return
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('Cover image must be smaller than 10MB')
        return
      }
      
      setCoverFile(file)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    // Validate categories
    if (selectedCategories.length === 0) {
      setError('At least one category is required')
      setSaving(false)
      return
    }

    try {
      let coverImageUrl = manuscript.cover_image_url

      // Upload new cover if provided
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop()
        const fileName = `${manuscript.id}-cover.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('covers')
          .upload(fileName, coverFile, {
            upsert: true,
            contentType: coverFile.type
          })

        if (uploadError) {
          throw new Error(`Failed to upload cover: ${uploadError.message}`)
        }

        const { data: { publicUrl } } = supabase.storage
          .from('covers')
          .getPublicUrl(fileName)

        coverImageUrl = publicUrl
      }

      // Update manuscript metadata
      const { error: updateError } = await supabase
        .from('manuscripts')
        .update({
          title: formData.title,
          description: formData.description,
          category: selectedCategories.join(', '),
          tags: selectedTags.length > 0 ? selectedTags : null,
          cover_image_url: coverImageUrl,
          suggested_price: formData.suggested_price,
          wants_physical: formData.wants_physical,
          updated_at: new Date().toISOString()
        })
        .eq('id', manuscript.id)

      if (updateError) {
        throw new Error(`Failed to update manuscript: ${updateError.message}`)
      }

      onUpdate()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update metadata')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Edit Manuscript Metadata</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categories *
            </label>
            <div className="relative">
              <input
                type="text"
                value={categorySearchTerm}
                onChange={(e) => {
                  setCategorySearchTerm(e.target.value)
                  setShowCategoryDropdown(true)
                }}
                onFocus={() => setShowCategoryDropdown(true)}
                onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
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
                    } else if (categorySearchTerm.trim() && !selectedCategories.includes(categorySearchTerm.trim())) {
                      setSelectedCategories(prev => [...prev, categorySearchTerm.trim()])
                      setCategorySearchTerm('')
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
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      {category}
                    </div>
                  ))}
                  
                  {/* Add new category option */}
                  {categorySearchTerm.trim() && 
                   !existingCategories.some(cat => cat.toLowerCase() === categorySearchTerm.toLowerCase()) &&
                   !selectedCategories.includes(categorySearchTerm.trim()) && (
                    <div
                      onClick={() => {
                        setSelectedCategories(prev => [...prev, categorySearchTerm.trim()])
                        setCategorySearchTerm('')
                        setShowCategoryDropdown(false)
                      }}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 text-blue-600 font-medium"
                    >
                      + Add &ldquo;{categorySearchTerm.trim()}&rdquo;
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Categories Display */}
            {selectedCategories.length > 0 && (
              <div className="mt-3">
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
                        className="text-blue-600 hover:text-blue-800 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="relative">
              <input
                type="text"
                value={tagSearchTerm}
                onChange={(e) => {
                  setTagSearchTerm(e.target.value)
                  setShowTagDropdown(true)
                }}
                onFocus={() => setShowTagDropdown(true)}
                onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
                placeholder="Search or add tags..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const filteredTags = existingTags.filter(tag => 
                      tag.toLowerCase().includes(tagSearchTerm.toLowerCase()) &&
                      !selectedTags.includes(tag)
                    )
                    if (filteredTags.length > 0) {
                      setSelectedTags(prev => [...prev, filteredTags[0]])
                      setTagSearchTerm('')
                    } else if (tagSearchTerm.trim() && !selectedTags.includes(tagSearchTerm.trim())) {
                      setSelectedTags(prev => [...prev, tagSearchTerm.trim()])
                      setTagSearchTerm('')
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
                      !selectedTags.includes(tag)
                    )
                    .map((tag) => (
                    <div
                      key={tag}
                      onClick={() => {
                        setSelectedTags(prev => [...prev, tag])
                        setTagSearchTerm('')
                        setShowTagDropdown(false)
                      }}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      {tag}
                    </div>
                  ))}
                  
                  {/* Add new tag option */}
                  {tagSearchTerm.trim() && 
                   !existingTags.some(tag => tag.toLowerCase() === tagSearchTerm.toLowerCase()) &&
                   !selectedTags.includes(tagSearchTerm.trim()) && (
                    <div
                      onClick={() => {
                        setSelectedTags(prev => [...prev, tagSearchTerm.trim()])
                        setTagSearchTerm('')
                        setShowTagDropdown(false)
                      }}
                      className="px-3 py-2 hover:bg-green-50 cursor-pointer border-b border-gray-100 text-green-600 font-medium"
                    >
                      + Add &ldquo;{tagSearchTerm.trim()}&rdquo;
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Tags Display */}
            {selectedTags.length > 0 && (
              <div className="mt-3">
                <div className="text-sm text-gray-600 mb-2">Selected tags:</div>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                        className="text-green-600 hover:text-green-800 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Book Cover
            </label>
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <Image
                  src={manuscript.cover_image_url}
                  alt="Current cover"
                  width={64}
                  height={80}
                  className="w-16 h-20 object-cover rounded border"
                />
                <div>
                  <p className="text-sm text-gray-600">Current cover</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && handleCoverUpload(e.target.files)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Change Cover
                  </button>
                </div>
              </div>
              {coverFile && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>New cover selected: {coverFile.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Suggested Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Suggested Price (MMK)
            </label>
            <input
              type="number"
              min="0"
              value={formData.suggested_price}
              onChange={(e) => handleInputChange('suggested_price', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Physical Book Option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="wants_physical"
              checked={formData.wants_physical}
              onChange={(e) => handleInputChange('wants_physical', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="wants_physical" className="text-sm font-medium text-gray-700">
              I want this book to be available as a physical copy
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              loading={saving}
              disabled={saving}
              className="flex-1"
            >
              {saving ? 'Updating...' : 'Update Metadata'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}