// lib/scheduler.ts
import { prisma } from '@/lib/prisma'
import { QueueEntryStatus, QueueEntrySource, WashStatus } from '@prisma/client'

interface SchedulerConfig {
    activeBoxesCount: number
    defaultDurationMin: number
    liveQueueMaxWaitMin: number
    noShowGraceMin: number
    slotStepMin: number
    workStartHour: number
    workEndHour: number
}

interface TimeSlot {
    start: Date
    end: Date
    available: boolean
}

interface ETAResult {
    eta: Date
    position: number
    waitMinutes: number
    canStartNow: boolean
    exceedsMaxWait: boolean
}

/**
 * Получает активную конфигурацию системы
 */
export async function getActiveConfig(date: Date = new Date()): Promise<SchedulerConfig> {
    const config = await prisma.systemConfig.findFirst({
        where: { effectiveFrom: { lte: date } },
        orderBy: { effectiveFrom: 'desc' }
    })

    return {
        activeBoxesCount: config?.activeBoxesCount ?? 5,
        defaultDurationMin: config?.defaultDurationMin ?? 30,
        liveQueueMaxWaitMin: config?.liveQueueMaxWaitMin ?? 120,
        noShowGraceMin: config?.noShowGraceMin ?? 15,
        slotStepMin: config?.slotStepMin ?? 5,
        workStartHour: config?.workStartHour ?? 8,
        workEndHour: config?.workEndHour ?? 22
    }
}

/**
 * Проверяет пересечение двух временных интервалов
 */
function intervalsOverlap(
    start1: Date, end1: Date,
    start2: Date, end2: Date
): boolean {
    return start1 < end2 && start2 < end1
}

/**
 * Добавляет минуты к дате
 */
export function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000)
}

/**
 * Вычисляет ETA для живой очереди
 */
export async function calculateETA(
    excludeEntryId?: string
): Promise<ETAResult> {
    const now = new Date()
    const config = await getActiveConfig(now)
    const { activeBoxesCount, defaultDurationMin, liveQueueMaxWaitMin } = config

    // Получаем активные мойки
    const activeSessions = await prisma.washSession.findMany({
        where: { status: WashStatus.IN_PROGRESS },
        include: { box: true }
    })

    // Получаем ожидающих в живой очереди (LIVE + CHECKED_IN)
    const waitingLive = await prisma.queueEntry.findMany({
        where: {
            source: QueueEntrySource.LIVE,
            status: { in: [QueueEntryStatus.CREATED, QueueEntryStatus.CONFIRMED, QueueEntryStatus.CHECKED_IN] },
            id: excludeEntryId ? { not: excludeEntryId } : undefined
        },
        orderBy: [
            { priority: 'desc' },
            { createdAt: 'asc' }
        ]
    })

    // Получаем предстоящие записи на ближайшие часы
    const horizon = addMinutes(now, liveQueueMaxWaitMin + defaultDurationMin * (waitingLive.length + 2))
    const upcomingScheduled = await prisma.queueEntry.findMany({
        where: {
            source: QueueEntrySource.SCHEDULED,
            status: { in: [QueueEntryStatus.CONFIRMED, QueueEntryStatus.CHECKED_IN] },
            plannedStartAt: { gte: now, lte: horizon }
        },
        orderBy: { plannedStartAt: 'asc' }
    })

    // Инициализируем каналы (время освобождения каждого)
    const channels: Date[] = []

    // Свободные боксы
    const busyBoxIds = activeSessions.map(s => s.boxId)
    const allBoxes = await prisma.box.findMany({
        where: { isActive: true }
    })
    const freeBoxesCount = Math.max(0, allBoxes.length - busyBoxIds.length)

    for (let i = 0; i < freeBoxesCount; i++) {
        channels.push(now)
    }

    // Занятые боксы (время окончания)
    for (const session of activeSessions) {
        const duration = session.duration ?? defaultDurationMin
        const endTime = addMinutes(session.startTime, duration)
        channels.push(endTime)
    }

    // Сортируем по времени освобождения
    channels.sort((a, b) => a.getTime() - b.getTime())

    // Позиция в очереди
    const position = waitingLive.length + 1
    const canStartNow = channels.some(c => c.getTime() <= now.getTime())

    // Распределяем ожидающих в живой очереди
    for (const client of waitingLive) {
        const earliestChannel = channels.shift()!
        const clientStart = earliestChannel > now ? earliestChannel : now
        const duration = client.estimatedDurationMin ?? defaultDurationMin
        const clientEnd = addMinutes(clientStart, duration)

        // Проверяем конфликты с записями
        let adjustedEnd = clientEnd
        for (const scheduled of upcomingScheduled) {
            if (intervalsOverlap(clientStart, adjustedEnd, scheduled.plannedStartAt, scheduled.plannedEndAt)) {
                adjustedEnd = scheduled.plannedEndAt
            }
        }

        channels.push(adjustedEnd)
        channels.sort((a, b) => a.getTime() - b.getTime())
    }

    // Наше время (новый клиент)
    let myStart = channels.shift()!
    if (myStart < now) myStart = now

    const myEnd = addMinutes(myStart, defaultDurationMin)

    // Проверяем конфликты с записями для нового клиента
    for (const scheduled of upcomingScheduled) {
        if (intervalsOverlap(myStart, myEnd, scheduled.plannedStartAt, scheduled.plannedEndAt)) {
            myStart = scheduled.plannedEndAt
        }
    }

    const waitMinutes = Math.round((myStart.getTime() - now.getTime()) / 60000)
    const exceedsMaxWait = waitMinutes > liveQueueMaxWaitMin

    return {
        eta: myStart,
        position,
        waitMinutes,
        canStartNow: canStartNow && waitMinutes === 0,
        exceedsMaxWait
    }
}

