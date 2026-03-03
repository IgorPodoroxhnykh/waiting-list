// prisma/seed.ts
import 'dotenv/config'

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

// Игнорируем ошибки SSL (для облачной БД)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const main = async () => {
    const connectionString = process.env.DATABASE_URL || ''

    console.log('🔌 Подключение к БД...')

    // Создаём пул
    const pool = new pg.Pool({
        connectionString: connectionString + (connectionString.includes('?') ? '&' : '?') + 'sslmode=require',
        ssl: {
            rejectUnauthorized: false
        }
    })

    // Создаём адаптер
    const adapter = new PrismaPg(pool)

    // Инициализируем PrismaClient
    const prisma = new PrismaClient({ adapter })

    // ===========================================
    // ОЧИСТКА БД
    // ===========================================
    console.log('🧹 Очистка базы данных...')

    await prisma.ticketService.deleteMany()
    await prisma.ticket.deleteMany()
    await prisma.car.deleteMany()
    await prisma.service.deleteMany()
    await prisma.user.deleteMany()

    console.log('✅ База данных очищена\n')

    // ===========================================
    // СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ
    // ===========================================
    const { Role, TicketStatus } = await import('@prisma/client')

    const admin = await prisma.user.create({
        data: {
            telegramId: 123456789,
            firstName: 'Администратор',
            lastName: 'Системы',
            username: 'admin',
            role: Role.ADMIN
        }
    })

    console.log('✅ Создан администратор:', admin.username)

    const users = await Promise.all([
        prisma.user.create({
            data: { telegramId: 111111111, firstName: 'Иван', lastName: 'Петров', username: 'ivan_p', role: Role.USER }
        }),
        prisma.user.create({
            data: { telegramId: 222222222, firstName: 'Мария', lastName: 'Сидорова', username: 'maria_s', role: Role.USER }
        }),
        prisma.user.create({
            data: { telegramId: 333333333, firstName: 'Алексей', lastName: 'Иванов', username: 'alex_ivanov', role: Role.USER }
        }),
        prisma.user.create({
            data: { telegramId: 444444444, firstName: 'Елена', lastName: 'Козлова', username: 'elena_k', role: Role.USER }
        })
    ])

    console.log('✅ Создано пользователей:', users.length)

    // ===========================================
    // СОЗДАНИЕ АВТОМОБИЛЕЙ
    // ===========================================
    const cars = await Promise.all([
        prisma.car.create({ data: { userId: users[0].id, brand: 'Toyota', model: 'Camry', governmentNumber: 'А777АА77', color: 'Чёрный' } }),
        prisma.car.create({ data: { userId: users[1].id, brand: 'BMW', model: 'X5', governmentNumber: 'В555ОР77', color: 'Белый' } }),
        prisma.car.create({ data: { userId: users[2].id, brand: 'Mercedes-Benz', model: 'E-Class', governmentNumber: 'С333СС77', color: 'Серебристый' } }),
        prisma.car.create({ data: { userId: users[3].id, brand: 'Hyundai', model: 'Solaris', governmentNumber: 'К777КК77', color: 'Синий' } })
    ])

    console.log('✅ Создано автомобилей:', cars.length)

    // ===========================================
    // СОЗДАНИЕ УСЛУГ
    // ===========================================
    const services = await Promise.all([
        prisma.service.create({ data: { name: 'Стандартная мойка', description: 'Наружная мойка кузова', basePrice: 500 } }),
        prisma.service.create({ data: { name: 'Премиум мойка', description: 'Полная мойка с полировкой', basePrice: 1500 } }),
        prisma.service.create({ data: { name: 'Мойка двигателя', description: 'Очистка подкапотного', basePrice: 800 } }),
        prisma.service.create({ data: { name: 'Химчистка салона', description: 'Полная чистка', basePrice: 5000 } }),
        prisma.service.create({ data: { name: 'Полировка кузова', description: 'Восстановительная', basePrice: 3000 } }),
        prisma.service.create({ data: { name: 'Керамическое покрытие', description: 'Нанесение', basePrice: 15000 } })
    ])

    console.log('✅ Создано услуг:', services.length)

    // ===========================================
    // СОЗДАНИЕ БИЛЕТОВ
    // ===========================================
    const now = new Date()

    const tickets = await Promise.all([
        prisma.ticket.create({ data: { userId: users[0].id, carId: cars[0].id, number: 1, position: 1, status: TicketStatus.WAITING, arrived: true, washed: false, createdAt: new Date(now.getTime() - 30 * 60 * 1000) } }),
        prisma.ticket.create({ data: { userId: users[1].id, carId: cars[1].id, number: 2, position: 2, status: TicketStatus.WAITING, arrived: false, washed: false, createdAt: new Date(now.getTime() - 20 * 60 * 1000) } }),
        prisma.ticket.create({ data: { userId: users[2].id, carId: cars[2].id, number: 3, position: 3, status: TicketStatus.WAITING, arrived: false, washed: false, createdAt: new Date(now.getTime() - 10 * 60 * 1000) } }),
        prisma.ticket.create({ data: { userId: users[3].id, carId: cars[3].id, number: 4, position: null, status: TicketStatus.CALLED, arrived: true, washed: false, calledAt: new Date(now.getTime() - 5 * 60 * 1000), createdAt: new Date(now.getTime() - 60 * 60 * 1000) } }),
        prisma.ticket.create({ data: { userId: users[0].id, carId: cars[0].id, number: 100, position: null, status: TicketStatus.SERVED, arrived: true, washed: true, totalPrice: 2300, notes: 'Стандартная + Мойка двигателя', servedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1000) } }),
        prisma.ticket.create({ data: { userId: users[1].id, carId: cars[1].id, number: 99, position: null, status: TicketStatus.SERVED, arrived: true, washed: true, totalPrice: 1500, notes: 'Премиум мойка', servedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000), createdAt: new Date(now.getTime() - 49 * 60 * 60 * 1000) } }),
        prisma.ticket.create({ data: { userId: users[2].id, carId: cars[2].id, number: 98, position: null, status: TicketStatus.CANCELLED, arrived: false, washed: false, notes: 'Отменено', createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000) } })
    ])

    console.log('✅ Создано билетов:', tickets.length)

    // ===========================================
    // СВЯЗИ БИЛЕТОВ С УСЛУГАМИ
    // ===========================================
    await Promise.all([
        prisma.ticketService.create({ data: { ticketId: tickets[0].id, serviceId: services[0].id, quantity: 1 } }),
        prisma.ticketService.create({ data: { ticketId: tickets[1].id, serviceId: services[1].id, quantity: 1 } }),
        prisma.ticketService.create({ data: { ticketId: tickets[2].id, serviceId: services[0].id, quantity: 1 } }),
        prisma.ticketService.create({ data: { ticketId: tickets[2].id, serviceId: services[2].id, quantity: 1 } }),
        prisma.ticketService.create({ data: { ticketId: tickets[4].id, serviceId: services[0].id, customPrice: 500, quantity: 1 } }),
        prisma.ticketService.create({ data: { ticketId: tickets[4].id, serviceId: services[2].id, customPrice: 800, quantity: 1 } }),
        prisma.ticketService.create({ data: { ticketId: tickets[5].id, serviceId: services[1].id, customPrice: 1500, quantity: 1 } })
    ])

    console.log('✅ Созданы связи билетов с услугами')

    // ===========================================
    // ИТОГИ
    // ===========================================
    console.log('\n📊 Итоги заполнения:')
    console.log('   - Пользователи:', await prisma.user.count())
    console.log('   - Автомобили:', await prisma.car.count())
    console.log('   - Услуги:', await prisma.service.count())
    console.log('   - Билеты:', await prisma.ticket.count())
    console.log('   - Связи:', await prisma.ticketService.count())

    console.log('\n✅ Заполнение завершено!')

    await prisma.$disconnect()
}

main().catch((e) => {
    console.error('❌ Ошибка:', e)
    process.exit(1)
})


