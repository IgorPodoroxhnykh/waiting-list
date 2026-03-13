// components/admin/AddClientModal.tsx
'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface AddClientModalProps {
    open: boolean
    onClose: () => void
    onSuccess?: () => void
}

interface TimeSlot {
    start: string
    end: string
    available: boolean
}

interface ETAResult {
    eta: string
    position: number
    waitMinutes: number
    canStartNow: boolean
    exceedsMaxWait: boolean
}

export function AddClientModal({ open, onClose, onSuccess }: AddClientModalProps) {
    const [type, setType] = useState<'scheduled' | 'live'>('scheduled')
    const [loading, setLoading] = useState(false)
    const [eta, setEta] = useState<ETAResult | null>(null)
    const [slots, setSlots] = useState<TimeSlot[]>([])
    const [selectedSlot, setSelectedSlot] = useState<string>('')
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [error, setError] = useState<string>('')

    // Загружаем ETA при выборе живой очереди
    useEffect(() => {
        if (open && type === 'live') {
            fetchETA()
        }
    }, [open, type])

    // Загружаем слоты при выборе даты
    useEffect(() => {
        if (open && type === 'scheduled' && selectedDate) {
            fetchSlots(selectedDate)
        }
    }, [open, type, selectedDate])

    // Устанавливаем сегодняшнюю дату по умолчанию
    useEffect(() => {
        if (open) {
            const today = new Date().toISOString().split('T')[0]
            setSelectedDate(today)
        }
    }, [open])

    const fetchETA = async () => {
        try {
            const response = await fetch('/api/queue/eta')
            const data = await response.json()
            if (data.success) {
                setEta(data.data)
            }
        } catch (err) {
            console.error('Error fetching ETA:', err)
        }
    }

    const fetchSlots = async (date: string) => {
        try {
            const response = await fetch(`/api/queue/slots?date=${date}`)
            const data = await response.json()
            if (data.success) {
                setSlots(data.data.slots)
            }
        } catch (err) {
            console.error('Error fetching slots:', err)
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)

        const data: Record<string, unknown> = {
            name: formData.get('clientName'),
            phone: formData.get('phone'),
            carBrand: formData.get('carBrand'),
            carModel: formData.get('carModel'),
            carColor: formData.get('carColor'),
            carNumber: formData.get('carNumber'),
            services: formData.get('services'),
            source: type.toUpperCase()
        }

        // Для записи по времени добавляем выбранное время
        if (type === 'scheduled' && selectedSlot) {
            data.scheduledTime = selectedSlot
        }

        // Цена и оплата
        const price = formData.get('price')
        if (price) {
            data.price = Number(price)
        }

        const isPaid = formData.get('isPaid')
        if (isPaid === 'on') {
            data.isPaid = true
        }

        try {
            const response = await fetch('/api/queue/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            const result = await response.json()

            if (result.success) {
                onSuccess?.()
                onClose()
                // Сбрасываем форму
                const form = e.target as HTMLFormElement
                form.reset()
                setType('scheduled')
                setSelectedSlot('')
            } else {
                setError(result.error || 'Ошибка при создании записи')

                // Если превышено время ожидания - показываем предложение
                if (result.suggestion) {
                    setError(`${result.error}. ${result.suggestion}`)
                }
            }
        } catch (err) {
            setError('Ошибка соединения')
            console.error('Error adding client:', err)
        } finally {
            setLoading(false)
        }
    }

    // Группируем слоты по часам для удобства отображения
    const groupedSlots = slots.reduce<Record<number, TimeSlot[]>>((acc, slot) => {
        const hour = new Date(slot.start).getHours()
        if (!acc[hour]) acc[hour] = []
        acc[hour].push(slot)
        return acc
    }, {})

    // Доступные слоты
    const availableSlots = slots.filter(s => s.available)

    return (
        <Modal open={open} onClose={onClose} title="Добавить клиента">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                {/* Тип записи */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Тип записи</label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setType('scheduled')}
                            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${type === 'scheduled'
                                    ? 'bg-purple-50 border-purple-400 text-purple-700'
                                    : 'bg-gray-50 border-gray-200 text-gray-600'
                                }`}
                        >
                            📅 По записи
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('live')}
                            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${type === 'live'
                                    ? 'bg-cyan-50 border-cyan-400 text-cyan-700'
                                    : 'bg-gray-50 border-gray-200 text-gray-600'
                                }`}
                        >
                            ⚡ Живая очередь
                        </button>
                    </div>
                </div>

                {/* Информация о ETA для живой очереди */}
                {type === 'live' && eta && (
                    <div className={`p-3 rounded-lg ${eta.exceedsMaxWait
                            ? 'bg-orange-50 border border-orange-200'
                            : 'bg-green-50 border border-green-200'
                        }`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium text-gray-700">
                                    Позиция в очереди: <span className="font-bold">{eta.position}</span>
                                </p>
                                <p className="text-sm text-gray-600">
                                    Ориентировочное время: <span className="font-semibold">
                                        {new Date(eta.eta).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </p>
                                <p className="text-sm text-gray-600">
                                    Ожидание: ~{eta.waitMinutes} мин
                                </p>
                            </div>
                            {eta.canStartNow && (
                                <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
                                    СЕЙЧАС
                                </span>
                            )}
                        </div>
                        {eta.exceedsMaxWait && (
                            <p className="text-xs text-orange-600 mt-2">
                                ⚠️ Время ожидания превышает норму. Рекомендуем записаться на конкретное время.
                            </p>
                        )}
                    </div>
                )}

                {/* Выбор времени для записи */}
                {type === 'scheduled' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full border rounded-lg px-3 py-2"
                            />
                        </div>

                        {selectedDate && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Время ({availableSlots.length} свободных слотов)
                                </label>

                                {slots.length === 0 ? (
                                    <p className="text-gray-500 text-sm py-2">Загрузка...</p>
                                ) : availableSlots.length === 0 ? (
                                    <p className="text-orange-600 text-sm py-2">
                                        Нет свободных слотов на выбранную дату
                                    </p>
                                ) : (
                                    <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-2">
                                        {Object.entries(groupedSlots).map(([hour, hourSlots]) => (
                                            <div key={hour}>
                                                <p className="text-xs text-gray-500 mb-1">{hour}:00</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {hourSlots.map((slot) => {
                                                        const time = new Date(slot.start)
                                                            .toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

                                                        return (
                                                            <button
                                                                key={slot.start}
                                                                type="button"
                                                                disabled={!slot.available}
                                                                onClick={() => setSelectedSlot(slot.start)}
                                                                className={`px-2 py-1 text-xs rounded transition-all ${selectedSlot === slot.start
                                                                        ? 'bg-purple-500 text-white'
                                                                        : slot.available
                                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                    }`}
                                                            >
                                                                {time}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Данные клиента */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Имя <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="clientName"
                            required
                            placeholder="Иван Иванов"
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                        <input
                            type="tel"
                            name="phone"
                            placeholder="+7 999 123-45-67"
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Гос номер <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="carNumber"
                            required
                            placeholder="А777АА"
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Марка</label>
                        <input
                            type="text"
                            name="carBrand"
                            placeholder="Toyota"
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Модель</label>
                        <input
                            type="text"
                            name="carModel"
                            placeholder="Camry"
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Цвет</label>
                        <input
                            type="text"
                            name="carColor"
                            placeholder="Чёрный"
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Услуги</label>
                    <textarea
                        name="services"
                        placeholder="Мойка кузова, коврики..."
                        rows={2}
                        className="w-full border rounded-lg px-3 py-2 resize-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Сумма (₽)</label>
                        <input
                            type="number"
                            name="price"
                            placeholder="1000"
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>
                    <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="isPaid"
                                className="w-4 h-4 accent-green-600 rounded"
                            />
                            <span className="text-sm text-gray-700">Оплачено</span>
                        </label>
                    </div>
                </div>

                {/* Ошибка */}
                {error && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* Кнопки */}
                <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                    <Button
                        type="submit"
                        variant="primary"
                        className="flex-1"
                        disabled={loading || (type === 'scheduled' && !selectedSlot)}
                    >
                        {loading ? 'Добавление...' : 'Добавить'}
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                    >
                        Отмена
                    </Button>
                </div>
            </form>
        </Modal>
    )
}