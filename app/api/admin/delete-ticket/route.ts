import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { type, id } = body

        if (!type || !id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        if (type === 'appointment') {
            await prisma.appointment.delete({
                where: { id },
            })
        } else if (type === 'liveQueue') {
            await prisma.liveQueue.delete({
                where: { id },
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting ticket:', error)
        return NextResponse.json(
            { error: 'Failed to delete ticket' },
            { status: 500 }
        )
    }
}