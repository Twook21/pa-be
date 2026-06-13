import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load env from root
dotenv.config({ path: '../.env' });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ============================================================
  // 1. USERS (auth_schema.users)
  // ============================================================
  const hashedPassword = await bcrypt.hash('Password123?', 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@fintap.id' },
      update: {},
      create: {
        name: 'Admin FinTap',
        email: 'admin@fintap.id',
        password: hashedPassword,
        role: 'admin',
        division: 'IT',
        phoneNumber: '081234567890',
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.user.upsert({
      where: { email: 'budi.santoso@fintap.id' },
      update: {},
      create: {
        name: 'Budi Santoso',
        email: 'budi.santoso@fintap.id',
        password: hashedPassword,
        role: 'user',
        division: 'Finance',
        phoneNumber: '081298765432',
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.user.upsert({
      where: { email: 'siti.rahayu@fintap.id' },
      update: {},
      create: {
        name: 'Siti Rahayu',
        email: 'siti.rahayu@fintap.id',
        password: hashedPassword,
        role: 'user',
        division: 'HR',
        phoneNumber: '081377889900',
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.user.upsert({
      where: { email: 'andi.pratama@fintap.id' },
      update: {},
      create: {
        name: 'Andi Pratama',
        email: 'andi.pratama@fintap.id',
        password: hashedPassword,
        role: 'user',
        division: 'Marketing',
        phoneNumber: '081455667788',
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.user.upsert({
      where: { email: 'dewi.lestari@fintap.id' },
      update: {},
      create: {
        name: 'Dewi Lestari',
        email: 'dewi.lestari@fintap.id',
        password: hashedPassword,
        role: 'user',
        division: 'Finance',
        phoneNumber: '081511223344',
        status: 'inactive',
      },
    }),
    prisma.user.upsert({
      where: { email: 'rizky.hidayat@fintap.id' },
      update: {},
      create: {
        name: 'Rizky Hidayat',
        email: 'rizky.hidayat@fintap.id',
        password: hashedPassword,
        role: 'user',
        division: 'IT',
        phoneNumber: '081699887766',
        status: 'resigned',
        resignDate: new Date('2026-03-15'),
      },
    }),
  ]);

  console.log(`✅ Seeded ${users.length} users`);

  // ============================================================
  // 2. LOCATIONS (config_schema.locations)
  // ============================================================
  const locations = await Promise.all([
    prisma.location.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'Kantor Pusat YPLP',
        latitude: -6.9175,
        longitude: 107.6191,
        radius: 100,
        isActive: true,
      },
    }),
    prisma.location.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: 'Kantor Cabang Jakarta',
        latitude: -6.2088,
        longitude: 106.8456,
        radius: 150,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Seeded ${locations.length} locations`);

  // ============================================================
  // 3. ATTENDANCE SETTINGS (config_schema.attendance_settings)
  // ============================================================
  const settings = await prisma.attendanceSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      checkInStart: '07:00',
      checkInEnd: '08:30',
      checkOutStart: '16:00',
      checkOutEnd: '18:00',
      isActive: true,
    },
  });

  console.log(`✅ Seeded attendance settings`);

  // ============================================================
  // 4. ACTIVITIES (activity_schema.activities)
  // ============================================================
  const today = new Date();
  const activities = await Promise.all([
    prisma.activity.upsert({
      where: { date: new Date('2026-06-09') },
      update: {},
      create: {
        name: 'Hari Kerja Biasa',
        date: new Date('2026-06-09'),
        description: 'Aktivitas kerja normal hari Senin',
        checkInStart: '07:00',
        checkInEnd: '08:30',
        checkOutStart: '16:00',
        checkOutEnd: '18:00',
        checkInLatitude: -6.9175,
        checkInLongitude: 107.6191,
        checkOutLatitude: -6.9175,
        checkOutLongitude: 107.6191,
      },
    }),
    prisma.activity.upsert({
      where: { date: new Date('2026-06-10') },
      update: {},
      create: {
        name: 'Hari Kerja Biasa',
        date: new Date('2026-06-10'),
        description: 'Aktivitas kerja normal hari Selasa',
        checkInStart: '07:00',
        checkInEnd: '08:30',
        checkOutStart: '16:00',
        checkOutEnd: '18:00',
        checkInLatitude: -6.9175,
        checkInLongitude: 107.6191,
        checkOutLatitude: -6.9175,
        checkOutLongitude: 107.6191,
      },
    }),
    prisma.activity.upsert({
      where: { date: new Date('2026-06-11') },
      update: {},
      create: {
        name: 'Hari Kerja Biasa',
        date: new Date('2026-06-11'),
        description: 'Aktivitas kerja normal hari Rabu',
        checkInStart: '07:00',
        checkInEnd: '08:30',
        checkOutStart: '16:00',
        checkOutEnd: '18:00',
        checkInLatitude: -6.9175,
        checkInLongitude: 107.6191,
        checkOutLatitude: -6.9175,
        checkOutLongitude: 107.6191,
      },
    }),
    prisma.activity.upsert({
      where: { date: new Date('2026-06-12') },
      update: {},
      create: {
        name: 'Rapat Bulanan',
        date: new Date('2026-06-12'),
        description: 'Rapat evaluasi bulanan seluruh divisi',
        checkInStart: '08:00',
        checkInEnd: '09:00',
        checkOutStart: '15:00',
        checkOutEnd: '17:00',
        checkInLatitude: -6.9175,
        checkInLongitude: 107.6191,
        checkOutLatitude: -6.9175,
        checkOutLongitude: 107.6191,
      },
    }),
    prisma.activity.upsert({
      where: { date: new Date('2026-06-13') },
      update: {},
      create: {
        name: 'Hari Kerja Biasa',
        date: new Date('2026-06-13'),
        description: 'Aktivitas kerja normal hari Jumat',
        checkInStart: '07:00',
        checkInEnd: '08:30',
        checkOutStart: '16:00',
        checkOutEnd: '18:00',
        checkInLatitude: -6.9175,
        checkInLongitude: 107.6191,
        checkOutLatitude: -6.9175,
        checkOutLongitude: 107.6191,
      },
    }),
  ]);

  console.log(`✅ Seeded ${activities.length} activities`);

  // ============================================================
  // 5. ATTENDANCES (attendance_schema.attendances)
  // ============================================================
  const attendances = await Promise.all([
    // Budi - hadir tepat waktu
    prisma.attendance.create({
      data: {
        userId: users[1].id,
        date: new Date('2026-06-09'),
        checkInTime: new Date('1970-01-01T07:45:00'),
        checkOutTime: new Date('1970-01-01T16:30:00'),
        checkInLatitude: -6.9176,
        checkInLongitude: 107.6192,
        checkOutLatitude: -6.9175,
        checkOutLongitude: 107.6190,
        status: 'present',
        activityId: activities[0].id,
      },
    }),
    // Siti - hadir tepat waktu
    prisma.attendance.create({
      data: {
        userId: users[2].id,
        date: new Date('2026-06-09'),
        checkInTime: new Date('1970-01-01T07:30:00'),
        checkOutTime: new Date('1970-01-01T16:15:00'),
        checkInLatitude: -6.9174,
        checkInLongitude: 107.6190,
        checkOutLatitude: -6.9176,
        checkOutLongitude: 107.6191,
        status: 'present',
        activityId: activities[0].id,
      },
    }),
    // Andi - terlambat
    prisma.attendance.create({
      data: {
        userId: users[3].id,
        date: new Date('2026-06-09'),
        checkInTime: new Date('1970-01-01T08:45:00'),
        checkOutTime: new Date('1970-01-01T17:00:00'),
        checkInLatitude: -6.9175,
        checkInLongitude: 107.6191,
        checkOutLatitude: -6.9175,
        checkOutLongitude: 107.6191,
        status: 'late',
        notes: 'Macet di jalan tol',
        activityId: activities[0].id,
      },
    }),
    // Budi - hadir hari selasa
    prisma.attendance.create({
      data: {
        userId: users[1].id,
        date: new Date('2026-06-10'),
        checkInTime: new Date('1970-01-01T07:50:00'),
        checkOutTime: new Date('1970-01-01T16:45:00'),
        checkInLatitude: -6.9175,
        checkInLongitude: 107.6191,
        checkOutLatitude: -6.9175,
        checkOutLongitude: 107.6191,
        status: 'present',
        activityId: activities[1].id,
      },
    }),
    // Siti - sakit hari selasa
    prisma.attendance.create({
      data: {
        userId: users[2].id,
        date: new Date('2026-06-10'),
        status: 'sakit',
        notes: 'Demam tinggi',
        activityId: activities[1].id,
      },
    }),
  ]);

  console.log(`✅ Seeded ${attendances.length} attendances`);

  // ============================================================
  // 6. LEAVE REQUESTS (request_schema.leave_requests)
  // ============================================================
  const leaveRequests = await Promise.all([
    prisma.leaveRequest.create({
      data: {
        userId: users[2].id, // Siti
        type: 'sakit',
        reason: 'Demam tinggi dan flu berat, perlu istirahat 2 hari',
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-11'),
        status: 'approved',
        responseDate: new Date('2026-06-10'),
      },
    }),
    prisma.leaveRequest.create({
      data: {
        userId: users[1].id, // Budi
        type: 'cuti',
        reason: 'Acara pernikahan keluarga di luar kota',
        startDate: new Date('2026-06-16'),
        endDate: new Date('2026-06-18'),
        status: 'pending',
      },
    }),
    prisma.leaveRequest.create({
      data: {
        userId: users[3].id, // Andi
        type: 'cuti',
        reason: 'Liburan keluarga',
        startDate: new Date('2026-06-20'),
        endDate: new Date('2026-06-22'),
        status: 'rejected',
        note: 'Tidak bisa approve karena jadwal deadline project',
        responseDate: new Date('2026-06-12'),
      },
    }),
  ]);

  console.log(`✅ Seeded ${leaveRequests.length} leave requests`);

  // ============================================================
  // 7. EXTERNAL DUTIES (request_schema.external_duties)
  // ============================================================
  const externalDuties = await Promise.all([
    prisma.externalDuty.create({
      data: {
        userId: users[3].id, // Andi
        date: new Date('2026-06-11'),
        location: 'Kantor Klien PT ABC - Jl. Sudirman No. 55',
        description: 'Meeting dengan klien untuk presentasi proposal marketing Q3',
        status: 'approved',
        approvedBy: users[0].id, // Admin
        adminNotes: 'Silakan, harap buat laporan setelahnya',
      },
    }),
    prisma.externalDuty.create({
      data: {
        userId: users[1].id, // Budi
        date: new Date('2026-06-13'),
        location: 'Kantor Pajak KPP Pratama Bandung',
        description: 'Pengurusan pelaporan pajak tahunan perusahaan',
        status: 'pending',
      },
    }),
  ]);

  console.log(`✅ Seeded ${externalDuties.length} external duties`);

  // ============================================================
  // 8. CALENDAR (config_schema.calendars) - Juni 2026
  //    Fetch dari API libur.deno.dev jika tersedia,
  //    fallback ke data dummy jika API tidak bisa diakses
  // ============================================================
  let calendarSynced = false;
  const calendarApiUrl = process.env.CALENDAR_API_URL || 'https://libur.deno.dev/api';

  try {
    const { default: axios } = await import('axios');
    const url = `${calendarApiUrl}?year=2026`;
    console.log('📡 Fetching calendar data from libur.deno.dev...');

    const response = await axios.get(url, { timeout: 30000 });
    const holidays = response.data;

    if (Array.isArray(holidays) && holidays.length > 0) {
      // Delete existing 2026 calendar data
      await prisma.calendar.deleteMany({ where: { year: 2026 } });

      // Create holiday map for lookup
      const holidayMap = new Map<string, { name: string; isNational: boolean }>();
      for (const h of holidays) {
        holidayMap.set(h.date, {
          name: h.name,
          isNational: h.is_national_holiday,
        });
      }

      // Generate all days of 2026 as batch data
      const calendarData = [];
      const startDate = new Date(Date.UTC(2026, 0, 1));
      const endDate = new Date(Date.UTC(2027, 0, 1));

      for (let d = new Date(startDate); d < endDate; d.setUTCDate(d.getUTCDate() + 1)) {
        const dateObj = new Date(d);
        const dateStr = dateObj.toISOString().split('T')[0];
        const dayOfWeek = dateObj.getUTCDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const holiday = holidayMap.get(dateStr);

        calendarData.push({
          date: dateObj,
          year: dateObj.getUTCFullYear(),
          month: dateObj.getUTCMonth() + 1,
          day: dateObj.getUTCDate(),
          dayOfWeek,
          isHoliday: isWeekend || !!holiday,
          holidayName: holiday?.name || null,
          holidayType: holiday ? (holiday.isNational ? 'nasional' : 'cuti_bersama') : null,
        });
      }

      // Batch insert all at once
      const result = await prisma.calendar.createMany({
        data: calendarData,
        skipDuplicates: true,
      });

      console.log(`✅ Synced ${result.count} calendar entries from API (tahun 2026, ${holidays.length} hari libur)`);
      calendarSynced = true;
    }
  } catch (error: any) {
    console.log(`⚠️  API kalender gagal (${error.message}), pakai data dummy...`);
  }

  // Fallback: data dummy jika API tidak tersedia
  if (!calendarSynced) {
    const calendarEntries = [];
    const daysInJune = 30;

    for (let day = 1; day <= daysInJune; day++) {
      const date = new Date(2026, 5, day); // month 0-indexed
      const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let isHoliday = isWeekend;
      let holidayName: string | null = null;
      let holidayType: string | null = null;

      // Hari libur nasional Juni 2026
      if (day === 1) {
        isHoliday = true;
        holidayName = 'Hari Lahir Pancasila';
        holidayType = 'nasional';
      }

      calendarEntries.push({
        date,
        year: 2026,
        month: 6,
        day,
        dayOfWeek,
        isHoliday,
        holidayName,
        holidayType,
      });
    }

    for (const entry of calendarEntries) {
      await prisma.calendar.upsert({
        where: { date: entry.date },
        update: {},
        create: entry,
      });
    }

    console.log(`✅ Seeded ${calendarEntries.length} calendar entries (dummy - Juni 2026)`);
  }

  // ============================================================
  // 9. NOTIFICATIONS (notification_schema.notifications)
  // ============================================================
  const notifications = await Promise.all([
    prisma.notification.create({
      data: {
        type: 'leave_approved',
        notifiableType: 'User',
        notifiableId: users[2].id, // Siti
        data: JSON.stringify({
          title: 'Pengajuan Izin Disetujui',
          body: 'Pengajuan izin sakit Anda tanggal 10-11 Juni 2026 telah disetujui.',
          leaveRequestId: leaveRequests[0].id,
        }),
        readAt: new Date('2026-06-10T10:00:00'),
      },
    }),
    prisma.notification.create({
      data: {
        type: 'leave_submitted',
        notifiableType: 'User',
        notifiableId: users[0].id, // Admin
        data: JSON.stringify({
          title: 'Pengajuan Cuti Baru',
          body: 'Budi Santoso mengajukan cuti tanggal 16-18 Juni 2026.',
          leaveRequestId: leaveRequests[1].id,
        }),
      },
    }),
    prisma.notification.create({
      data: {
        type: 'external_duty_approved',
        notifiableType: 'User',
        notifiableId: users[3].id, // Andi
        data: JSON.stringify({
          title: 'Dinas Luar Disetujui',
          body: 'Pengajuan dinas luar Anda tanggal 11 Juni 2026 telah disetujui.',
          externalDutyId: externalDuties[0].id,
        }),
      },
    }),
    prisma.notification.create({
      data: {
        type: 'attendance_reminder',
        notifiableType: 'User',
        notifiableId: users[1].id, // Budi
        data: JSON.stringify({
          title: 'Pengingat Absensi',
          body: 'Jangan lupa melakukan check-in hari ini sebelum pukul 08:30.',
        }),
      },
    }),
  ]);

  console.log(`✅ Seeded ${notifications.length} notifications`);

  // ============================================================
  // 10. USER LOCATIONS (notification_schema.user_locations)
  // ============================================================
  const userLocations = await Promise.all([
    prisma.userLocation.upsert({
      where: { userId: users[1].id },
      update: {},
      create: {
        userId: users[1].id,
        latitude: -6.9176,
        longitude: 107.6192,
      },
    }),
    prisma.userLocation.upsert({
      where: { userId: users[2].id },
      update: {},
      create: {
        userId: users[2].id,
        latitude: -6.9180,
        longitude: 107.6188,
      },
    }),
    prisma.userLocation.upsert({
      where: { userId: users[3].id },
      update: {},
      create: {
        userId: users[3].id,
        latitude: -6.2090,
        longitude: 106.8460,
      },
    }),
  ]);

  console.log(`✅ Seeded ${userLocations.length} user locations`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log('   Users: 6 (1 admin, 4 active users, 1 resigned)');
  console.log('   Locations: 2');
  console.log('   Attendance Settings: 1');
  console.log('   Activities: 5 (9-13 Juni 2026)');
  console.log('   Attendances: 5');
  console.log('   Leave Requests: 3 (approved, pending, rejected)');
  console.log('   External Duties: 2 (approved, pending)');
  console.log('   Calendar: 30 entries (Juni 2026)');
  console.log('   Notifications: 4');
  console.log('   User Locations: 3');
  console.log('\n🔑 Login credentials:');
  console.log('   All users password: Password123?');
  console.log('   Admin: admin@fintap.id');
  console.log('   Users: budi.santoso@fintap.id, siti.rahayu@fintap.id, andi.pratama@fintap.id, dewi.lestari@fintap.id');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
