export function initials(fullName) {
  return String(fullName)
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('');
}

export function formatAddress(profile) {
  return `${profile.street}, ${profile.city} ${profile.postcode}`;
}
