// components/ui/Modal.tsx
import React from 'react'
import { Button } from './Button'

interface ModalProps {
    open: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    maxWidth?: 'sm' | 'md' | 'lg'
}

const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
}

export function Modal({ open, onClose, title, children, maxWidth = 'md' }: ModalProps) {
    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-xl shadow-xl w-full ${maxWidths[maxWidth]} p-4 sm:p-6 max-h-[90vh] overflow-y-auto`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg sm:text-xl font-bold">{title}</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        ✕
                    </Button>
                </div>
                {children}
            </div>
        </div>
    )
}