/**
 * Получает список свободных слотов на дату
 */
export async function getAvailableSlots(
    date: Date,
    duration: number
): Promise<TimeSlot[]> {
    const config = await getActiveConfig(date)
    const { activeBoxesCount, slotStepMin, workStartHour, workEndHour } = config

    const slots: TimeSlot[] = []
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    // Начало и конец рабочего дня
    const dayStart = new Date(date)
    dayStart.setHours(workStartHour, 0, 0, 0)

    const dayEnd = new Date(date)
    dayEnd.setHours(workEndHour, 0, 0, 0)

    // Получаем все активные мойки и записи на этот день
    const dayStartQuery = new Date(date)
    dayStartQuery.setHours(0, 0, 0, 0)
    const dayEndQuery = new Date(date)
    dayEndQuery.setHours(23, 59, 59, 999)

    const activeSessions = await prisma.washSession.findMany({
        where: {
            status: WashStatus.IN_PROGRESS,
            startTime: { gte: dayStartQuery, lte: dayEndQuery }
        }
    })

    const scheduledEntries = await prisma.queueEntry.findMany({
        where: {
            status: { in: [QueueEntryStatus.CONFIRMED, QueueEntryStatus.CHECKED_IN, QueueEntryStatus.IN_SERVICE] },
            plannedStartAt: { gte: dayStartQuery, lte: dayEndQuery }
        }
    })

    // Генерируем слоты с шагом slotStepMin
    for (let hour = workStartHour; hour < workEndHour; hour++) {
        for (let min = 0; min < 60; min += slotStepMin) {
            const slotStart = new Date(date)
            slotStart.setHours(hour, min, 0, 0)

            const slotEnd = addMinutes(slotStart, duration)

            // Проверяем: не выходит ли за рабочее время?
            if (slotEnd > dayEnd) continue

            // Проверяем: прошло ли уже?
            if (isToday && slotStart <= now) continue

            // Считаем занятость в этот период
            let overlappingCount = 0

            // Активные мойки
            for (const session of activeSessions) {
                const sessionEnd = addMinutes(session.startTime, session.duration ?? duration)
                if (intervalsOverlap(slotStart, slotEnd, session.startTime, sessionEnd)) {
                    overlappingCount++
                }
            }

            // Записанные клиенты
            for (const entry of scheduledEntries) {
                const entryEnd = entry.plannedEndAt ?? addMinutes(entry.plannedStartAt, entry.estimatedDurationMin)
                if (intervalsOverlap(slotStart, slotEnd, entry.plannedStartAt, entryEnd)) {
                    overlappingCount++
                }
            }

            const available = overlappingCount < activeBoxesCount
            slots.push({ start: slotStart, end: slotEnd, available })
        }
    }

    return slots
}

