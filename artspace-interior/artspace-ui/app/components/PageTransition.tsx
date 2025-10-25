import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'

type PageTransitionProps = {
  children: ReactNode
  isVisible: boolean
}

export const PageTransition = ({ children, isVisible }: PageTransitionProps) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
)
