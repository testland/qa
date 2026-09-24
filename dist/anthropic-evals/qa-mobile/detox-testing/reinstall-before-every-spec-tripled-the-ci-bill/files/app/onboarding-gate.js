import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOUR_KEY, shouldOfferTour, markTourSeen } from '../src/onboarding';

export async function loadTourState() {
  const raw = await AsyncStorage.getItem(TOUR_KEY);
  return raw === null ? {} : { [TOUR_KEY]: JSON.parse(raw) };
}

export async function offerTour() {
  return shouldOfferTour(await loadTourState());
}

export async function recordTourSeen() {
  const next = markTourSeen(await loadTourState());
  await AsyncStorage.setItem(TOUR_KEY, JSON.stringify(next[TOUR_KEY]));
  return next;
}
