// components/admin/SettingsModal.tsx
import { Settings } from '@/types/admin'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface SettingsModalProps {
    open: boolean
    onClose: () => void
    settings: Settings
    onSave?: (settings: Settings) => void
}

export function SettingsModal({ open, onClose, settings, onSave }: SettingsModalProps) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const newSettings: Settings = {
            washTime: Number(formData.get('washTime')),
            confirmationInterval: Number(formData.get('confirmationInterval')),
            boxCount: Number(formData.get('boxCount')),
            workStart: formData.get('workStart') as string,
            workEnd: formData.get('workEnd') as string,
        }
        onSave?.(newSettings)
    }

    return (
        <Modal open={open} onClose={onClose} title="Настройки">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Время мойки (мин)
                    </label>
                    <input
                        type="number"
                        name="washTime"
                        defaultValue={settings.washTime}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Интервал подтверждения (мин)
                    </label>
                    <input
                        type="number"
                        name="confirmationInterval"
                        defaultValue={settings.confirmationInterval}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Количество боксов
                    </label>
                    <input
                        type="number"
                        name="boxCount"
                        defaultValue={settings.boxCount}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Начало</label>
                        <input
                            type="time"
                            name="workStart"
                            defaultValue={settings.workStart}
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Конец</label>
                        <input
                            type="time"
                            name="workEnd"
                            defaultValue={settings.workEnd}
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>
                </div>

                <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                    <Button type="submit" variant="primary" className="flex-1">
                        Сохранить
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                        Отмена
                    </Button>
                </div>
            </form>
        </Modal>
    )
}