// app/api/admin/data/route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { QueueEntrySource, QueueEntryStatus, WashStatus } from '@prisma/client'

export async function GET() {
    try {
        // ===========================================
        // КОНФИГУРАЦИЯ
        // ===========================================
        const config = await prisma.systemConfig.findFirst({
            where: { effectiveFrom: { lte: new Date() } },
            orderBy: { effectiveFrom: 'desc' }
        })

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

        // Только ожидающие записи (без тех, кто уже в работе)
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
        const scheduled = queueEntries.filter(e => e.source === QueueEntrySource.SCHEDULED)
        const live = queueEntries.filter(e => e.source === QueueEntrySource.LIVE)
        const adminCreated = queueEntries.filter(e => e.source === QueueEntrySource.ADMIN)

        // ===========================================
        // ФОРМАТИРОВАНИЕ ДАННЫХ
        // ===========================================

        // Форматируем боксы
        const formattedBoxes = boxes.map(box => {
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

                const client = activeSession?.client || activeEntry?.clientId
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
                        const end = new Date(start.getTime() + (entry.estimatedDurationMin || 30) * 60000)
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
                queueEntryId // добавляем ID записи для связи
            }
        })

        // Форматируем записи по времени (SCHEDULED)
        const formattedScheduled = scheduled.map((entry) => ({
            id: entry.id,
            type: 'scheduled' as const,
            time: entry.plannedStartAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
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
            inProgress: false, // всегда false, т.к. IN_SERVICE отфильтрованы
            boxNumber: entry.box?.number
        }))

        // Форматируем живую очередь (LIVE)
        const formattedLive = live.map((entry, index) => ({
            id: entry.id,
            type: 'live' as const,
            time: entry.plannedStartAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            requestedAt: entry.requestedStartAt?.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
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
            position: index + 1,
            arrived: entry.status === QueueEntryStatus.CHECKED_IN,
            inProgress: false, // всегда false, т.к. IN_SERVICE отфильтрованы
            boxNumber: entry.box?.number
        }))

        // Форматируем админские записи
        const formattedAdmin = adminCreated.map((entry) => ({
            id: entry.id,
            type: 'admin' as const,
            time: entry.plannedStartAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
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
        }))

        // ===========================================
        // СТАТИСТИКА
        // ===========================================
        const allActiveStatuses = [
            QueueEntryStatus.CREATED,
            QueueEntryStatus.CONFIRMED,
            QueueEntryStatus.CHECKED_IN,
            QueueEntryStatus.IN_SERVICE
        ]

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
            freeBoxes: boxes.filter(b => b.washSessions.length === 0 && b.queueEntries.length === 0).length
        }

        return NextResponse.json({
            boxes: formattedBoxes,
            appointments: formattedScheduled,
            liveQueue: formattedLive,
            adminEntries: formattedAdmin,
            settings: {
                washTime: config?.defaultDurationMin ?? 30,
                confirmationInterval: config?.noShowGraceMin ?? 15,
                boxCount: config?.activeBoxesCount ?? 5,
                workStart: `${String(config?.workStartHour ?? 8).padStart(2, '0')}:00`,
                workEnd: `${String(config?.workEndHour ?? 22).padStart(2, '0')}:00`,
                liveQueueMaxWait: config?.liveQueueMaxWaitMin ?? 120,
                noShowGrace: config?.noShowGraceMin ?? 15,
                slotStep: config?.slotStepMin ?? 5
            },
            config: config ? {
                id: config.id,
                effectiveFrom: config.effectiveFrom.toISOString(),
                activeBoxesCount: config.activeBoxesCount,
                defaultDurationMin: config.defaultDurationMin,
                liveQueueMaxWaitMin: config.liveQueueMaxWaitMin,
                noShowGraceMin: config.noShowGraceMin
            } : null,
            stats
        })

    } catch (error) {
        console.error('Error fetching admin data:', error)
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }
}