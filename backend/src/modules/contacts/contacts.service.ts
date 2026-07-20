import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import * as creditLedger from '../credits/credit-ledger.service';
import { isSuppressed } from '../suppression/suppression.service';
import { CompanyPatternCacheService } from '../discovery/email-resolution/company-pattern-cache.service';
import { EmailVerificationService } from '../discovery/email-resolution/email-verification.service';
import { PatternGuessResolver } from '../discovery/email-resolution/pattern-guess.resolver';

const patternGuessResolver = new PatternGuessResolver(new CompanyPatternCacheService(), new EmailVerificationService());

export async function getContact(contactId: string) {
  const contact = await prisma.contact.findUnique({ where: { id: contactId }, include: { company: true } });
  if (!contact) throw ApiError.notFound('Contact not found');
  return contact;
}

export async function listContacts(params: { industry?: string; country?: string; cursor?: string; take?: number }) {
  const take = Math.min(params.take ?? 20, 50);
  const contacts = await prisma.contact.findMany({
    where: {
      industry: params.industry ? { equals: params.industry, mode: 'insensitive' } : undefined,
      country: params.country ? { equals: params.country, mode: 'insensitive' } : undefined,
    },
    include: { company: true },
    take,
    ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
    orderBy: { createdAt: 'desc' },
  });
  return contacts;
}

// The reveal saga (SYSTEM_DESIGN.md Section 4 & 7):
//   1. Suppression check — first, unconditionally, before any credit moves.
//   2. Reserve credits (fast, atomic, decrements the wallet immediately).
//   3. Do the slow work (pattern-guess + live verification, or reuse a
//      prior reveal for this user+contact — the DB unique constraint makes
//      a second reveal request a free cache hit).
//   4. Settle the reservation on success, refund it on failure.
// Steps 2 and 3 are deliberately not in the same DB transaction so we never
// hold a wallet row lock across a slow network call.
export async function revealContact(userId: string, contactId: string) {
  const existingReveal = await prisma.contactReveal.findUnique({
    where: { userId_contactId: { userId, contactId } },
  });
  if (existingReveal) return existingReveal; // already paid for — free re-fetch

  const contact = await getContact(contactId);
  if (!contact.companyId) {
    throw ApiError.badRequest('Contact has no associated company domain to resolve an email against');
  }
  const company = await prisma.company.findUniqueOrThrow({ where: { id: contact.companyId } });

  const reservation = await creditLedger.reserveCredits(userId, contactId);

  try {
    const resolution = await patternGuessResolver.resolve({
      fullName: contact.fullName,
      companyDomain: company.domain,
    });

    if (!resolution) {
      await creditLedger.refundReservation(reservation.id);
      throw ApiError.notFound('Could not resolve a verified email for this contact');
    }

    if (await isSuppressed(resolution.email)) {
      await creditLedger.refundReservation(reservation.id);
      throw ApiError.forbidden('This contact is on the suppression list and cannot be revealed');
    }

    const reveal = await prisma.contactReveal.create({
      data: {
        userId,
        contactId,
        email: resolution.email,
        confidence: resolution.confidence,
        verificationStatus: resolution.verificationStatus,
      },
    });

    await creditLedger.settleReservation(reservation.id);
    return reveal;
  } catch (err) {
    // Ensure the reservation doesn't leak as PENDING credits on any failure
    // path we didn't explicitly refund above (e.g. an unexpected error).
    await creditLedger.refundReservation(reservation.id).catch(() => undefined);
    throw err;
  }
}