/**
 * Проверяет доступность конкретного слота
 */
export async function isSlotAvailable(
    startTime: Date,
    duration: number,
    excludeEntryId?: string
): Promise<boolean> {
    const config = await getActiveConfig(startTime)
    const { activeBoxesCount, workStartHour, workEndHour } = config

    const endTime = addMinutes(startTime, duration)

    // Проверяем рабочее время
    const startHour = startTime.getHours() + startTime.getMinutes() / 60
    const endHour = endTime.getHours() + endTime.getMinutes() / 60

    if (startHour < workStartHour || endHour > workEndHour) {
        return false
    }

    // Проверяем, что слот в будущем
    if (startTime <= new Date()) {
        return false
    }

    // Считаем занятость
    const overlappingSessions = await prisma.washSession.count({
        where: {
            status: WashStatus.IN_PROGRESS,
            startTime: { lt: endTime },
            OR: [
                { duration: { not: null } },
                { duration: null }
            ]
        }
    })

    const overlappingEntries = await prisma.queueEntry.count({
        where: {
            status: { in: [QueueEntryStatus.CONFIRMED, QueueEntryStatus.CHECKED_IN, QueueEntryStatus.IN_SERVICE] },
            plannedStartAt: { lt: endTime },
            plannedEndAt: { gt: startTime },
            id: excludeEntryId ? { not: excludeEntryId } : undefined
        }
    })

    // Нужно учесть сессии без plannedEndAt
    const sessions = await prisma.washSession.findMany({
        where: {
            status: WashStatus.IN_PROGRESS,
            startTime: { lt: endTime }
        }
    })

    let sessionOverlap = 0
    for (const session of sessions) {
        const sessionEnd = addMinutes(session.startTime, session.duration ?? duration)
        if (sessionEnd > startTime) {
            sessionOverlap++
        }
    }

    const totalOverlapping = overlappingEntries + sessionOverlap
    return totalOverlapping < activeBoxesCount
}

/**
 * Находит ближайшее свободное время
 */
export async function findNearestSlot(
    duration: number,
    after: Date = new Date()
): Promise<Date | null> {
    const config = await getActiveConfig(after)
    const { slotStepMin, workStartHour, workEndHour, liveQueueMaxWaitMin } = config

    const maxSearchTime = addMinutes(after, liveQueueMaxWaitMin * 2)
    let current = new Date(after)

    // Округляем до ближайшего слота
    const minutes = current.getMinutes()
    const remainder = minutes % slotStepMin
    if (remainder !== 0) {
        current = addMinutes(current, slotStepMin - remainder)
    }
    current.setSeconds(0, 0)

    while (current < maxSearchTime) {
        // Проверяем рабочее время
        const hour = current.getHours()
        if (hour >= workStartHour && hour < workEndHour) {
            const available = await isSlotAvailable(current, duration)
            if (available) {
                return current
            }
        }

        current = addMinutes(current, slotStepMin)

        // Переход на следующий день
        if (current.getHours() >= workEndHour) {
            current.setDate(current.getDate() + 1)
            current.setHours(workStartHour, 0, 0, 0)
        }
    }

    return null
}