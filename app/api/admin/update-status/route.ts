import { NextResponse } from 'next/server'
import { PrismaClient, AppointmentStatus, LiveQueueStatus, WashStatus } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

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

        // 1. ОБНОВЛЕНИЕ СТАТУСА ПРИБЫЛ
        if (field === 'arrived') {
            if (type === 'appointment') {
                await prisma.appointment.update({
                    where: { id },
                    data: {
                        arrivalTime: value ? new Date() : null,
                        confirmedAt: value ? new Date() : null
                    }
                })
            } else if (type === 'liveQueue') {
                await prisma.liveQueue.update({
                    where: { id },
                    data: {
                        status: value ? LiveQueueStatus.INVITED : LiveQueueStatus.WAITING,
                        invitedAt: value ? new Date() : null
                    }
                })
            }
        }

        // 2. ОПЛАТА
        if (field === 'isPaid') {
            if (type === 'appointment') {
                await prisma.appointment.update({
                    where: { id },
                    data: { isPaid: value }
                })
            } else if (type === 'liveQueue') {
                await prisma.liveQueue.update({
                    where: { id },
                    data: { isPaid: value }
                })
            }
        }

        // 3. В РАБОТЕ - перенос из очереди в бокс
        if (field === 'inProgress') {
            if (value === true) {
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

                if (type === 'appointment') {
                    const appointment = await prisma.appointment.findUnique({
                        where: { id }
                    })

                    if (!appointment) {
                        return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 })
                    }

                    console.log('Appointment isPaid:', appointment.isPaid)

                    // Пробуем создать, если не удастся - обновим
                    try {
                        await prisma.washSession.create({
                            data: {
                                boxId: freeBox.id,
                                clientId: appointment.clientId,
                                appointmentId: id,
                                startTime: new Date(),
                                duration: appointment.duration || 30,
                                status: WashStatus.IN_PROGRESS,
                                isWashed: false,
                                isPaid: appointment.isPaid
                            }
                        })
                        console.log('Created new session, isPaid:', appointment.isPaid)
                    } catch (createError: unknown) {
                        // Если ошибка уникального ограничения - ищем и обновляем
                        const errorMsg = createError instanceof Error ? createError.message : ''
                        if (errorMsg.includes('Unique constraint')) {
                            const existingSession = await prisma.washSession.findFirst({
                                where: { appointmentId: id }
                            })
                            if (existingSession) {
                                await prisma.washSession.update({
                                    where: { id: existingSession.id },
                                    data: {
                                        boxId: freeBox.id,
                                        status: WashStatus.IN_PROGRESS,
                                        startTime: new Date(),
                                        isPaid: existingSession.isPaid || appointment.isPaid
                                    }
                                })
                                console.log('Updated existing session, isPaid:', existingSession.isPaid || appointment.isPaid)
                            }
                        }
                    }

                    // Обновляем запись
                    await prisma.appointment.update({
                        where: { id },
                        data: {
                            status: AppointmentStatus.COMPLETED,
                            boxId: freeBox.id
                        }
                    })

                } else if (type === 'liveQueue') {
                    const liveQueue = await prisma.liveQueue.findUnique({
                        where: { id }
                    })

                    if (!liveQueue) {
                        return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 })
                    }

                    console.log('LiveQueue isPaid:', liveQueue.isPaid)

                    try {
                        await prisma.washSession.create({
                            data: {
                                boxId: freeBox.id,
                                clientId: liveQueue.clientId,
                                liveQueueId: id,
                                startTime: new Date(),
                                duration: 30,
                                status: WashStatus.IN_PROGRESS,
                                isWashed: false,
                                isPaid: liveQueue.isPaid
                            }
                        })
                        console.log('Created new session, isPaid:', liveQueue.isPaid)
                    } catch (createError: unknown) {
                        const errorMsg = createError instanceof Error ? createError.message : ''
                        if (errorMsg.includes('Unique constraint')) {
                            const existingSession = await prisma.washSession.findFirst({
                                where: { liveQueueId: id }
                            })
                            if (existingSession) {
                                await prisma.washSession.update({
                                    where: { id: existingSession.id },
                                    data: {
                                        boxId: freeBox.id,
                                        status: WashStatus.IN_PROGRESS,
                                        startTime: new Date(),
                                        isPaid: existingSession.isPaid || liveQueue.isPaid
                                    }
                                })
                                console.log('Updated existing session, isPaid:', existingSession.isPaid || liveQueue.isPaid)
                            }
                        }
                    }

                    // Обновляем очередь
                    await prisma.liveQueue.update({
                        where: { id },
                        data: {
                            status: LiveQueueStatus.IN_PROGRESS,
                            boxId: freeBox.id
                        }
                    })
                }
            }
        }

        // 4. ПОМЫТ
        if (field === 'isWashed' && type === 'washSession') {
            await prisma.washSession.update({
                where: { id },
                data: { isWashed: value }
            })
        }

        // 5. ЗАВЕРШИТЬ
        if (field === 'complete' && type === 'washSession') {
            const session = await prisma.washSession.findUnique({
                where: { id }
            })

            if (session) {
                await prisma.washSession.update({
                    where: { id },
                    data: {
                        status: WashStatus.COMPLETED,
                        endTime: new Date(),
                        isWashed: true
                    }
                })

                if (session.appointmentId) {
                    await prisma.appointment.update({
                        where: { id: session.appointmentId },
                        data: { status: AppointmentStatus.COMPLETED }
                    })
                }

                if (session.liveQueueId) {
                    await prisma.liveQueue.update({
                        where: { id: session.liveQueueId },
                        data: { status: LiveQueueStatus.COMPLETED }
                    })
                }
            }
        }

        return NextResponse.json({ success: true })

    } catch (error: unknown) {
        console.error('Error updating status:', error)
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: errMsg }, { status: 500 })
    } finally {
        await prisma.$disconnect()
    }
}
