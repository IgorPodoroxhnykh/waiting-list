// components/ui/Checkbox.tsx
interface CheckboxProps {
    checked: boolean
    onClick: () => void
    color?: 'green' | 'blue'
}

export function Checkbox({ checked, onClick, color = 'green' }: CheckboxProps) {
    const colorClass = color === 'green' ? 'green' : 'blue'

    return (
        <div
            className={`flex items-center justify-center w-4 h-4 rounded-full border-2 cursor-pointer transition-all flex-shrink-0 ${checked
                    ? `bg-${colorClass}-500 border-${colorClass}-500`
                    : 'border-gray-300'
                }`}
            onClick={onClick}
        >
            {checked && (
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                    />
                </svg>
            )}
        </div>
    )
}