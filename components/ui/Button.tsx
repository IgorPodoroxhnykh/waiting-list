// components/ui/Button.tsx
import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'success' | 'danger' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
}

const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
}

const sizes = {
    sm: 'px-2 py-1 text-xs rounded-md',
    md: 'px-3 py-1.5 text-sm rounded-lg',
    lg: 'px-4 py-2 text-base rounded-lg',
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    ...props
}: ButtonProps) {
    return (
        <button
            className={`font-medium transition-colors inline-flex items-center justify-center ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    )
}