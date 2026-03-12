// app/api/admin/delete-ticket/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { QueueEntryStatus } from '@prisma/client'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { type, id } = body

        if (!id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Удаляем запись из очереди (устанавливаем статус CANCELLED)
        await prisma.queueEntry.update({
            where: { id: String(id) },
            data: {
                status: QueueEntryStatus.CANCELLED
            }
        })

        console.log('Cancelled queue entry:', id)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting ticket:', error)
        return NextResponse.json(
            { error: 'Failed to delete ticket' },
            { status: 500 }
        )
    }
}