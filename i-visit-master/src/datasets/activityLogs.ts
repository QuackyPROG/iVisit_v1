import dayjs from 'dayjs';

const activityLogData = [
  {
    message:
      'A visitor, Visitor 6, has entered Gate 4 at 10:15 AM on July 11, 2025 using Visitor Pass 125. Guard Joel is stationed at Gate 4.',
    created_at: dayjs().subtract(5, 'minute').toISOString(),
  },
  {
    message:
      'Student, John Smith, exited Main Building at 9:45 AM on July 11, 2025 using Student ID 2023001.',
    created_at: dayjs().subtract(20, 'minute').toISOString(),
  },
  {
    message:
      'Visitor, Maria Lopez, entered Gate 2 at 9:30 AM on July 11, 2025 using Visitor Pass 122. Guard Ryan logged the entry.',
    created_at: dayjs().subtract(1, 'hour').toISOString(),
  },
  {
    message:
      'Faculty, Prof. Kim Lee, entered Library at 8:50 AM on July 11, 2025 using Faculty ID F102.',
    created_at: dayjs().subtract(2, 'hour').toISOString(),
  },
  {
    message:
      'Visitor, Mark Dela Cruz, entered Gate 5 at 8:30 AM on July 11, 2025 using Visitor Pass 121.',
    created_at: dayjs().subtract(1, 'day').toISOString(),
  },
  {
    message:
      'Staff, Anna Reyes, entered Finance Office at 7:50 AM on July 11, 2025 using Staff ID S230.',
    created_at: dayjs().subtract(1, 'day').toISOString(),
  },
  {
    message:
      'Visitor, Ethan Walker, exited Gate 3 at 7:30 PM on July 10, 2025 using Visitor Pass 120.',
    created_at: dayjs().subtract(2, 'day').toISOString(),
  },
  {
    message:
      'Student, Sophia Martinez, entered Main Building at 6:45 PM on July 10, 2025 using Student ID 2023002.',
    created_at: dayjs().subtract(2, 'day').toISOString(),
  },
  {
    message:
      'Faculty, Dr. Henry Wilson, exited Science Building at 5:30 PM on July 10, 2025 using Faculty ID F110.',
    created_at: dayjs().subtract(2, 'day').toISOString(),
  },
  {
    message:
      'Visitor, Kenji Ito, entered Gate 1 at 4:20 PM on July 10, 2025 using Visitor Pass 119.',
    created_at: dayjs().subtract(3, 'day').toISOString(),
  },
  {
    message:
      'Student, Amelia Reyes, exited Gym at 3:10 PM on July 10, 2025 using Student ID 2023003.',
    created_at: dayjs().subtract(3, 'day').toISOString(),
  },
  {
    message:
      'Staff, Carlos Mendoza, entered Admin Office at 2:00 PM on July 10, 2025 using Staff ID S145.',
    created_at: dayjs().subtract(3, 'day').toISOString(),
  },
  {
    message:
      'Visitor, Liam Smith, entered Gate 6 at 1:30 PM on July 10, 2025 using Visitor Pass 118.',
    created_at: dayjs().subtract(3, 'day').toISOString(),
  },
  {
    message:
      'Student, Hana Suzuki, exited Library at 12:15 PM on July 10, 2025 using Student ID 2023004.',
    created_at: dayjs().subtract(4, 'day').toISOString(),
  },
  {
    message:
      'Faculty, Prof. Olivia White, entered Main Building at 11:10 AM on July 10, 2025 using Faculty ID F112.',
    created_at: dayjs().subtract(4, 'day').toISOString(),
  },
  {
    message:
      'Visitor, Noah Davis, exited Gate 5 at 10:40 AM on July 10, 2025 using Visitor Pass 117.',
    created_at: dayjs().subtract(4, 'day').toISOString(),
  },
  {
    message:
      'Staff, Isabella Garcia, entered Security Office at 9:55 AM on July 10, 2025 using Staff ID S178.',
    created_at: dayjs().subtract(4, 'day').toISOString(),
  },
  {
    message:
      'Visitor, David Thompson, entered Gate 7 at 9:20 AM on July 10, 2025 using Visitor Pass 116.',
    created_at: dayjs().subtract(5, 'day').toISOString(),
  },
  {
    message:
      'Student, Emily Brown, exited Hospital at 8:50 AM on July 10, 2025 using Student ID 2023005.',
    created_at: dayjs().subtract(5, 'day').toISOString(),
  },
  {
    message:
      'Faculty, Dr. Lucas Hernandez, entered Science Building at 8:15 AM on July 10, 2025 using Faculty ID F115.',
    created_at: dayjs().subtract(5, 'day').toISOString(),
  },
  {
    message:
      'Visitor, Ava Clark, entered Gate 2 at 7:40 AM on July 10, 2025 using Visitor Pass 115.',
    created_at: dayjs().subtract(6, 'day').toISOString(),
  },
  {
    message:
      'Staff, Benjamin Scott, exited Library at 7:00 AM on July 10, 2025 using Staff ID S199.',
    created_at: dayjs().subtract(6, 'day').toISOString(),
  },
  {
    message:
      'Visitor, Charlotte Nguyen, entered Gate 3 at 6:20 PM on July 9, 2025 using Visitor Pass 114.',
    created_at: dayjs().subtract(6, 'day').toISOString(),
  },
  {
    message:
      'Student, Henry Wilson, exited Gym at 5:45 PM on July 9, 2025 using Student ID 2023006.',
    created_at: dayjs().subtract(7, 'day').toISOString(),
  },
  {
    message:
      'Faculty, Prof. Mia Patel, entered Main Building at 4:10 PM on July 9, 2025 using Faculty ID F120.',
    created_at: dayjs().subtract(7, 'day').toISOString(),
  },
  {
    message:
      'Visitor, Daniel Kim, exited Gate 1 at 3:30 PM on July 9, 2025 using Visitor Pass 113.',
    created_at: dayjs().subtract(7, 'day').toISOString(),
  },
  {
    message:
      'Staff, Grace Johnson, entered HR Office at 2:20 PM on July 9, 2025 using Staff ID S205.',
    created_at: dayjs().subtract(7, 'day').toISOString(),
  },
  {
    message:
      'Visitor, Michael Carter, entered Gate 4 at 1:50 PM on July 9, 2025 using Visitor Pass 112.',
    created_at: dayjs().subtract(8, 'day').toISOString(),
  },
  {
    message:
      'Student, Ella Torres, exited Registrar at 1:10 PM on July 9, 2025 using Student ID 2023007.',
    created_at: dayjs().subtract(8, 'day').toISOString(),
  },
  {
    message:
      'Faculty, Dr. Christopher Johnson, entered Hospital at 12:30 PM on July 9, 2025 using Faculty ID F125.',
    created_at: dayjs().subtract(8, 'day').toISOString(),
  },
  {
    message:
      'Visitor, Rumi Kim, entered Gate 2 at 11:15 AM on July 9, 2025 using Visitor Pass 111.',
    created_at: dayjs().subtract(8, 'day').toISOString(),
  },
];

export default activityLogData;
