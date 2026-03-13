// components/admin/SettingsModal.tsx
'use client'
import { useState, useEffect } from 'react'
import { Settings } from '@/types/admin'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface SettingsModalProps {
    open: boolean
    onClose: () => void
    settings: Settings
    onSuccess?: () => void
}

export function SettingsModal({ open, onClose, settings, onSuccess }: SettingsModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState<Settings>(settings)

    // Обновляем форму при изменении настроек
    useEffect(() => {
        setFormData(settings)
    }, [settings])

    const handleChange = (field: keyof Settings, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activeBoxesCount: formData.boxCount,
                    defaultDurationMin: formData.washTime,
                    noShowGraceMin: formData.confirmationInterval,
                    workStartHour: parseInt(formData.workStart.split(':')[0] || '8'),
                    workEndHour: parseInt(formData.workEnd.split(':')[0] || '22'),
                })
            })

            const result = await response.json()

            if (result.success) {
                onSuccess?.()
                onClose()
            } else {
                setError(result.error || 'Ошибка сохранения')
            }
        } catch (err) {
            setError('Ошибка соединения')
            console.error('Error saving settings:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal open={open} onClose={onClose} title="Настройки системы">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Время мойки (мин)
                    </label>
                    <input
                        type="number"
                        name="washTime"
                        value={formData.washTime}
                        onChange={(e) => handleChange('washTime', parseInt(e.target.value) || 30)}
                        min={5}
                        max={180}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Базовая длительность мойки одного автомобиля
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Время на опоздание (мин)
                    </label>
                    <input
                        type="number"
                        name="confirmationInterval"
                        value={formData.confirmationInterval}
                        onChange={(e) => handleChange('confirmationInterval', parseInt(e.target.value) || 15)}
                        min={5}
                        max={60}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Сколько минут ждать клиента по записи
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Количество боксов
                    </label>
                    <input
                        type="number"
                        name="boxCount"
                        value={formData.boxCount}
                        onChange={(e) => handleChange('boxCount', parseInt(e.target.value) || 5)}
                        min={1}
                        max={20}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Количество одновременно работающих моек
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Начало работы
                        </label>
                        <input
                            type="time"
                            name="workStart"
                            value={formData.workStart}
                            onChange={(e) => handleChange('workStart', e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Конец работы
                        </label>
                        <input
                            type="time"
                            name="workEnd"
                            value={formData.workEnd}
                            onChange={(e) => handleChange('workEnd', e.target.value)}
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>
                </div>

                {/* Превью изменений */}
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="font-medium text-gray-700 mb-2">Текущие настройки:</div>
                    <div className="grid grid-cols-2 gap-2 text-gray-600">
                        <div>Мойка: <span className="font-medium">{settings.washTime} мин</span></div>
                        <div>→ <span className="font-medium text-blue-600">{formData.washTime} мин</span></div>
                        <div>Боксы: <span className="font-medium">{settings.boxCount}</span></div>
                        <div>→ <span className="font-medium text-blue-600">{formData.boxCount}</span></div>
                        <div>Режим: <span className="font-medium">{settings.workStart}—{settings.workEnd}</span></div>
                        <div>→ <span className="font-medium text-blue-600">{formData.workStart}—{formData.workEnd}</span></div>
                    </div>
                </div>

                {/* Ошибка */}
                {error && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                    <Button
                        type="submit"
                        variant="primary"
                        className="flex-1"
                        disabled={loading}
                    >
                        {loading ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Отмена
                    </Button>
                </div>
            </form>
        </Modal>
    )
}