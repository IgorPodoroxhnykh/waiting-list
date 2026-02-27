import { QueueTicket } from '@/components/QueueTicket'

const ticket = {
  id: 'ABC123',
  position: 5,
  totalInQueue: 10,
  waitTimeMinutes: 45,
  arriveBy: new Date(Date.now() + 45 * 60000),
  serviceName: 'Комплексная мойка',
  carInfo: 'Toyota Camry'
}

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <QueueTicket ticket={ticket} />
    </main>
  )
}