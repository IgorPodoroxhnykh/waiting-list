// app/api/admin/settings/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const config = await prisma.systemConfig.findFirst({
            where: { effectiveFrom: { lte: new Date() } },
            orderBy: { effectiveFrom: 'desc' }
        })

        return NextResponse.json({
            success: true,
            data: config ? {
                id: config.id,
                activeBoxesCount: config.activeBoxesCount,
                defaultDurationMin: config.defaultDurationMin,
                liveQueueMaxWaitMin: config.liveQueueMaxWaitMin,
                noShowGraceMin: config.noShowGraceMin,
                slotStepMin: config.slotStepMin,
                workStartHour: config.workStartHour,
                workEndHour: config.workEndHour,
                effectiveFrom: config.effectiveFrom.toISOString()
            } : null
        })
    } catch (error) {
        console.error('Error fetching settings:', error)
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            activeBoxesCount,
            defaultDurationMin,
            liveQueueMaxWaitMin,
            noShowGraceMin,
            slotStepMin,
            workStartHour,
            workEndHour
        } = body

        // Получаем текущую конфигурацию
        const currentConfig = await prisma.systemConfig.findFirst({
            where: { effectiveFrom: { lte: new Date() } },
            orderBy: { effectiveFrom: 'desc' }
        })

        // Создаём новую версию
        const newConfig = await prisma.systemConfig.create({
            data: {
                effectiveFrom: new Date(),
                activeBoxesCount: activeBoxesCount ?? currentConfig?.activeBoxesCount ?? 5,
                defaultDurationMin: defaultDurationMin ?? currentConfig?.defaultDurationMin ?? 30,
                liveQueueMaxWaitMin: liveQueueMaxWaitMin ?? currentConfig?.liveQueueMaxWaitMin ?? 120,
                noShowGraceMin: noShowGraceMin ?? currentConfig?.noShowGraceMin ?? 15,
                slotStepMin: slotStepMin ?? currentConfig?.slotStepMin ?? 5,
                workStartHour: workStartHour ?? currentConfig?.workStartHour ?? 8,
                workEndHour: workEndHour ?? currentConfig?.workEndHour ?? 22
            }
        })

        // Проверяем, нужно ли пересчитать очередь (уменьшилось количество боксов)
        if (currentConfig && activeBoxesCount < currentConfig.activeBoxesCount) {
            // Находим потенциальные конфликты
            const overbookedEntries = await findOverbookedEntries(activeBoxesCount)

            if (overbookedEntries.length > 0) {
                return NextResponse.json({
                    success: true,
                    data: {
                        id: newConfig.id,
                        effectiveFrom: newConfig.effectiveFrom.toISOString()
                    },
                    warning: 'Уменьшено количество боксов. Возможны конфликты записей.',
                    overbookedCount: overbookedEntries.length
                })
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                id: newConfig.id,
                effectiveFrom: newConfig.effectiveFrom.toISOString()
            }
        })
    } catch (error) {
        console.error('Error updating settings:', error)
        return NextResponse.json(
            { error: 'Failed to update settings' },
            { status: 500 }
        )
    }
}

/**
 * Находит записи, которые могут конфликтовать при уменьшении боксов
 */
async function findOverbookedEntries(newBoxCount: number): Promise<any[]> {
    const now = new Date()
    const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // неделя вперёд

    // Получаем все записи на ближайшую неделю
    const entries = await prisma.queueEntry.findMany({
        where: {
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            plannedStartAt: { gte: now, lte: horizon }
        },
        orderBy: { plannedStartAt: 'asc' }
    })

    // Группируем по временным слотам и ищем переполненные
    const conflicts: any[] = []
    const slotMap = new Map<string, number>()

    for (const entry of entries) {
        const slotKey = entry.plannedStartAt.toISOString()
        const count = slotMap.get(slotKey) ?? 0

        if (count >= newBoxCount) {
            conflicts.push(entry)
        } else {
            slotMap.set(slotKey, count + 1)
        }
    }

    return conflicts
}