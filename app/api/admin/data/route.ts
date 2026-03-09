import { NextResponse } from 'next/server'
import { PrismaClient, AppointmentStatus, LiveQueueStatus, WashStatus } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

// Игнорируем ошибки SSL
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

export async function GET() {
    try {
        const prisma = getPrisma()

        // Получаем настройки
        const settingsRaw = await prisma.setting.findMany()
        const settings: Record<string, unknown> = {}
        settingsRaw.forEach(s => {
            settings[s.key] = s.value
        })

        // Получаем боксы и информацию о текущих мойках
        const boxes = await prisma.box.findMany({
            include: {
                washSessions: {
                    where: { status: WashStatus.IN_PROGRESS },
                    include: {
                        client: true,
                        appointment: true,
                        liveQueue: true
                    }
                }
            },
            orderBy: { number: 'asc' }
        })

        // Получаем записи по времени
        const appointments = await prisma.appointment.findMany({
            where: {
                status: { notIn: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] }
            },
            include: { client: true, box: true },
            orderBy: { startTime: 'asc' }
        })

        // Получаем живую очередь
        const liveQueue = await prisma.liveQueue.findMany({
            where: {
                status: { notIn: [LiveQueueStatus.COMPLETED, LiveQueueStatus.LEFT] }
            },
            include: { client: true, box: true },
            orderBy: { arrivalTime: 'asc' }
        })

        await prisma.$disconnect()

        // Форматируем данные для фронтенда
        const formattedBoxes = boxes.map(box => {
            const activeSession = box.washSessions[0]

            let status: 'free' | 'occupied' | 'waiting' = 'free'
            let clientType: 'scheduled' | 'live' | undefined
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

            if (activeSession) {
                status = 'occupied'
                const client = activeSession.client

                if (activeSession.appointmentId) {
                    clientType = 'scheduled'
                    const appointment = activeSession.appointment
                    price = appointment?.price ?? 0
                    // ИСПРАВЛЕНО: проверяем на undefined и null явно
                    isPaid = activeSession.isPaid !== undefined && activeSession.isPaid !== null
                        ? activeSession.isPaid
                        : appointment?.isPaid ?? false
                } else if (activeSession.liveQueueId) {
                    clientType = 'live'
                    const live = activeSession.liveQueue
                    price = live?.price ?? 0
                    // ИСПРАВЛЕНО: проверяем на undefined и null явно
                    isPaid = activeSession.isPaid !== undefined && activeSession.isPaid !== null
                        ? activeSession.isPaid
                        : live?.isPaid ?? false
                }

                clientName = client?.name
                carBrand = client?.carBrand || ''
                carModel = client?.carModel || ''
                carColor = client?.carColor || ''
                carNumber = client?.carNumber || ''
                isWashed = activeSession.isWashed

                if (activeSession.startTime && activeSession.duration) {
                    const start = new Date(activeSession.startTime)
                    startTime = start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                    const end = new Date(start.getTime() + activeSession.duration * 60000)
                    expectedEndTime = end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                }
            }

            return {
                id: box.id,
                number: box.number,
                status,
                clientType,
                clientName,
                carBrand,
                carModel,
                carColor,
                carNumber,
                startTime,
                expectedEndTime,
                isWashed,
                price,
                isPaid
            }
        })

        // Форматируем записи
        const formattedAppointments = appointments.map(apt => ({
            id: apt.id,
            type: 'scheduled' as const,
            time: new Date(apt.startTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            clientName: apt.client?.name ?? '',
            phone: apt.client?.phone ?? '',
            carBrand: apt.client?.carBrand ?? '',
            carModel: apt.client?.carModel ?? '',
            carColor: apt.client?.carColor ?? '',
            carNumber: apt.client?.carNumber ?? '',
            services: apt.services ?? '',
            price: apt.price ?? 0,
            isPaid: apt.isPaid,
            arrived: !!apt.arrivalTime,
            inProgress: apt.status === AppointmentStatus.COMPLETED && !!apt.boxId,
            completed: apt.status === AppointmentStatus.COMPLETED,
            boxNumber: apt.box?.number
        }))

        // Форматируем живую очередь
        const formattedLiveQueue = liveQueue.map((item, index) => ({
            id: item.id,
            type: 'live' as const,
            time: new Date(item.arrivalTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            clientName: item.client?.name ?? '',
            phone: item.client?.phone ?? '',
            carBrand: item.client?.carBrand ?? '',
            carModel: item.client?.carModel ?? '',
            carColor: item.client?.carColor ?? '',
            carNumber: item.client?.carNumber ?? '',
            services: item.services ?? '',
            price: item.price ?? 0,
            isPaid: item.isPaid,
            arrived: item.status !== LiveQueueStatus.WAITING,
            inProgress: item.status === LiveQueueStatus.IN_PROGRESS,
            completed: item.status === LiveQueueStatus.COMPLETED,
            position: item.position ?? index + 1,
            boxNumber: item.box?.number
        }))

        return NextResponse.json({
            boxes: formattedBoxes,
            appointments: formattedAppointments,
            liveQueue: formattedLiveQueue,
            settings: {
                washTime: (settings.washDuration as number) || 30,
                confirmationInterval: (settings.confirmationInterval as number) || 15,
                boxCount: (settings.boxCount as number) || 5,
                workStart: (settings.workStart as string) || '08:00',
                workEnd: (settings.workEnd as string) || '22:00'
            }
        })

    } catch (error) {
        console.error('Error fetching admin data:', error)
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }
}