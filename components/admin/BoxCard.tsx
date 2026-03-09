// components/admin/BoxCard.tsx
'use client'

import { useState, useEffect } from 'react'
import { Box } from '@/types/admin'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'

interface BoxCardProps {
    box: Box
    onWashStatusChange?: (id: number, field: string, value: boolean) => void
    onComplete?: (id: number) => void
}

const statusStyles = {
    free: 'border-green-300 bg-green-50',
    waiting: 'border-gray-200 bg-white',
    occupied: 'border-red-300 bg-red-50',
}

export function BoxCard({ box, onWashStatusChange, onComplete }: BoxCardProps) {
    const [isWashed, setIsWashed] = useState(box.isWashed || false)
    const [isPaid, setIsPaid] = useState(box.isPaid || false)

    useEffect(() => {
        setIsWashed(box.isWashed || false)
        setIsPaid(box.isPaid || false)
    }, [box.isWashed, box.isPaid])

    const isOccupied = box.status === 'occupied'
    const isFree = box.status === 'free'

    const handleWashedChange = (checked: boolean) => {
        setIsWashed(checked)
        onWashStatusChange?.(box.id, 'isWashed', checked)
    }

    const handlePaidChange = (checked: boolean) => {
        setIsPaid(checked)
    }

    return (
        <div
            className={`rounded-xl border-2 p-2 sm:p-3 transition-all ${statusStyles[box.status]} ${isWashed ? 'opacity-60' : ''
                }`}
        >
            <div className="flex justify-between items-start mb-1">
                <span
                    className={`text-base sm:text-lg font-bold ${isFree ? 'text-green-700' : isOccupied ? 'text-red-700' : 'text-gray-700'
                        }`}
                >
                    Бокс {box.number}
                </span>
            </div>

            {box.status !== 'free' ? (
                <div className="space-y-1">
                    <div className="text-xs">
                        <span
                            className={`px-1 py-0.5 rounded ${box.clientType === 'scheduled'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-cyan-100 text-cyan-700'
                                }`}
                        >
                            {box.clientType === 'scheduled' ? 'Запись' : 'Живой'}
                        </span>
                    </div>

                    <div className="font-medium text-gray-800 text-xs sm:text-sm truncate">
                        {box.clientName}
                    </div>
                    <div className="text-xs text-gray-600">
                        {box.carBrand} {box.carModel}
                    </div>
                    <div className="text-xs text-gray-600">{box.carColor}</div>
                    <div className="font-mono text-xs font-semibold">{box.carNumber}</div>
                    <div className="text-xs text-gray-500">
                        {box.startTime} → {box.expectedEndTime}
                    </div>

                    <div className="flex flex-col gap-1 mt-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Сумма:</span>
                            <span className="font-bold text-sm sm:text-base text-green-600">
                                {box.price || 0} ₽
                            </span>
                        </div>
                        <div
                            className={`flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-lg border-2 cursor-pointer transition-all ${isPaid
                                    ? 'bg-green-100 border-green-400 shadow-sm'
                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                }`}
                            onClick={() => handlePaidChange(!isPaid)}
                        >
                            <Checkbox checked={isPaid} onClick={() => handlePaidChange(!isPaid)} />
                            <span
                                className={`text-[10px] sm:text-xs font-semibold ${isPaid ? 'text-green-700' : 'text-gray-400'
                                    }`}
                            >
                                {isPaid ? 'Оплачено' : 'Не оплачено'}
                            </span>
                            {isPaid && <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />}
                        </div>
                    </div>

                    <div className="mt-1">
                        <div
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 cursor-pointer transition-all ${isWashed
                                    ? 'bg-green-100 border-green-400 shadow-sm'
                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                }`}
                            onClick={() => handleWashedChange(!isWashed)}
                        >
                            <Checkbox checked={isWashed} onClick={() => handleWashedChange(!isWashed)} />
                            <span
                                className={`text-xs font-semibold ${isWashed ? 'text-green-700' : 'text-gray-600'
                                    }`}
                            >
                                Помыт
                            </span>
                            {isWashed && (
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse ml-auto" />
                            )}
                        </div>
                    </div>

                    <Button
                        variant="success"
                        size="sm"
                        className="w-full mt-1"
                        onClick={() => onComplete?.(box.id)}
                    >
                        Завершить
                    </Button>
                </div>
            ) : (
                <div className="text-sm text-green-600 font-medium py-2 text-center">Свободен</div>
            )}
        </div>
    )
}