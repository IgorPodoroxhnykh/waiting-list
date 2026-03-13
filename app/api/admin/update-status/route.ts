// app/api/admin/update-status/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient, QueueEntryStatus, WashStatus, QueueEntrySource } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { getActiveConfig, addMinutes } from '@/lib/scheduler'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

function getPrisma() {
    const connectionString = process.env.DATABASE_URL || ''
    const pool = new pg.Pool({
        connectionString: connectionString + (connectionString.includes('?') ? '&' : '?') + 'sslmode=require',
        ssl: { rejectUnauthorized: false }
    })
    const adapter = new PrismaPg(pool)
    return new PrismaClient({ adapter })
}

export async function POST(request: Request) {
    const prisma = getPrisma()

    try {
        const body = await request.json()
        const { type, id, field, value } = body

        console.log('Received:', { type, id, field, value })

        // ===========================================
        // 1. ОПЛАТА
        // ===========================================
        if (field === 'isPaid') {
            let queueEntryId = id

            // Если type === 'washSession', найдём queueEntryId
            if (type === 'washSession') {
                const session = await prisma.washSession.findUnique({
                    where: { id }
                })
                if (session?.queueEntryId) {
                    queueEntryId = session.queueEntryId
                }
            }

            const entry = await prisma.queueEntry.findUnique({
                where: { id: queueEntryId }
            })

            if (!entry) {
                return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 })
            }

            await prisma.queueEntry.update({
                where: { id: queueEntryId },
                data: { isPaid: value }
            })

            // Также обновляем связанную сессию
            const session = await prisma.washSession.findFirst({
                where: { queueEntryId }
            })

            if (session) {
                await prisma.washSession.update({
                    where: { id: session.id },
                    data: { isPaid: value }
                })
            }

            console.log('Updated isPaid:', value)
            return NextResponse.json({ success: true })
        }

        // ===========================================
        // 2. ПРИБЫЛ
        // ===========================================
        if (field === 'arrived') {
            const entry = await prisma.queueEntry.findUnique({ where: { id } })
            if (!entry) {
                return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 })
            }

            const newStatus = value ? QueueEntryStatus.CHECKED_IN : QueueEntryStatus.CONFIRMED
            await prisma.queueEntry.update({
                where: { id },
                data: {
                    status: newStatus,
                    checkedInAt: value ? new Date() : null
                }
            })

            console.log('Updated arrived:', value, 'status:', newStatus)
            return NextResponse.json({ success: true })
        }

        // ===========================================
        // 3. В РАБОТЕ - перенос из очереди в бокс
        // ===========================================
        if (field === 'inProgress' && value === true) {
            // Находим свободный бокс
            const activeSessions = await prisma.washSession.findMany({
                where: { status: WashStatus.IN_PROGRESS },
                select: { boxId: true }
            })

            const allBoxes = await prisma.box.findMany({
                where: { isActive: true },
                orderBy: { number: 'asc' }
            })

            const busyBoxIds = activeSessions.map(s => s.boxId)
            const freeBox = allBoxes.find(b => !busyBoxIds.includes(b.id))

            if (!freeBox) {
                return NextResponse.json({ error: 'Нет свободных боксов' }, { status: 400 })
            }

            const entry = await prisma.queueEntry.findUnique({
                where: { id }
            })

            if (!entry) {
                return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 })
            }

            console.log('QueueEntry isPaid:', entry.isPaid)

            const now = new Date()

            // Создаём или обновляем сессию
            const existingSession = await prisma.washSession.findFirst({
                where: { queueEntryId: id }
            })

            if (existingSession) {
                await prisma.washSession.update({
                    where: { id: existingSession.id },
                    data: {
                        boxId: freeBox.id,
                        status: WashStatus.IN_PROGRESS,
                        startTime: now,
                        isPaid: existingSession.isPaid || entry.isPaid
                    }
                })
                console.log('Updated existing session')
            } else {
                await prisma.washSession.create({
                    data: {
                        boxId: freeBox.id,
                        clientId: entry.clientId,
                        queueEntryId: id,
                        startTime: now,
                        status: WashStatus.IN_PROGRESS,
                        isWashed: false,
                        isPaid: entry.isPaid
                    }
                })
                console.log('Created new session')
            }

            // Обновляем запись
            await prisma.queueEntry.update({
                where: { id },
                data: {
                    status: QueueEntryStatus.IN_SERVICE,
                    actualStartAt: now,
                    boxId: freeBox.id
                }
            })

            // Логируем событие
            await prisma.eventLog.create({
                data: {
                    type: 'WASH_STARTED',
                    description: 'Начата мойка автомобиля',
                    relatedId: id,
                    relatedType: 'QueueEntry'
                }
            })

            return NextResponse.json({
                success: true,
                boxNumber: freeBox.number
            })
        }

        // ===========================================
        // 4. ПОМЫТ (локальное состояние UI, не сохраняем в БД)
        // ===========================================
        if (field === 'isWashed') {
            console.log('isWashed toggled in UI:', value)
            return NextResponse.json({ success: true })
        }

        // ===========================================
        // 5. ЗАВЕРШИТЬ
        // ===========================================
        if (field === 'complete') {
            let session = null

            if (type === 'washSession') {
                session = await prisma.washSession.findUnique({ where: { id } })
                if (!session) {
                    session = await prisma.washSession.findFirst({
                        where: { queueEntryId: id }
                    })
                }
            } else {
                session = await prisma.washSession.findFirst({
                    where: { queueEntryId: id }
                })
            }

            if (!session) {
                return NextResponse.json({ error: 'Сессия не найдена' }, { status: 404 })
            }

            const now = new Date()
            const duration = Math.round((now.getTime() - session.startTime.getTime()) / 60000)

            // Обновляем сессию
            await prisma.washSession.update({
                where: { id: session.id },
                data: {
                    status: WashStatus.COMPLETED,
                    endTime: now,
                    duration,
                    isWashed: true
                }
            })

            // Обновляем запись
            if (session.queueEntryId) {
                await prisma.queueEntry.update({
                    where: { id: session.queueEntryId },
                    data: {
                        status: QueueEntryStatus.COMPLETED,
                        actualEndAt: now,
                        actualDurationMin: duration
                    }
                })
            }

            // Логируем событие
            await prisma.eventLog.create({
                data: {
                    type: 'WASH_COMPLETED',
                    description: `Мойка завершена за ${duration} мин`,
                    relatedId: session.queueEntryId,
                    relatedType: 'QueueEntry'
                }
            })

            console.log('Wash completed, duration:', duration, 'min')

            // ===========================================
            // АВТОМАТИЧЕСКИЙ ЗАПУСК СЛЕДУЮЩЕГО КЛИЕНТА
            // ===========================================
            const config = await getActiveConfig()

            // Получаем кандидатов на запуск
            const candidates = await prisma.queueEntry.findMany({
                where: {
                    status: { in: [QueueEntryStatus.CHECKED_IN, QueueEntryStatus.CONFIRMED] },
                    plannedStartAt: { lte: addMinutes(now, 30) }
                },
                include: { client: true },
                orderBy: [
                    { priority: 'desc' },
                    { source: 'asc' },
                    { plannedStartAt: 'asc' },
                    { createdAt: 'asc' }
                ]
            })

            // Проверяем, свободен ли бокс
            const boxStillBusy = await prisma.washSession.findFirst({
                where: {
                    boxId: session.boxId,
                    status: WashStatus.IN_PROGRESS
                }
            })

            let autoStarted = null

            if (!boxStillBusy && candidates.length > 0) {
                const nextCandidate = candidates[0]

                // Проверяем grace period для SCHEDULED
                if (nextCandidate.source === QueueEntrySource.SCHEDULED) {
                    const deadline = addMinutes(nextCandidate.plannedStartAt, config.noShowGraceMin)
                    if (now < nextCandidate.plannedStartAt && now < deadline) {
                        // Ещё рано, не запускаем
                        console.log('Next candidate is SCHEDULED but too early')
                    } else {
                        // Запускаем
                        autoStarted = await startNextWash(prisma, nextCandidate, session.boxId, now)
                    }
                } else {
                    // LIVE - запускаем сразу
                    autoStarted = await startNextWash(prisma, nextCandidate, session.boxId, now)
                }
            }

            return NextResponse.json({
                success: true,
                duration,
                autoStarted
            })
        }

        // ===========================================
        // 6. ОТМЕНА
        // ===========================================
        if (field === 'cancel') {
            await prisma.queueEntry.update({
                where: { id },
                data: {
                    status: QueueEntryStatus.CANCELLED
                }
            })

            // Если есть активная сессия - отменяем
            const session = await prisma.washSession.findFirst({
                where: { queueEntryId: id, status: WashStatus.IN_PROGRESS }
            })

            if (session) {
                await prisma.washSession.update({
                    where: { id: session.id },
                    data: {
                        status: WashStatus.CANCELLED,
                        endTime: new Date()
                    }
                })
            }

            console.log('Entry cancelled:', id)
            return NextResponse.json({ success: true })
        }

        // ===========================================
        // 7. ПРИОРИТЕТ
        // ===========================================
        if (field === 'priority') {
            await prisma.queueEntry.update({
                where: { id },
                data: { priority: value }
            })
            console.log('Updated priority:', value)
            return NextResponse.json({ success: true })
        }

        // ===========================================
        // Неизвестное поле
        // ===========================================
        return NextResponse.json({ error: 'Unknown field: ' + field }, { status: 400 })

    } catch (error: unknown) {
        console.error('Error updating status:', error)
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: errMsg }, { status: 500 })
    } finally {
        await prisma.$disconnect()
    }
}

/**
 * Запускает мойку для следующего клиента
 */
async function startNextWash(
    prisma: PrismaClient,
    candidate: any,
    boxId: string,
    now: Date
) {
    // Создаём сессию
    const newSession = await prisma.washSession.create({
        data: {
            boxId: boxId,
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
            boxId: boxId
        }
    })

    // Логируем
    await prisma.eventLog.create({
        data: {
            type: 'WASH_AUTO_STARTED',
            description: `Автозапуск мойки: ${candidate.client?.name}`,
            relatedId: candidate.id,
            relatedType: 'QueueEntry'
        }
    })

    console.log('Auto-started wash for:', candidate.client?.name)

    return {
        entryId: candidate.id,
        sessionId: newSession.id,
        clientName: candidate.client?.name
    }
}