// components/admin/EditClientModal.tsx
import { Ticket } from '@/types/admin'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface EditClientModalProps {
    open: boolean
    onClose: () => void
    ticket: Ticket | null
    onSave?: (data: Partial<Ticket>) => void
}

export function EditClientModal({ open, onClose, ticket, onSave }: EditClientModalProps) {
    if (!ticket) return null

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const data: Partial<Ticket> = {
            type: formData.get('type') as 'scheduled' | 'live',
            time: `${formData.get('date')} ${formData.get('time')}`,
            clientName: formData.get('clientName') as string,
            phone: formData.get('phone') as string,
            carBrand: formData.get('carBrand') as string,
            carModel: formData.get('carModel') as string,
            carColor: formData.get('carColor') as string,
            carNumber: formData.get('carNumber') as string,
            services: formData.get('services') as string,
            price: Number(formData.get('price')),
            isPaid: formData.get('isPaid') === 'on',
        }
        onSave?.(data)
    }

    const [date, time] = ticket.time.split(' ')

    return (
        <Modal open={open} onClose={onClose} title="Редактировать клиента">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Тип</label>
                    <select
                        name="type"
                        defaultValue={ticket.type}
                        className="w-full border rounded-lg px-3 py-2"
                    >
                        <option value="scheduled">По записи</option>
                        <option value="live">Живая очередь</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                        <input
                            type="date"
                            name="date"
                            defaultValue={date}
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
                        <input
                            type="time"
                            name="time"
                            defaultValue={time || ticket.time}
                            className="w-full border rounded-lg px-3 py-2"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                    <input
                        type="text"
                        name="clientName"
                        defaultValue={ticket.clientName}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                    <input
                        type="tel"
                        name="phone"
                        defaultValue={ticket.phone}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Марка</label>
                    <input
                        type="text"
                        name="carBrand"
                        defaultValue={ticket.carBrand}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Модель</label>
                    <input
                        type="text"
                        name="carModel"
                        defaultValue={ticket.carModel}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Цвет</label>
                    <input
                        type="text"
                        name="carColor"
                        defaultValue={ticket.carColor}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Гос номер</label>
                    <input
                        type="text"
                        name="carNumber"
                        defaultValue={ticket.carNumber}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Услуги</label>
                    <textarea
                        name="services"
                        defaultValue={ticket.services}
                        rows={2}
                        className="w-full border rounded-lg px-3 py-2 resize-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Сумма (₽)</label>
                    <input
                        type="number"
                        name="price"
                        defaultValue={ticket.price}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="editIsPaid"
                        name="isPaid"
                        defaultChecked={ticket.isPaid}
                        className="w-4 h-4 accent-green-600 rounded"
                    />
                    <label htmlFor="editIsPaid" className="text-sm text-gray-700">
                        Оплачено
                    </label>
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