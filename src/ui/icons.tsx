import {
  Atom,
  Baby,
  Bomb,
  Bot,
  Brain,
  BookOpenText,
  CircleHelp,
  Cloud,
  CloudRain,
  Coins,
  Diamond,
  Dna,
  Droplet,
  Earth,
  Factory,
  Flag,
  FlaskConical,
  Flame,
  Fuel,
  Globe2,
  Handshake,
  Heart,
  HeartPulse,
  Hourglass,
  House,
  Infinity as InfinityIcon,
  Leaf,
  Moon,
  MoonStar,
  Newspaper,
  PawPrint,
  PenLine,
  PersonStanding,
  Pill,
  Plane,
  PlugZap,
  Radiation,
  Scale,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Skull,
  Smile,
  Snowflake,
  Sparkle,
  Sprout,
  Star,
  Sun,
  Swords,
  Thermometer,
  ThermometerSun,
  Tractor,
  Trees,
  TriangleAlert,
  Users,
  Waves,
  Wheat,
  Wind,
  Zap,
  Bug,
  Orbit,
  Mountain,
  Rocket,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import type { IconKey, Tone } from '../data/schema';
import type { Trend } from '../core';

/** アイコンは世界共通の言葉。画面ではSVG、共有テキストでは絵文字にする */
const ICONS: Record<IconKey, LucideIcon> = {
  humanity: PersonStanding,
  population: Users,
  food: Wheat,
  water: Droplet,
  energy: Zap,
  eco: Leaf,
  health: HeartPulse,
  climate: ThermometerSun,
  society: Scale,
  peace: Handshake,
  science: FlaskConical,
  logistics: Plane,
  industry: Factory,
  capacity: Diamond,
  coherence: Radiation,
  civilization: Star,
  time: Hourglass,
  warning: TriangleAlert,
  unknown: CircleHelp,
  cycle: InfinityIcon,
  war: Swords,
  fire: Flame,
  plant: Sprout,
  animal: PawPrint,
  pathogen: Bug,
  immunity: ShieldCheck,
  aging: Hourglass,
  death: Skull,
  birth: Baby,
  sleep: Moon,
  oil: Fuel,
  electricity: PlugZap,
  agriculture: Tractor,
  medicine: Pill,
  education: BookOpenText,
  nation: Flag,
  money: Coins,
  crime: ShieldAlert,
  happiness: Smile,
  environment: Trees,
  sun: Sun,
  air: Wind,
  co2: Cloud,
  temperature: Thermometer,
  sea: Waves,
  earth: Earth,
  edit: PenLine,
  anomaly: Sparkle,
  cold: Snowflake,
  flood: CloudRain,
  home: House,
  dna: Dna,
  news: Newspaper,
  atom: Atom,
  wind: Wind,
  moon: MoonStar,
  robot: Bot,
  weapon: Bomb,
  record: ScrollText,
  meteor: Orbit,
  volcano: Mountain,
  infinity: InfinityIcon,
  rocket: Rocket,
  trophy: Trophy,
  mind: Brain,
};

/** 共有テキスト用の絵文字 */
export const EMOJI: Record<IconKey, string> = {
  humanity: '♥',
  population: '◉',
  food: '🍞',
  water: '💧',
  energy: '⚡',
  eco: '🌿',
  health: '✚',
  climate: '☀',
  society: '⚖',
  peace: '☮',
  science: '⚗',
  logistics: '✈',
  industry: '⚙',
  capacity: '◆',
  coherence: '☢',
  civilization: '★',
  time: '⌛',
  warning: '!',
  unknown: '?',
  cycle: '∞',
  war: '⚔',
  fire: '🔥',
  plant: '🌱',
  animal: '🐾',
  pathogen: '☣',
  immunity: '🛡',
  aging: '⌛',
  death: '☠',
  birth: '◉',
  sleep: '🌙',
  oil: '⛽',
  electricity: '⚡',
  agriculture: '🌾',
  medicine: '✚',
  education: '📖',
  nation: '🏳',
  money: '💰',
  crime: '!',
  happiness: '♥',
  environment: '🌳',
  sun: '☀',
  air: '☁',
  co2: '☁',
  temperature: '🌡',
  sea: '🌊',
  earth: '🌏',
  edit: '✎',
  anomaly: '✦',
  cold: '❄',
  flood: '🌧',
  home: '⌂',
  dna: '🧬',
  news: '📰',
  atom: '⚛',
  wind: '🌬',
  moon: '🌙',
  robot: '🤖',
  weapon: '💣',
  record: '📜',
  meteor: '☄',
  volcano: '🌋',
  infinity: '∞',
  rocket: '🚀',
  trophy: '🏆',
  mind: '🧠',
};

export function Icon({ name, size = 18, className }: { name: IconKey; size?: number; className?: string }) {
  const C = ICONS[name] ?? Globe2;
  return <C size={size} strokeWidth={1.6} className={className} aria-hidden="true" />;
}

/** 情景（SVG）の中に置くアイコン。色は親の color を使う */
export function SvgIcon({ name, size }: { name: IconKey; size: number }) {
  const C = ICONS[name] ?? Globe2;
  return <C width={size} height={size} strokeWidth={2} aria-hidden="true" />;
}

export function ToneIcon({ name, tone, size = 18 }: { name: IconKey; tone: Tone; size?: number }) {
  return <Icon name={name} size={size} className={`tone-${tone}`} />;
}

const TREND_TEXT: Record<Trend, string> = { up2: '⇈', up: '↗', flat: '→', down: '↘', down2: '⇊' };
const TREND_LABEL: Record<Trend, string> = { up2: '急速に改善', up: '改善', flat: '横ばい', down: '悪化', down2: '急速に悪化' };

/** 変化の向き（⇈ ↗ → ↘ ⇊）。改善は緑、悪化は赤 */
export function TrendArrow({ trend }: { trend: Trend | 'unknown' }) {
  if (trend === 'unknown') {
    return (
      <span className="trend trend-unknown" aria-label="不明">
        ?
      </span>
    );
  }
  return (
    <span className={`trend trend-${trend}`} aria-label={TREND_LABEL[trend]}>
      {TREND_TEXT[trend]}
    </span>
  );
}

export function trendText(trend: Trend): string {
  return TREND_TEXT[trend];
}

export { Heart, InfinityIcon };
