// app/api/admin/replan/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { QueueEntryStatus, QueueEntrySource, WashStatus } from '@prisma/client'
import { getActiveConfig, addMinutes } from '@/lib/scheduler'

/**
 * Пересчёт очереди при изменении обстоятельств:
 * - Завершилась мойка раньше/позже
 * - Изменились настройки
 * - Клиент не явился
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { reason, boxId } = body

        const config = await getActiveConfig()
        const now = new Date()

        // Получаем кандидатов на запуск
        const candidates = await prisma.queueEntry.findMany({
            where: {
                status: { in: [QueueEntryStatus.CHECKED_IN, QueueEntryStatus.CONFIRMED] },
                plannedStartAt: { lte: addMinutes(now, 30) }
            },
            include: { client: true, box: true },
            orderBy: [
                { priority: 'desc' },
                { source: 'asc' }, // SCHEDULED раньше LIVE
                { plannedStartAt: 'asc' },
                { createdAt: 'asc' }
            ]
        })

        // Получаем свободные боксы
        const activeSessions = await prisma.washSession.findMany({
            where: { status: WashStatus.IN_PROGRESS },
            select: { boxId: true }
        })
        const busyBoxIds = activeSessions.map(s => s.boxId)

        const freeBoxes = await prisma.box.findMany({
            where: {
                isActive: true,
                id: boxId ? { equals: boxId, notIn: busyBoxIds } : { notIn: busyBoxIds }
            }
        })

        const results = []

        // Распределяем кандидатов по свободным боксам
        for (const box of freeBoxes) {
            // Ищем подходящего кандидата
            for (const candidate of candidates) {
                // Проверяем: если SCHEDULED, то время должно наступить или быть в grace period
                if (candidate.source === QueueEntrySource.SCHEDULED) {
                    const deadline = addMinutes(candidate.plannedStartAt, config.noShowGraceMin)
                    if (now < candidate.plannedStartAt && now < deadline) {
                        continue // Ещё рано
                    }
                }

                // Запускаем мойку
                const session = await prisma.washSession.create({
                    data: {
                        boxId: box.id,
                        clientId: candidate.clientId,
                        queueEntryId: candidate.id,
                        startTime: now,
                        status: WashStatus.IN_PROGRESS,
                        isWashed: false,
                        isPaid: candidate.isPaid
                    }
                })

                // Обновляем статус записи
                await prisma.queueEntry.update({
                    where: { id: candidate.id },
                    data: {
                        status: QueueEntryStatus.IN_SERVICE,
                        actualStartAt: now,
                        boxId: box.id
                    }
                })

                // Логируем
                await prisma.eventLog.create({
                    data: {
                        type: 'WASH_AUTO_STARTED',
                        description: `Автозапуск мойки: ${candidate.client?.name}, бокс ${box.number}`,
                        relatedId: candidate.id,
                        relatedType: 'QueueEntry'
                    }
                })

                results.push({
                    entryId: candidate.id,
                    sessionId: session.id,
                    boxNumber: box.number,
                    clientName: candidate.client?.name
                })

                // Убираем из кандидатов
                candidates.splice(candidates.indexOf(candidate), 1)
                break
            }
        }

        return NextResponse.json({
            success: true,
            started: results.length,
            sessions: results
        })
    } catch (error) {
        console.error('Error replanning:', error)
        return NextResponse.json(
            { error: 'Failed to replan queue' },
            { status: 500 }
        )
    }
}