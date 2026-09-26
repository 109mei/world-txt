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
  Landmark,
  Leaf,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
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

/** アイコンは世界共通の言葉。線の太さ1.5・24の升目の SVG で描き、言葉か読み上げ用の名前を必ず添える */
const ICONS: Record<IconKey, LucideIcon> = {
  humanity: PersonStanding,
  population: Users,
  food: Wheat,
  water: Droplet,
  energy: Zap,
  eco: Leaf,
  health: HeartPulse,
  climate: ThermometerSun,
  society: Landmark,
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

export function Icon({ name, size = 18, className }: { name: IconKey; size?: number; className?: string }) {
  const C = ICONS[name] ?? Globe2;
  return <C size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;
}

/** 情景（SVG）の中に置くアイコン。色は親の color を使う */
export function SvgIcon({ name, size }: { name: IconKey; size: number }) {
  const C = ICONS[name] ?? Globe2;
  return <C width={size} height={size} strokeWidth={1.5} aria-hidden="true" />;
}

export function ToneIcon({ name, tone, size = 18 }: { name: IconKey; tone: Tone; size?: number }) {
  return <Icon name={name} size={size} className={`tone-${tone}`} />;
}

/** 変化の向きは3つだけ：良くなっている・変わらない・悪くなっている（急な変化も、同じ向きの矢印） */
export type Direction = 'better' | 'same' | 'worse';
export function directionOf(trend: Trend): Direction {
  return trend === 'up' || trend === 'up2' ? 'better' : trend === 'down' || trend === 'down2' ? 'worse' : 'same';
}
const DIRECTION_LABEL: Record<Direction, string> = { better: '良くなっている', same: '変わらない', worse: '悪くなっている' };
const DIRECTION_ICON: Record<Direction, LucideIcon> = { better: ArrowUpRight, same: ArrowRight, worse: ArrowDownRight };

/** 変化の向き（線のアイコン）。良くなっているは翡翠、悪くなっているは珊瑚 */
export function TrendArrow({ trend, size = 16 }: { trend: Trend | 'unknown'; size?: number }) {
  if (trend === 'unknown') {
    return (
      <span className="trend trend-unknown" role="img" aria-label="わからない">
        <CircleHelp size={size} strokeWidth={1.5} aria-hidden="true" />
      </span>
    );
  }
  const d = directionOf(trend);
  const C = DIRECTION_ICON[d];
  return (
    <span className={`trend trend-${d}`} role="img" aria-label={DIRECTION_LABEL[d]}>
      <C size={size} strokeWidth={1.5} aria-hidden="true" />
    </span>
  );
}

export { Heart, InfinityIcon };
