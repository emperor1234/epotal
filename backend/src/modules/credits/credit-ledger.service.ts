import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import { env } from '../../config/env';

// Reveal is a saga, not a single DB transaction (SYSTEM_DESIGN.md, Section 4):
// we never hold a wallet row lock across a slow network/verification call.
// Step 1 reserves credits atomically. Step 2 (outside this service) does the
// slow work. Step 3 settles (debit) or refunds the reservation.

export async function reserveCredits(userId: string, contactId: string, amount = env.REVEAL_CREDIT_COST) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.creditWallet.findUnique({ where: { userId } });
    if (!wallet) throw ApiError.notFound('Credit wallet not found');
    if (wallet.balance < amount) throw ApiError.paymentRequired();

    // Optimistic, race-safe decrement: only succeeds if the balance observed
    // above still holds at write time, so two concurrent reveals can't both
    // pass the check above and double-spend the same credits.
    const updated = await tx.creditWallet.updateMany({
      where: { userId, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (updated.count === 0) throw ApiError.paymentRequired();

    const reservation = await tx.creditReservation.create({
      data: { userId, contactId, amount, status: 'PENDING' },
    });

    return reservation;
  });
}

export async function settleReservation(reservationId: string) {
  await prisma.creditReservation.update({
    where: { id: reservationId },
    data: { status: 'SETTLED', settledAt: new Date() },
  });
}

export async function refundReservation(reservationId: string) {
  await prisma.$transaction(async (tx) => {
    const reservation = await tx.creditReservation.findUniqueOrThrow({ where: { id: reservationId } });
    if (reservation.status !== 'PENDING') return; // already settled/refunded — refund is idempotent

    await tx.creditWallet.update({
      where: { userId: reservation.userId },
      data: { balance: { increment: reservation.amount } },
    });
    await tx.creditReservation.update({
      where: { id: reservationId },
      data: { status: 'REFUNDED', settledAt: new Date() },
    });
  });
}

export async function getWallet(userId: string) {
  const wallet = await prisma.creditWallet.findUnique({ where: { userId } });
  if (!wallet) throw ApiError.notFound('Credit wallet not found');
  return wallet;
}

export async function grantCredits(userId: string, amount: number) {
  if (amount <= 0) throw ApiError.badRequest('Grant amount must be positive');
  return prisma.creditWallet.update({ where: { userId }, data: { balance: { increment: amount } } });
}

export type CreditReservation = Prisma.CreditReservationGetPayload<Record<string, never>>;
