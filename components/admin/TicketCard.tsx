// components/admin/TicketCard.tsx
import { Ticket, TicketType } from '@/types/admin'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'

interface TicketCardProps {
    ticket: Ticket
    onStatusChange?: (id: number, type: TicketType, field: string, value: boolean) => void
    onStartWash?: (id: number, type: TicketType) => void
    onEdit?: (id: number, type: TicketType) => void
    onCancel?: (id: number, type: TicketType) => void
}

export function TicketCard({
    ticket,
    onStatusChange,
    onStartWash,
    onEdit,
    onCancel,
}: TicketCardProps) {
    const ticketType: TicketType = ticket.type === 'scheduled' ? 'appointment' : 'liveQueue'

    // Проверяем изменилось ли время
    const hasTimeShift = ticket.estimatedStartTime && ticket.estimatedStartTime !== ticket.time

    // Определяем направление изменения времени
    const isDelayed = hasTimeShift && isTimeLater(ticket.estimatedStartTime!, ticket.time)
    const isFaster = hasTimeShift && !isDelayed

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ticket.type === 'scheduled' ? 'bg-purple-100' : 'bg-orange-100'
                            }`}
                    >
                        {ticket.type === 'scheduled' ? (
                            <span className="text-purple-600 font-bold text-xs">З</span>
                        ) : (
                            <span className="text-orange-600 font-bold text-sm">#{ticket.position}</span>
                        )}
                    </div>
                    <div>
                        <div className="font-medium text-gray-800 text-sm">{ticket.clientName}</div>
                        <div className="text-xs text-gray-500">{ticket.phone}</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-mono font-semibold text-sm">{ticket.time}</div>
                    {hasTimeShift ? (
                        <div className={`text-xs font-medium ${isDelayed ? 'text-red-600' : 'text-blue-600'}`}>
                            → ~{ticket.estimatedStartTime}
                        </div>
                    ) : (
                        <div className="text-xs text-gray-500">
                            {ticket.type === 'scheduled' ? 'запись' : 'прибыл'}
                        </div>
                    )}
                </div>
            </div>

            {/* Предупреждение о смене времени */}
            {isDelayed && (
                <div className="bg-red-50 border border-red-200 rounded-md p-2 mb-2">
                    <div className="text-xs text-red-700">
                        ⚠️ Время увеличено: очередь движется медленнее
                    </div>
                </div>
            )}
            {isFaster && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-2">
                    <div className="text-xs text-blue-700">
                        ⏱ Время скорректировано: очередь движется быстрее
                    </div>
                </div>
            )}

            <div className="bg-gray-50 rounded-md p-2 mb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-gray-800">
                            {ticket.carBrand} {ticket.carModel}
                        </div>
                        <div className="text-xs text-gray-500">{ticket.carColor}</div>
                    </div>
                    <div className="font-mono font-bold text-sm bg-white px-2 py-1 rounded border">
                        {ticket.carNumber}
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 rounded-md p-2 mb-2">
                <div className="text-xs text-gray-500 mb-1">Услуги</div>
                <div className="text-sm text-gray-800">{ticket.services || 'Не указано'}</div>
            </div>

            <div className="flex items-center justify-between bg-green-50 rounded-md p-2 mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Сумма:</span>
                    <span className="font-bold text-lg text-green-600">{ticket.price} ₽</span>
                </div>
                <div
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 transition-all cursor-pointer ${ticket.isPaid
                            ? 'bg-green-100 border-green-400 shadow-sm'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                    onClick={() => onStatusChange?.(ticket.id, ticketType, 'isPaid', !ticket.isPaid)}
                >
                    <Checkbox
                        checked={ticket.isPaid}
                        onClick={() => onStatusChange?.(ticket.id, ticketType, 'isPaid', !ticket.isPaid)}
                    />
                    <span
                        className={`text-xs font-semibold ${ticket.isPaid ? 'text-green-700' : 'text-gray-400'
                            }`}
                    >
                        {ticket.isPaid ? 'Оплачено' : 'Не оплачено'}
                    </span>
                    {ticket.isPaid && (
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between mb-2">
                <div className="flex gap-2">
                    <div
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 transition-all cursor-pointer ${ticket.arrived
                                ? 'bg-green-100 border-green-400 shadow-sm'
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                            }`}
                        onClick={() => onStatusChange?.(ticket.id, ticketType, 'arrived', !ticket.arrived)}
                    >
                        <Checkbox
                            checked={ticket.arrived}
                            onClick={() => onStatusChange?.(ticket.id, ticketType, 'arrived', !ticket.arrived)}
                        />
                        <span
                            className={`text-xs font-semibold ${ticket.arrived ? 'text-green-700' : 'text-gray-400'
                                }`}
                        >
                            Прибыл
                        </span>
                        {ticket.arrived && (
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        )}
                    </div>
                    {ticket.arrived && (
                        <div
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 transition-all cursor-pointer ${ticket.inProgress
                                    ? 'bg-blue-100 border-blue-400 shadow-sm'
                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                }`}
                            onClick={() => onStartWash?.(ticket.id, ticketType)}
                        >
                            <Checkbox
                                checked={ticket.inProgress}
                                onClick={() => onStartWash?.(ticket.id, ticketType)}
                                color="blue"
                            />
                            <span
                                className={`text-xs font-semibold ${ticket.inProgress ? 'text-blue-700' : 'text-gray-400'
                                    }`}
                            >
                                В работе
                            </span>
                            {ticket.inProgress && (
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            )}
                        </div>
                    )}
                </div>
                {ticket.boxNumber && (
                    <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-sm font-bold">
                        Бокс {ticket.boxNumber}
                    </div>
                )}
            </div>

            {!ticket.completed && (
                <div className="flex gap-2">
                    <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => onEdit?.(ticket.id, ticketType)}
                    >
                        Изменить
                    </Button>
                    <Button
                        variant="danger"
                        size="sm"
                        className="flex-1"
                        onClick={() => onCancel?.(ticket.id, ticketType)}
                    >
                        Отменить
                    </Button>
                </div>
            )}
        </div>
    )
}

/**
 * Сравнивает два времени в формате "HH:MM"
 * Возвращает true, если time1 позже time2
 */
function isTimeLater(time1: string, time2: string): boolean {
    const parseTime = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number)
        return hours * 60 + minutes
    }

    return parseTime(time1) > parseTime(time2)
}