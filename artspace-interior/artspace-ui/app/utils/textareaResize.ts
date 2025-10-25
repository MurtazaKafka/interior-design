export const textareaResize = (textarea: HTMLTextAreaElement | null) => {
  if (!textarea) return

  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight}px`
}
