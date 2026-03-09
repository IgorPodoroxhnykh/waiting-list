// components/admin/AddClientModal.tsx
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface AddClientModalProps {
    open: boolean
    onClose: () => void
    onAdd?: (data: FormData) => void
}

export function AddClientModal({ open, onClose, onAdd }: AddClientModalProps) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        onAdd?.(formData)
    }

    return (
        <Modal open={open} onClose={onClose} title="Добавить клиента">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Тип</label>
                    <select name="type" className="w-full border rounded-lg px-3 py-2">
                        <option value="scheduled">По записи</option>
                        <option value="live">Живая очередь</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                        <input type="date" name="date" className="w-full border rounded-lg px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
                        <input type="time" name="time" className="w-full border rounded-lg px-3 py-2" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                    <input
                        type="text"
                        name="clientName"
                        placeholder="Иван Иванов"
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                    <input
                        type="tel"
                        name="phone"
                        placeholder="+7 999 123-45-67"
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

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Цвет</label>
                    <input
                        type="text"
                        name="carColor"
                        placeholder="Чёрный"
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Гос номер</label>
                    <input
                        type="text"
                        name="carNumber"
                        placeholder="А777АА"
                        className="w-full border rounded-lg px-3 py-2"
                    />
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

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Сумма (₽)</label>
                    <input
                        type="number"
                        name="price"
                        placeholder="1000"
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="isPaid"
                        name="isPaid"
                        className="w-4 h-4 accent-green-600 rounded"
                    />
                    <label htmlFor="isPaid" className="text-sm text-gray-700">
                        Оплачено
                    </label>
                </div>

                <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                    <Button type="submit" variant="primary" className="flex-1">
                        Добавить
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                        Отмена
                    </Button>
                </div>
            </form>
        </Modal>
    )
}