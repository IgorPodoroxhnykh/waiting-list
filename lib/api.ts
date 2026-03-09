// lib/api.ts
import { AdminData, TicketType, Ticket } from '@/types/admin'

const API_BASE = '/api/admin'

export async function fetchAdminData(): Promise<AdminData | null> {
    try {
        const response = await fetch(`${API_BASE}/data`)
        if (response.ok) {
            return await response.json()
        }
        return null
    } catch (error) {
        console.error('Failed to fetch data:', error)
        return null
    }
}

export async function updateStatus(
    type: 'appointment' | 'liveQueue' | 'washSession',
    id: number,
    field: string,
    value: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, id, field, value }),
        })
        const result = await response.json()
        if (!response.ok) {
            return { success: false, error: result.error || 'Ошибка обновления' }
        }
        return { success: true }
    } catch (error) {
        console.error('Failed to update status:', error)
        return { success: false, error: 'Ошибка соединения' }
    }
}

export async function updateTicket(
    type: TicketType,
    id: number,
    data: Partial<Ticket>
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/update-ticket`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, id, data }),
        })
        const result = await response.json()
        if (!response.ok) {
            return { success: false, error: result.error || 'Ошибка сохранения' }
        }
        return { success: true }
    } catch (error) {
        console.error('Failed to update ticket:', error)
        return { success: false, error: 'Ошибка соединения' }
    }
}

export async function deleteTicket(
    type: TicketType,
    id: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/delete-ticket`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, id }),
        })
        const result = await response.json()
        if (!response.ok) {
            return { success: false, error: result.error || 'Ошибка удаления' }
        }
        return { success: true }
    } catch (error) {
        console.error('Failed to delete ticket:', error)
        return { success: false, error: 'Ошибка соединения' }
    }
}