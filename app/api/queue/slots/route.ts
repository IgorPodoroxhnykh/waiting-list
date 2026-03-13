// app/api/queue/slots/route.ts
import { NextResponse } from 'next/server'
import { getAvailableSlots, getActiveConfig } from '@/lib/scheduler'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const dateStr = searchParams.get('date')
        const durationStr = searchParams.get('duration')

        if (!dateStr) {
            return NextResponse.json(
                { error: 'Date parameter is required' },
                { status: 400 }
            )
        }

        const date = new Date(dateStr)
        const config = await getActiveConfig(date)
        const duration = durationStr ? parseInt(durationStr, 10) : config.defaultDurationMin

        const slots = await getAvailableSlots(date, duration)

        return NextResponse.json({
            success: true,
            data: {
                date: date.toISOString(),
                duration,
                slots: slots.map(s => ({
                    start: s.start.toISOString(),
                    end: s.end.toISOString(),
                    available: s.available
                }))
            }
        })
    } catch (error) {
        console.error('Error getting slots:', error)
        return NextResponse.json(
            { error: 'Failed to get available slots' },
            { status: 500 }
        )
    }
}