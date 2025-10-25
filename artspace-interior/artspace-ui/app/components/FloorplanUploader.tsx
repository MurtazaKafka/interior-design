import NextImage from 'next/image'
import { Upload } from 'lucide-react'
import type { ChangeEvent } from 'react'

export type FloorplanUploaderProps = {
  floorplanPreview: string
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onDrop: (files: FileList) => void
}

export const FloorplanUploader = ({ floorplanPreview, onUpload, onDrop }: FloorplanUploaderProps) => (
  <label
    className="upload-zone group relative flex min-h-[320px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden"
    onDragOver={event => {
      event.preventDefault()
      event.currentTarget.classList.add('active')
    }}
    onDragLeave={event => {
      event.currentTarget.classList.remove('active')
    }}
    onDrop={event => {
      event.preventDefault()
      event.currentTarget.classList.remove('active')
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
          className="object-contain"
          sizes="(min-width: 1024px) 420px, 100vw"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="rounded-lg bg-white px-5 py-2.5 text-base font-medium text-black shadow-sm">
            Click to change
          </div>
        </div>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-8 p-8 text-center">
        <div className="rounded-full bg-[var(--accent-soft)] p-5">
          <Upload className="h-10 w-10 text-[var(--accent)]" />
        </div>
        <div className="space-y-2">
          <p className="text-xl font-medium">Upload Your Floorplan</p>
          <p className="text-base text-[var(--foreground-subtle)]">
            Drag and drop your file here, or click to browse
          </p>
          <p className="text-sm text-[var(--foreground-subtle)]">
            Supported formats: PDF, PNG, JPG
          </p>
        </div>
      </div>
    )}
  </label>
)
