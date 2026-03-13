// app/api/queue/join/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { QueueEntrySource, QueueEntryStatus } from '@prisma/client'
import { calculateETA, getActiveConfig, isSlotAvailable } from '@/lib/scheduler'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            // Данные клиента
            name,
            phone,
            carBrand,
            carModel,
            carColor,
            carNumber,
            // Параметры записи
            source, // 'LIVE' | 'SCHEDULED'
            scheduledTime, // для SCHEDULED
            services,
            duration: customDuration
        } = body

        if (!name || !carNumber) {
            return NextResponse.json(
                { error: 'Имя и номер машины обязательны' },
                { status: 400 }
            )
        }

        const config = await getActiveConfig()
        const duration = customDuration ?? config.defaultDurationMin

        // Создаём или находим клиента
        let client = await prisma.client.findFirst({
            where: {
                OR: [
                    { phone: phone || undefined },
                    { carNumber: carNumber }
                ]
            }
        })

        if (client) {
            // Обновляем данные клиента
            client = await prisma.client.update({
                where: { id: client.id },
                data: {
                    name,
                    phone: phone ?? client.phone,
                    carBrand: carBrand ?? client.carBrand,
                    carModel: carModel ?? client.carModel,
                    carColor: carColor ?? client.carColor,
                    carNumber
                }
            })
        } else {
            // Создаём нового клиента
            client = await prisma.client.create({
                data: {
                    name,
                    phone,
                    carBrand,
                    carModel,
                    carColor,
                    carNumber
                }
            })
        }

        let plannedStartAt: Date
        let plannedEndAt: Date

        if (source === 'SCHEDULED' && scheduledTime) {
            // Запись на конкретное время
            plannedStartAt = new Date(scheduledTime)
            plannedEndAt = new Date(plannedStartAt.getTime() + duration * 60 * 1000)

            // Проверяем доступность слота
            const available = await isSlotAvailable(plannedStartAt, duration)
            if (!available) {
                return NextResponse.json(
                    { error: 'Выбранное время недоступно' },
                    { status: 400 }
                )
            }
        } else {
            // Живая очередь - вычисляем ближайшее время
            const eta = await calculateETA()
            plannedStartAt = eta.eta
            plannedEndAt = new Date(plannedStartAt.getTime() + duration * 60 * 1000)

            // Проверяем максимальное ожидание
            if (eta.exceedsMaxWait) {
                return NextResponse.json(
                    {
                        error: 'Время ожидания превышает максимально допустимое',
                        waitMinutes: eta.waitMinutes,
                        maxWait: config.liveQueueMaxWaitMin,
                        suggestion: 'Рекомендуем записаться на конкретное время'
                    },
                    { status: 400 }
                )
            }
        }

        // Создаём запись в очереди
        const entry = await prisma.queueEntry.create({
            data: {
                clientId: client.id,
                source: source === 'SCHEDULED' ? QueueEntrySource.SCHEDULED : QueueEntrySource.LIVE,
                status: QueueEntryStatus.CREATED,
                plannedStartAt,
                plannedEndAt,
                estimatedDurationMin: duration,
                checkinDeadlineAt: new Date(
                    plannedStartAt.getTime() + config.noShowGraceMin * 60 * 1000
                ),
                services,
                isPaid: false
            },
            include: { client: true }
        })

        // Логируем событие
        await prisma.eventLog.create({
            data: {
                type: source === 'SCHEDULED' ? 'APPOINTMENT_CREATED' : 'LIVE_QUEUE_JOINED',
                description: `Создана запись: ${client.name}, ${carNumber}`,
                relatedId: entry.id,
                relatedType: 'QueueEntry'
            }
        })

        return NextResponse.json({
            success: true,
            data: {
                id: entry.id,
                plannedStartAt: entry.plannedStartAt.toISOString(),
                plannedEndAt: entry.plannedEndAt.toISOString(),
                status: entry.status,
                client: {
                    id: client.id,
                    name: client.name
                }
            }
        })
    } catch (error) {
        console.error('Error joining queue:', error)
        return NextResponse.json(
            { error: 'Failed to join queue' },
            { status: 500 }
        )
    }
}