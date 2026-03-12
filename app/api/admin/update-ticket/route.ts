// app/api/admin/update-ticket/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { type, id, data } = body

        if (!id || !data) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Находим запись в очереди
        const queueEntry = await prisma.queueEntry.findUnique({
            where: { id: String(id) },
            include: { client: true }
        })

        if (!queueEntry) {
            return NextResponse.json(
                { error: 'Запись не найдена' },
                { status: 404 }
            )
        }

        // Подготавливаем данные для обновления
        const updateData: Record<string, unknown> = {
            services: data.services ?? queueEntry.services,
            price: data.price !== undefined ? Number(data.price) : queueEntry.price,
            isPaid: data.isPaid ?? queueEntry.isPaid,
        }

        // Парсим время если есть
        if (data.time) {
            let newDate: Date | null = null

            // Пробуем разные форматы
            if (data.time.includes(' ')) {
                // Формат "YYYY-MM-DD HH:MM" или "DD.MM.YYYY HH:MM"
                const [datePart, timePart] = data.time.split(' ')
                const [hours, minutes] = timePart.split(':').map(Number)

                if (datePart.includes('-')) {
                    // YYYY-MM-DD
                    const [year, month, day] = datePart.split('-').map(Number)
                    newDate = new Date(year, month - 1, day, hours, minutes)
                } else if (datePart.includes('.')) {
                    // DD.MM.YYYY
                    const [day, month, year] = datePart.split('.').map(Number)
                    newDate = new Date(year, month - 1, day, hours, minutes)
                }
            } else if (data.time.includes(':')) {
                // Только время "HH:MM"
                const [hours, minutes] = data.time.split(':').map(Number)
                const now = new Date()
                newDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
            }

            // Проверяем валидность даты
            if (newDate && !isNaN(newDate.getTime())) {
                updateData.plannedStartAt = newDate
            }
        }

        // Обновляем клиента
        if (queueEntry.clientId) {
            await prisma.client.update({
                where: { id: queueEntry.clientId },
                data: {
                    name: data.clientName ?? queueEntry.client?.name,
                    phone: data.phone ?? queueEntry.client?.phone,
                    carBrand: data.carBrand ?? queueEntry.client?.carBrand,
                    carModel: data.carModel ?? queueEntry.client?.carModel,
                    carColor: data.carColor ?? queueEntry.client?.carColor,
                    carNumber: data.carNumber ?? queueEntry.client?.carNumber,
                }
            })
        }

        // Обновляем запись в очереди
        const updatedEntry = await prisma.queueEntry.update({
            where: { id: String(id) },
            data: updateData
        })

        console.log('Updated queue entry:', updatedEntry.id)
        return NextResponse.json({ success: true, data: updatedEntry })
    } catch (error) {
        console.error('Error updating ticket:', error)
        return NextResponse.json(
            { error: 'Failed to update ticket' },
            { status: 500 }
        )
    }
}