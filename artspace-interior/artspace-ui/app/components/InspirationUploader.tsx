import NextImage from 'next/image'
import { Upload } from 'lucide-react'
import type { ChangeEvent } from 'react'

export type InspirationUploaderProps = {
  previews: string[]
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onDrop: (files: FileList) => void
}

export const InspirationUploader = ({ previews, onUpload, onDrop }: InspirationUploaderProps) => (
  <label
    className="upload-zone group relative flex h-28 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[16px] border border-dashed"
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
    <input type="file" className="hidden" accept="image/*" multiple onChange={onUpload} />
    {previews.length ? (
      <div className="grid h-full w-full grid-cols-4 gap-2 p-3">
        {previews.slice(0, 8).map((preview, index) => (
          <div key={index} className="relative h-14 w-full">
            <NextImage src={preview} alt={`Inspiration ${index + 1}`} fill unoptimized className="object-cover" sizes="(min-width: 1024px) 120px, 25vw" />
          </div>
        ))}
        {previews.length > 8 && (
          <div className="flex h-14 items-center justify-center rounded-[12px] border border-[var(--border-strong)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">
            +{previews.length - 8}
          </div>
        )}
      </div>
    ) : (
      <div className="flex flex-col items-center gap-2 text-center text-[var(--foreground-subtle)]">
        <Upload className="h-6 w-6" />
        <p className="text-sm">Drop references</p>
        <p className="text-[0.6rem] uppercase tracking-[0.35em]">Multiple files</p>
      </div>
    )}
  </label>
)
