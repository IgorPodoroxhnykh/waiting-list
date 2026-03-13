// app/api/admin/data/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { QueueEntrySource, QueueEntryStatus, WashStatus } from '@prisma/client'

/**
 * Расчёт ETA для конкретной записи в очереди
 */
async function calculateEntryETA(
    entryId: string,
    config: {
        activeBoxesCount: number
        defaultDurationMin: number
    } | null
): Promise<{ eta: Date; position: number } | null> {
    const now = new Date()
    const defaultDuration = config?.defaultDurationMin ?? 30

    // Получаем саму запись
    const entry = await prisma.queueEntry.findUnique({
        where: { id: entryId }
    })

    if (!entry) return null

    // Если запись уже в работе - возвращаем её время старта
    if (entry.status === QueueEntryStatus.IN_SERVICE) {
        return { eta: entry.actualStartAt ?? entry.plannedStartAt, position: 0 }
    }

    // Если запись завершена или отменена
    if (
        entry.status === QueueEntryStatus.COMPLETED ||
        entry.status === QueueEntryStatus.CANCELLED ||
        entry.status === QueueEntryStatus.NO_SHOW
    ) {
        return null
    }

    // Получаем активные мойки
    const activeSessions = await prisma.washSession.findMany({
        where: { status: WashStatus.IN_PROGRESS }
    })

    // Получаем все ожидающие записи
    const waitingEntries = await prisma.queueEntry.findMany({
        where: {
            status: { in: [QueueEntryStatus.CREATED, QueueEntryStatus.CONFIRMED, QueueEntryStatus.CHECKED_IN] }
        },
        orderBy: [
            { priority: 'desc' },
            { source: 'asc' }, // SCHEDULED раньше LIVE
            { plannedStartAt: 'asc' },
            { createdAt: 'asc' }
        ]
    })

    // Наша позиция в очереди
    const myIndex = waitingEntries.findIndex((e) => e.id === entryId)
    const position = myIndex >= 0 ? myIndex + 1 : 0

    // Инициализируем каналы (время освобождения боксов)
    const channels: Date[] = []

    // Все активные боксы
    const allBoxes = await prisma.box.findMany({ where: { isActive: true } })
    const busyBoxIds = activeSessions.map((s) => s.boxId)
    const freeBoxesCount = Math.max(0, allBoxes.length - busyBoxIds.length)

    // Свободные сейчас
    for (let i = 0; i < freeBoxesCount; i++) {
        channels.push(now)
    }

    // Занятые - время окончания
    for (const session of activeSessions) {
        const duration = session.duration ?? defaultDuration
        const endTime = new Date(session.startTime.getTime() + duration * 60 * 1000)
        channels.push(endTime)
    }

    // Сортируем по времени освобождения
    channels.sort((a, b) => a.getTime() - b.getTime())

    // Получаем будущие записи для проверки конфликтов
    const horizon = new Date(now.getTime() + 4 * 60 * 60 * 1000) // 4 часа вперёд
    const upcomingScheduled = await prisma.queueEntry.findMany({
        where: {
            source: QueueEntrySource.SCHEDULED,
            status: { in: [QueueEntryStatus.CONFIRMED, QueueEntryStatus.CHECKED_IN] },
            plannedStartAt: { gte: now, lte: horizon }
        },
        orderBy: { plannedStartAt: 'asc' }
    })

    // Распределяем очередь перед нами
    const entriesBeforeMe = waitingEntries.slice(0, myIndex)

    for (const e of entriesBeforeMe) {
        if (channels.length === 0) break

        const earliestChannel = channels.shift()!
        const clientStart = earliestChannel > now ? earliestChannel : now
        const duration = e.estimatedDurationMin ?? defaultDuration
        let clientEnd = new Date(clientStart.getTime() + duration * 60 * 1000)

        // Проверяем конфликты с записями
        for (const scheduled of upcomingScheduled) {
            const scheduledEnd = scheduled.plannedEndAt ??
                new Date(scheduled.plannedStartAt.getTime() + (scheduled.estimatedDurationMin ?? defaultDuration) * 60 * 1000)

            // Если пересекается
            if (clientStart < scheduledEnd && scheduled.plannedStartAt < clientEnd) {
                clientEnd = scheduledEnd
            }
        }

        channels.push(clientEnd)
        channels.sort((a, b) => a.getTime() - b.getTime())
    }

    // Наше время
    if (channels.length === 0) {
        // Нет доступных каналов - используем время записи
        return { eta: entry.plannedStartAt, position }
    }

    let eta = channels.shift()!
    if (eta < now) eta = now

    // Для SCHEDULED проверяем, не раньше ли нашего времени
    if (entry.source === QueueEntrySource.SCHEDULED && eta < entry.plannedStartAt) {
        // Проверяем grace period
        const gracePeriod = config?.defaultDurationMin ? 5 : 15 // минут до записи
        const canStartEarly = now >= new Date(entry.plannedStartAt.getTime() - gracePeriod * 60 * 1000)

        if (!canStartEarly) {
            eta = entry.plannedStartAt
        }
    }

    return { eta, position }
}

