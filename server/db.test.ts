import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cancelStudentRegistration,
  createEventRecord,
  deleteEventRecord,
  getEventByIdForViewer,
  getEventRegistrationsForOrganiser,
  getUserById,
  registerStudentForEvent,
  updateEventRecord,
} from './db.ts';

test('atomic registration enforces capacity, blocks duplicates, and updates organiser view', () => {
  const org1 = getUserById('ORG001');
  const org2 = getUserById('ORG002');
  const stu1 = getUserById('STU001');
  const stu2 = getUserById('STU002');
  const stu3 = getUserById('STU003');
  assert.ok(org1 && org2 && stu1 && stu2 && stu3);

  const created = createEventRecord(org1, {
    title: 'Unit Test Capacity Event',
    category: 'Seminars',
    date: '2026-12-20',
    startTime: '14:00',
    endTime: '16:00',
    venue: 'Test Hall 101',
    shortDescription: 'Testing atomic seat limits and duplicate registration guards.',
    fullDescription: 'Testing atomic seat limits and duplicate registration guards.',
    additionalInstructions: '',
    registrationDeadline: '2026-12-19',
    maxCapacity: 2,
    isFree: true,
    feeAmount: 0,
    bannerUrl: '/src/assets/images/banner_ai_workshop_1795210968134.jpg',
    status: 'PUBLISHED',
    isFeatured: false,
  });

  try {
    // 1. STU001 registers -> 1/2
    const r1 = registerStudentForEvent(created.id, stu1);
    assert.equal(r1.ok, true);
    if (r1.ok) {
      assert.equal(r1.event.registeredCount, 1);
      assert.equal(r1.event.remainingSeats, 1);
      assert.equal(r1.event.computedStatus, 'OPEN');
    }

    // 2. STU001 duplicate blocked -> 409
    const dup = registerStudentForEvent(created.id, stu1);
    assert.equal(dup.ok, false);
    if (!dup.ok) assert.equal(dup.status, 409);

    // 3. STU002 registers -> 2/2 -> FULL
    const r2 = registerStudentForEvent(created.id, stu2);
    assert.equal(r2.ok, true);
    if (r2.ok) {
      assert.equal(r2.event.registeredCount, 2);
      assert.equal(r2.event.remainingSeats, 0);
      assert.equal(r2.event.computedStatus, 'FULL');
    }

    // 4. STU003 blocked because FULL -> 409
    const r3 = registerStudentForEvent(created.id, stu3);
    assert.equal(r3.ok, false);
    if (!r3.ok) assert.equal(r3.status, 409);

    // 5. ORG002 cannot manage ORG001's event
    const crossOrg = getEventRegistrationsForOrganiser(created.id, org2);
    assert.equal(crossOrg.ok, false);
    if (!crossOrg.ok) assert.equal(crossOrg.status, 403);

    // 6. ORG001 sees both dummy IDs
    const orgRegs = getEventRegistrationsForOrganiser(created.id, org1);
    assert.equal(orgRegs.ok, true);
    if (orgRegs.ok) {
      assert.equal(orgRegs.registrations.length, 2);
    }

    // 7. STU001 cancels -> seat opens up again
    const cancelRes = cancelStudentRegistration(created.id, stu1);
    assert.equal(cancelRes.ok, true);
    const refreshed = getEventByIdForViewer(created.id, stu3);
    assert.equal(refreshed?.computedStatus, 'OPEN');
    assert.equal(refreshed?.remainingSeats, 1);

    // 8. ORG002 cannot edit ORG001's event
    const crossEdit = updateEventRecord(created.id, org2, {
      title: 'Hijacked',
      category: 'Seminars',
      date: '2026-12-20',
      startTime: '14:00',
      endTime: '16:00',
      venue: 'Test Hall 101',
      shortDescription: 'Testing atomic seat limits and duplicate registration guards.',
      fullDescription: 'Testing atomic seat limits and duplicate registration guards.',
      additionalInstructions: '',
      registrationDeadline: '2026-12-19',
      maxCapacity: 2,
      isFree: true,
      feeAmount: 0,
      bannerUrl: '/src/assets/images/banner_ai_workshop_1795210968134.jpg',
      status: 'PUBLISHED',
      isFeatured: false,
    });
    assert.equal(crossEdit.ok, false);
    if (!crossEdit.ok) assert.equal(crossEdit.status, 403);
  } finally {
    deleteEventRecord(created.id, org1);
  }
});
