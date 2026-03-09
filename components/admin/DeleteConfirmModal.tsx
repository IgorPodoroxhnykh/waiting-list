// components/admin/DeleteConfirmModal.tsx
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface DeleteConfirmModalProps {
    open: boolean
    onClose: () => void
    clientName: string
    onConfirm: () => void
}

export function DeleteConfirmModal({
    open,
    onClose,
    clientName,
    onConfirm,
}: DeleteConfirmModalProps) {
    return (
        <Modal open={open} onClose={onClose} title="Отменить запись?" maxWidth="sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <svg
                        className="w-5 h-5 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Это действие нельзя отменить</p>
                </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="text-sm text-gray-600">Клиент:</div>
                <div className="font-semibold text-gray-800">{clientName}</div>
            </div>

            <div className="flex gap-2 sm:gap-3">
                <Button variant="danger" className="flex-1" onClick={onConfirm}>
                    Да, отменить
                </Button>
                <Button variant="secondary" className="flex-1" onClick={onClose}>
                    Нет, оставить
                </Button>
            </div>
        </Modal>
    )
}