import PocketBase from 'pocketbase';

// The frontend is served by PocketBase itself, so the API lives on the same origin.
export const pb = new PocketBase(location.origin);
pb.autoCancellation(false);

export function userId(): string {
  return pb.authStore.record?.id ?? '';
}
