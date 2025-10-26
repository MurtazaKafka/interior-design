'use client'

import NextImage from 'next/image'
import { Upload } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { useState } from 'react'

export type FloorplanUploaderProps = {
  floorplanPreview: string
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onDrop: (files: FileList) => void
}

export const FloorplanUploader = ({ floorplanPreview, onUpload, onDrop }: FloorplanUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <label
      className={`group relative flex min-h-[320px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-all duration-300 ${
        isDragging 
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_20px_rgba(199,165,100,0.3)]' 
          : 'border-[#e6e2da] bg-[#fafaf9] hover:border-[var(--accent)] hover:bg-white'
      }`}
      onDragOver={event => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={event => {
        event.preventDefault()
        setIsDragging(false)
      }}
      onDrop={event => {
        event.preventDefault()
        setIsDragging(false)
        if (!event.dataTransfer.files.length) return
        onDrop(event.dataTransfer.files)
      }}
    >
      <input type="file" className="hidden" accept="image/*,.pdf" onChange={onUpload} />
      {floorplanPreview ? (
        <div className="relative h-full w-full min-h-[320px]">
          <NextImage
            src={floorplanPreview}
            alt="Floorplan preview"
            fill
            unoptimized
            className="object-contain p-4"
            sizes="(min-width: 768px) 400px, 100vw"
          />
          <motion.div 
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
          >
            <motion.div 
              className="rounded-lg bg-white px-6 py-3 text-base font-semibold text-[var(--foreground)] shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Click to change
            </motion.div>
          </motion.div>
        </div>
      ) : (
        <motion.div 
          className="flex flex-col items-center gap-5 p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="upload-icon rounded-full bg-[var(--accent-soft)] p-5 transition-all duration-300"
            animate={isDragging ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
            whileHover={{ 
              scale: 1.05,
              filter: "drop-shadow(0 0 8px rgba(199,165,100,0.4))"
            }}
            transition={{ duration: 0.3 }}
          >
            <Upload className="h-10 w-10 text-[var(--accent)]" />
          </motion.div>
          <div className="space-y-2">
            <p className="serif text-xl font-semibold text-[var(--foreground)]">
              {isDragging ? 'Drop your file here' : 'Upload Your Floorplan'}
            </p>
            <p className="text-sm leading-relaxed text-[var(--foreground-subtle)]">
              Drag and drop your file here, or click to browse
            </p>
            <p className="text-xs text-[var(--foreground-subtle)]">
              Supported formats: PDF, PNG, JPG
            </p>
          </div>
        </motion.div>
      )}
    </label>
  )
}
