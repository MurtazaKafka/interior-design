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
    className="upload-zone group relative flex h-32 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[16px] border border-dashed"
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
    <input type="file" className="hidden" accept="image/*" onChange={onUpload} />
    {floorplanPreview ? (
      <NextImage
        src={floorplanPreview}
        alt="Floorplan preview"
        fill
        unoptimized
        className="object-contain"
        sizes="(min-width: 1024px) 420px, 100vw"
      />
    ) : (
      <div className="flex flex-col items-center gap-2 text-center text-[var(--foreground-subtle)]">
        <Upload className="h-6 w-6" />
        <p className="text-sm">Drop a plan or browse</p>
        <p className="text-[0.6rem] uppercase tracking-[0.35em]">PDF · PNG · JPG</p>
      </div>
    )}
  </label>
)
