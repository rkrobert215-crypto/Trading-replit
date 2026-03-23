let ownerUserId: string | null = null;
let initialized = false;

export function setOwnerUserId(id: string | null) {
  ownerUserId = id;
  initialized = true;
}

export function getOwnerUserId(): string | null {
  return ownerUserId;
}

export function isOwnerTrade(tradeUserId: string | null): boolean {
  if (!initialized) return true; // not configured yet — allow all
  if (ownerUserId === null) {
    // No owner configured — notify only for anonymous trades
    return tradeUserId === null;
  }
  return tradeUserId === ownerUserId;
}
