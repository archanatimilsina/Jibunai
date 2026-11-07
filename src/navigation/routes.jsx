import MyDayLogPage from '../components/Mydaylogpage';
import ChronosTaskFlow from '../components/Chronostaskflow';
import GoalsScreen from '../components/Goalsscreen';
import ChallengeTrackerScreen from '../components/Challengetrackerscreen';
import Notes from '../components/Notes';
import BlogScreen from '../components/Blogscreen';
import ArchiveScreen from '../components/Archivescreen';
import GestureDraw from '../components/Gesturedraw';
import HobbiesScreen from '../components/Hobbiesscreen';
import Wishlist from '../components/Wishlist';
import WatchlistScreen from '../components/Watchlistscreen';

import HomeScreen from '../screens/HomeScreen';
import RegisterScreen from '../screens/RegisterScreen';
import Gate1Screen from '../screens/Gate1Screen';
import Gate2Screen from '../screens/Gate2Screen';
import Gate3Screen from '../screens/Gate3Screen';
import SettingsScreen from '../screens/SettingsScreen';
import AlarmScreen from '../screens/AlarmScreen';
import DateKeeperScreen from '../screens/DateKeeperScreen';
import PlayerScreen from '../screens/PlayerScreen';

import { ROUTE_META, GROUPS } from './routeMeta';

const SCREENS = {
  home: HomeScreen,
  settings: SettingsScreen,
  alarm: AlarmScreen,
  datekeeper: DateKeeperScreen,
  player: PlayerScreen,
  register: RegisterScreen,
  gate1: Gate1Screen,
  gate2: Gate2Screen,
  gate3: Gate3Screen,
  myday: MyDayLogPage,
  chronos: ChronosTaskFlow,
  goals: GoalsScreen,
  challenge: ChallengeTrackerScreen,
  notes: Notes,
  blog: BlogScreen,
  gesture: GestureDraw,
  archive: ArchiveScreen,
  hobbies: HobbiesScreen,
  wishlist: Wishlist,
  watchlist: WatchlistScreen,
};

export const ROUTES = ROUTE_META.map((r) => ({ ...r, screen: SCREENS[r.key] }));

export const ROUTE_MAP = ROUTES.reduce((acc, r) => ({ ...acc, [r.key]: r }), {});

export const AUTH_ROUTE_MAP = {
  register: SCREENS.register,
  gate1: SCREENS.gate1,
  gate2: SCREENS.gate2,
  gate3: SCREENS.gate3,
};

export function getAuthRoute(key) {
  return AUTH_ROUTE_MAP[key];
}

export { GROUPS, ROUTE_META };

export function getRoute(key) {
  return ROUTE_MAP[key] || ROUTE_MAP.home;
}
