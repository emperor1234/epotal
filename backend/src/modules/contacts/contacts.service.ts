import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/errors';
import * as creditLedger from '../credits/credit-ledger.service';
import { isSuppressed } from '../suppression/suppression.service';
import { CompanyPatternCacheService } from '../discovery/email-resolution/company-pattern-cache.service';
import { EmailVerificationService } from '../discovery/email-resolution/email-verification.service';
import { PatternGuessResolver } from '../discovery/email-resolution/pattern-guess.resolver';
import { CompanyDomainResolver } from '../discovery/company-domain-resolver.service';
import { decrypt } from '../../lib/encryption';
import { PublicEmailResolver } from '../discovery/public-email-resolver.service';
import { encrypt } from '../../lib/encryption';
import crypto from 'node:crypto';

const emailVerifier = new EmailVerificationService();
const patternGuessResolver = new PatternGuessResolver(new CompanyPatternCacheService(), emailVerifier);
const companyDomainResolver = new CompanyDomainResolver();
const publicEmailResolver = new PublicEmailResolver();

export async function getContact(contactId: string, userId?: string) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: { company: true, reveals: userId ? { where: { userId }, take: 1 } : false },
  });
  if (!contact) throw ApiError.notFound('Contact not found');
  if (!userId) return contact;
  const { reveals, ...contactWithReveal } = contact;
  return { ...contactWithReveal, reveal: reveals[0] ?? null };
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
  let publicEmails = await prisma.contactEmailEvidence.findMany({ where: { contactId } });
  if (publicEmails.length === 0) {
    const evidence = await prisma.contactSourceEvidence.findMany({ where: { contactId }, select: { sourceUrl: true } });
    const sourceUrls = [contact.sourceUrl, ...evidence.map((item) => item.sourceUrl)].filter((value): value is string => Boolean(value));
    const published = await publicEmailResolver.resolve(contact.fullName, sourceUrls);
    if (published) {
      const normalizedEmail = published.email.toLowerCase();
      const emailHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');
      await prisma.contactEmailEvidence.upsert({
        where: { contactId_emailHash: { contactId, emailHash } },
        create: {
          contactId,
          encryptedEmail: encrypt(normalizedEmail),
          emailHash,
          emailType: classifyEmailType(normalizedEmail),
          sourceUrl: published.sourceUrl,
        },
        update: { sourceUrl: published.sourceUrl, lastSeenAt: new Date() },
      });
      await prisma.contact.update({ where: { id: contactId }, data: { emailAvailability: 'public_email', refreshedAt: new Date() } });
      publicEmails = await prisma.contactEmailEvidence.findMany({ where: { contactId } });
    }
  }
  publicEmails.sort((left, right) => {
    const typeRank = (value: string) => value === 'personal' ? 0 : value === 'business' ? 1 : 2;
    const statusRank = (value: string) => value === 'valid' ? 0 : value === 'catch_all' ? 1 : value === 'unknown' ? 2 : 3;
    return typeRank(left.emailType) - typeRank(right.emailType) || statusRank(left.verificationStatus) - statusRank(right.verificationStatus);
  });

  let company = contact.company;
  if (!company && publicEmails.length === 0) {
    const resolved = await companyDomainResolver.resolve({ fullName: contact.fullName, jobTitle: contact.jobTitle, companyName: contact.companyNameHint });
    if (!resolved) throw ApiError.notFound('Could not identify this contact’s company website from public sources');
    company = await prisma.company.upsert({
      where: { domain: resolved.domain },
      create: { domain: resolved.domain, name: resolved.companyName, industry: contact.industry, country: contact.country },
      update: {},
    });
    await prisma.contact.update({ where: { id: contact.id }, data: { companyId: company.id, emailAvailability: 'likely_work_email', refreshedAt: new Date() } });
  }

  const reservation = await creditLedger.reserveCredits(userId, contactId);

  try {
    let foundSuppressedPublicEmail = false;
    for (const evidence of publicEmails) {
      const email = decrypt(evidence.encryptedEmail);
      const verification = await emailVerifier.verify(email);
      await prisma.contactEmailEvidence.update({
        where: { id: evidence.id },
        data: { verificationStatus: verification.status, lastSeenAt: new Date() },
      });
      if (verification.status === 'invalid') continue;
      if (await isSuppressed(email)) {
        foundSuppressedPublicEmail = true;
        continue;
      }

      const reveal = await prisma.contactReveal.create({
        data: {
          userId,
          contactId,
          email,
          confidence: verification.status === 'valid' ? 0.98 : verification.status === 'catch_all' ? 0.8 : 0.7,
          verificationStatus: verification.status,
          emailType: evidence.emailType,
          sourceUrl: evidence.sourceUrl,
        },
      });
      await creditLedger.settleReservation(reservation.id);
      await prisma.contact.update({
        where: { id: contact.id },
        data: { emailAvailability: verification.status === 'valid' ? 'verified_public_email' : 'public_email', refreshedAt: new Date() },
      });
      return reveal;
    }

    if (!company) {
      const resolved = await companyDomainResolver.resolve({ fullName: contact.fullName, jobTitle: contact.jobTitle, companyName: contact.companyNameHint });
      if (resolved) {
        company = await prisma.company.upsert({
          where: { domain: resolved.domain },
          create: { domain: resolved.domain, name: resolved.companyName, industry: contact.industry, country: contact.country },
          update: {},
        });
        await prisma.contact.update({ where: { id: contact.id }, data: { companyId: company.id, refreshedAt: new Date() } });
      }
    }
    if (!company) {
      await creditLedger.refundReservation(reservation.id);
      if (foundSuppressedPublicEmail) throw ApiError.forbidden('This contact is on the suppression list and cannot be revealed');
      throw ApiError.notFound('No usable public email or company website was found for this contact');
    }

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
        emailType: 'business',
      },
    });

    await creditLedger.settleReservation(reservation.id);
    await prisma.contact.update({ where: { id: contact.id }, data: { emailAvailability: resolution.verificationStatus === 'valid' ? 'verified' : 'likely_work_email', refreshedAt: new Date() } });
    return reveal;
  } catch (err) {
    // Ensure the reservation doesn't leak as PENDING credits on any failure
    // path we didn't explicitly refund above (e.g. an unexpected error).
    await creditLedger.refundReservation(reservation.id).catch(() => undefined);
    throw err;
  }
}

const PERSONAL_EMAIL_DOMAINS = new Set([
  'aol.com', 'fastmail.com', 'gmail.com', 'googlemail.com', 'hotmail.com',
  'icloud.com', 'live.com', 'outlook.com', 'pm.me', 'proton.me',
  'protonmail.com', 'yahoo.com',
]);

function classifyEmailType(email: string): 'personal' | 'business' {
  return PERSONAL_EMAIL_DOMAINS.has(email.split('@')[1] ?? '') ? 'personal' : 'business';
}
