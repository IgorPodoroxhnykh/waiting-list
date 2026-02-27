"use client"

import type { QueueTicket } from '@/types/queue'

interface QueueTicketProps {
    ticket: QueueTicket
}

export function QueueTicket({ ticket }: QueueTicketProps) {
    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="max-w-sm mx-auto bg-[#f5f0e6] rounded-sm shadow-lg overflow-hidden">
            {/* Header - имитация печати */}
            <div className="px-6 py-4 border-b-2 border-dashed border-gray-400">
                <h2 className="text-2xl font-bold text-center text-gray-800">
                    {process.env.NEXT_PUBLIC_CAR_WASH_NAME || 'АВТОМОЙКА'}
                </h2>
                <p className="text-center text-gray-600 text-sm mt-1">
                    {process.env.NEXT_PUBLIC_CAR_WASH_ADDRESS || 'Адрес: укажите в .env'}
                </p>
            </div>

            {/* Номер очереди - большой */}
            <div className="py-8 text-center border-b-2 border-dashed border-gray-400">
                <div className="text-gray-600 text-sm uppercase tracking-wider">Талон №</div>
                <div className="text-7xl font-bold text-gray-800 mt-2">
                    {String(ticket.position).padStart(3, '0')}
                </div>
            </div>

            {/* Детали - таблица */}
            <div className="p-4 space-y-0">
                <table className="w-full text-sm">
                    <tbody>
                        <tr className="border-b border-gray-300">
                            <td className="py-3 text-gray-600">Перед вами</td>
                            <td className="py-3 text-right font-bold text-gray-800">
                                {ticket.totalInQueue - ticket.position} чел.
                            </td>
                        </tr>
                        <tr className="border-b border-gray-300">
                            <td className="py-3 text-gray-600">Ожидание</td>
                            <td className="py-3 text-right font-bold text-gray-800">
                                ~{ticket.waitTimeMinutes} мин
                            </td>
                        </tr>
                        <tr className="border-b border-gray-300">
                            <td className="py-3 text-gray-600">Прибыть до</td>
                            <td className="py-3 text-right font-bold text-red-700">
                                {formatTime(ticket.arriveBy)}
                            </td>
                        </tr>
                        <tr className="border-b border-gray-300">
                            <td className="py-3 text-gray-600">Услуга</td>
                            <td className="py-3 text-right font-medium text-gray-800">
                                {ticket.serviceName}
                            </td>
                        </tr>
                        <tr>
                            <td className="py-3 text-gray-600">Авто</td>
                            <td className="py-3 text-right font-medium text-gray-800">
                                {ticket.carInfo}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="px-4 pb-4 text-center">
                <p className="text-xs text-gray-500">
                    Сохраните талон до окончания очереди
                </p>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                    ID: {ticket.id}
                </p>
            </div>

            {/* Отрывная линия */}
            <div className="border-t-2 border-dashed border-gray-400 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#f5f0e6] rounded-full border-2 border-gray-400"></div>
            </div>

            {/* Корешок */}
            <div className="px-6 py-3 bg-[#e8e3d4]">
                <div className="text-xs text-gray-500 text-center">
                    Корешок №{ticket.id}
                </div>
            </div>
        </div>
    )
}