export async function GET() {
    try {
        // ===========================================
        // КОНФИГУРАЦИЯ
        // ===========================================
        const config = await prisma.systemConfig.findFirst({
            where: { effectiveFrom: { lte: new Date() } },
            orderBy: { effectiveFrom: 'desc' }
        })

        const configData = {
            activeBoxesCount: config?.activeBoxesCount ?? 5,
            defaultDurationMin: config?.defaultDurationMin ?? 30,
            liveQueueMaxWaitMin: config?.liveQueueMaxWaitMin ?? 120,
            noShowGraceMin: config?.noShowGraceMin ?? 15,
            slotStepMin: config?.slotStepMin ?? 5,
            workStartHour: config?.workStartHour ?? 8,
            workEndHour: config?.workEndHour ?? 22
        }

        // ===========================================
        // БОКСЫ
        // ===========================================
        const boxes = await prisma.box.findMany({
            where: { isActive: true },
            include: {
                washSessions: {
                    where: { status: WashStatus.IN_PROGRESS },
                    include: {
                        client: true,
                        queueEntry: true
                    }
                },
                queueEntries: {
                    where: { status: QueueEntryStatus.IN_SERVICE }
                }
            },
            orderBy: { number: 'asc' }
        })

        // ===========================================
        // ЗАПИСИ В ОЧЕРЕДИ (БЕЗ IN_SERVICE)
        // ===========================================
        const waitingStatuses = [
            QueueEntryStatus.CREATED,
            QueueEntryStatus.CONFIRMED,
            QueueEntryStatus.CHECKED_IN
        ]

        const queueEntries = await prisma.queueEntry.findMany({
            where: { status: { in: waitingStatuses } },
            include: {
                client: true,
                box: true
            },
            orderBy: [
                { priority: 'desc' },
                { plannedStartAt: 'asc' }
            ]
        })

        // Разделяем на категории для UI
        const scheduled = queueEntries.filter((e) => e.source === QueueEntrySource.SCHEDULED)
        const live = queueEntries.filter((e) => e.source === QueueEntrySource.LIVE)
        const adminCreated = queueEntries.filter((e) => e.source === QueueEntrySource.ADMIN)

        // ===========================================
        // ФОРМАТИРОВАНИЕ ДАННЫХ
        // ===========================================

        // Форматируем боксы
        const formattedBoxes = boxes.map((box) => {
            const activeSession = box.washSessions[0]
            const activeEntry = box.queueEntries[0]

            let status: 'free' | 'occupied' = 'free'
            let clientName: string | undefined
            let carBrand: string | undefined
            let carModel: string | undefined
            let carColor: string | undefined
            let carNumber: string | undefined
            let startTime: string | undefined
            let expectedEndTime: string | undefined
            let isWashed: boolean | undefined
            let price: number | undefined
            let isPaid: boolean | undefined
            let source: 'live' | 'scheduled' | 'admin' | undefined
            let queueEntryId: string | undefined

            if (activeSession || activeEntry) {
                status = 'occupied'

                const client = activeSession?.client
                const entry = activeSession?.queueEntry || activeEntry

                clientName = client?.name
                carBrand = client?.carBrand || ''
                carModel = client?.carModel || ''
                carColor = client?.carColor || ''
                carNumber = client?.carNumber || ''

                if (entry) {
                    queueEntryId = entry.id
                    price = entry.price ?? 0
                    isPaid = entry.isPaid
                    source = entry.source.toLowerCase() as 'live' | 'scheduled' | 'admin'

                    if (entry.actualStartAt || entry.plannedStartAt) {
                        const start = entry.actualStartAt || entry.plannedStartAt
                        startTime = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                        const end = new Date(start.getTime() + (entry.estimatedDurationMin || configData.defaultDurationMin) * 60000)
                        expectedEndTime = end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                    }
                }

                if (activeSession) {
                    isWashed = activeSession.isWashed
                }
            }

            return {
                id: box.id,
                number: box.number,
                status,
                clientName,
                carBrand,
                carModel,
                carColor,
                carNumber,
                startTime,
                expectedEndTime,
                isWashed,
                price,
                isPaid,
                source,
                queueEntryId
            }
        })

        // Форматируем записи по времени (SCHEDULED) с расчётом ETA
        const formattedScheduled = await Promise.all(
            scheduled.map(async (entry) => {
                const etaResult = await calculateEntryETA(entry.id, configData)

                return {
                    id: entry.id,
                    type: 'scheduled' as const,
                    time: entry.plannedStartAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                    estimatedStartTime: etaResult?.eta.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                    position: etaResult?.position,
                    clientName: entry.client?.name ?? '',
                    phone: entry.client?.phone ?? '',
                    carBrand: entry.client?.carBrand ?? '',
                    carModel: entry.client?.carModel ?? '',
                    carColor: entry.client?.carColor ?? '',
                    carNumber: entry.client?.carNumber ?? '',
                    services: entry.services ?? '',
                    price: entry.price ?? 0,
                    isPaid: entry.isPaid,
                    status: entry.status,
                    priority: entry.priority,
                    notes: entry.notes,
                    arrived: entry.status === QueueEntryStatus.CHECKED_IN,
                    inProgress: false,
                    completed: false,
                    boxNumber: entry.box?.number
                }
            })
        )

        // Форматируем живую очередь (LIVE) с расчётом ETA
        const formattedLive = await Promise.all(
            live.map(async (entry, index) => {
                const etaResult = await calculateEntryETA(entry.id, configData)

                return {
                    id: entry.id,
                    type: 'live' as const,
                    time: entry.plannedStartAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                    estimatedStartTime: etaResult?.eta.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                    position: etaResult?.position ?? index + 1,
                    clientName: entry.client?.name ?? '',
                    phone: entry.client?.phone ?? '',
                    carBrand: entry.client?.carBrand ?? '',
                    carModel: entry.client?.carModel ?? '',
                    carColor: entry.client?.carColor ?? '',
                    carNumber: entry.client?.carNumber ?? '',
                    services: entry.services ?? '',
                    price: entry.price ?? 0,
                    isPaid: entry.isPaid,
                    status: entry.status,
                    priority: entry.priority,
                    arrived: entry.status === QueueEntryStatus.CHECKED_IN,
                    inProgress: false,
                    completed: false,
                    boxNumber: entry.box?.number
                }
            })
        )

        // Форматируем админские записи с расчётом ETA
        const formattedAdmin = await Promise.all(
            adminCreated.map(async (entry) => {
                const etaResult = await calculateEntryETA(entry.id, configData)

                return {
                    id: entry.id,
                    type: 'admin' as const,
                    time: entry.plannedStartAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                    estimatedStartTime: etaResult?.eta.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                    position: etaResult?.position,
                    clientName: entry.client?.name ?? '',
                    phone: entry.client?.phone ?? '',
                    carBrand: entry.client?.carBrand ?? '',
                    carModel: entry.client?.carModel ?? '',
                    carColor: entry.client?.carColor ?? '',
                    carNumber: entry.client?.carNumber ?? '',
                    services: entry.services ?? '',
                    price: entry.price ?? 0,
                    isPaid: entry.isPaid,
                    status: entry.status,
                    notes: entry.notes,
                    boxNumber: entry.box?.number
                }
            })
        )

        // ===========================================
        // СТАТИСТИКА
        // ===========================================
        const stats = {
            totalInQueue: queueEntries.length,
            liveCount: live.length,
            scheduledCount: scheduled.length,
            adminCount: adminCreated.length,
            completedToday: await prisma.queueEntry.count({
                where: {
                    status: QueueEntryStatus.COMPLETED,
                    actualEndAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            }),
            inService: await prisma.queueEntry.count({
                where: { status: QueueEntryStatus.IN_SERVICE }
            }),
            freeBoxes: boxes.filter((b) => b.washSessions.length === 0 && b.queueEntries.length === 0).length
        }

        return NextResponse.json({
            boxes: formattedBoxes,
            appointments: formattedScheduled,
            liveQueue: formattedLive,
            adminEntries: formattedAdmin,
            settings: {
                washTime: configData.defaultDurationMin,
                confirmationInterval: configData.noShowGraceMin,
                boxCount: configData.activeBoxesCount,
                workStart: `${String(configData.workStartHour).padStart(2, '0')}:00`,
                workEnd: `${String(configData.workEndHour).padStart(2, '0')}:00`,
                liveQueueMaxWait: configData.liveQueueMaxWaitMin,
                noShowGrace: configData.noShowGraceMin,
                slotStep: configData.slotStepMin
            },
            config: config
                ? {
                    id: config.id,
                    effectiveFrom: config.effectiveFrom.toISOString(),
                    activeBoxesCount: config.activeBoxesCount,
                    defaultDurationMin: config.defaultDurationMin,
                    liveQueueMaxWaitMin: config.liveQueueMaxWaitMin,
                    noShowGraceMin: config.noShowGraceMin
                }
                : null,
            stats
        })
    } catch (error) {
        console.error('Error fetching admin data:', error)
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }
}