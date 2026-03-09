import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { type, id, data } = body

        if (!type || !id || !data) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        if (type === 'appointment') {
            const appointment = await prisma.appointment.findUnique({
                where: { id },
                include: { client: true }
            })

            if (!appointment || !appointment.clientId) {
                return NextResponse.json(
                    { error: 'Appointment or client not found' },
                    { status: 404 }
                )
            }

            // Преобразуем время в DateTime
            const [hours, minutes] = (data.time || '00:00').split(':')
            const today = new Date()
            const startTime = new Date(today.setHours(parseInt(hours), parseInt(minutes), 0, 0))

            await prisma.appointment.update({
                where: { id },
                data: {
                    startTime: startTime,
                    services: data.services,
                    price: data.price,
                    isPaid: data.isPaid,
                    client: {
                        update: {
                            name: data.clientName,
                            phone: data.phone,
                            carBrand: data.carBrand,
                            carModel: data.carModel,
                            carColor: data.carColor,
                            carNumber: data.carNumber,
                        }
                    }
                },
            })
        } else if (type === 'liveQueue') {
            const liveTicket = await prisma.liveQueue.findUnique({
                where: { id },
                include: { client: true }
            })

            if (!liveTicket || !liveTicket.clientId) {
                return NextResponse.json(
                    { error: 'LiveQueue or client not found' },
                    { status: 404 }
                )
            }

            // Преобразуем время в DateTime
            const [hours, minutes] = (data.time || '00:00').split(':')
            const today = new Date()
            const arrivalTime = new Date(today.setHours(parseInt(hours), parseInt(minutes), 0, 0))

            await prisma.liveQueue.update({
                where: { id },
                data: {
                    arrivalTime: arrivalTime,
                    services: data.services,
                    price: data.price,
                    isPaid: data.isPaid,
                    client: {
                        update: {
                            name: data.clientName,
                            phone: data.phone,
                            carBrand: data.carBrand,
                            carModel: data.carModel,
                            carColor: data.carColor,
                            carNumber: data.carNumber,
                        }
                    }
                },
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating ticket:', error)
        return NextResponse.json(
            { error: 'Failed to update ticket' },
            { status: 500 }
        )
    }
}