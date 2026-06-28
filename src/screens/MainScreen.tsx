import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  Animated,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import namesData from '../data/names.json';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = Math.min(SCREEN_W - 40, 400);
const CARD_H = Math.min(SCREEN_H * 0.65, 560);
const SWIPE_THRESHOLD = 100;

const C = {
  bg: '#F5F0E8',
  card: '#FFFFFF',
  pink: '#FF6B9D',
  purple: '#7C5CBF',
  yellow: '#FFD166',
  text: '#2D2D2D',
  muted: '#9B8FA8',
  lavender: '#EDE7F6',
  mint: '#E8F5E9',
  peach: '#FFF0E8',
  border: '#E8E0F0',
};

type Name = {
  name: string;
  gender: string;
  origin: string;
  meaning: string;
  syllables: number;
  popularity: { uk: number; us: number; ireland: number; australia: number };
  trend: string;
  vibes: string[];
  nicknames: string[];
  famous: string[];
};

const ALL_NAMES: Name[] = namesData as Name[];

const VIBES = ['Classic', 'Modern', 'Vintage', 'Nature', 'Bold', 'Celestial', 'Mythic', 'Celtic', 'Nordic', 'Elegant', 'Playful', 'Quirky', 'Biblical', 'Whimsical', 'Timeless', 'Royal', 'Spiritual', 'Romantic', 'Mysterious'];
const ORIGINS = ['English', 'Irish', 'Welsh', 'Scottish', 'Latin', 'Greek', 'Hebrew', 'Germanic', 'Norse', 'French', 'Italian', 'Scandinavian', 'Sanskrit', 'Persian', 'Celtic', 'Norman'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function speak(name: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(name);
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }
}

function popularityLabel(rank: number): string {
  if (rank <= 10) return 'Top 10';
  if (rank <= 25) return 'Top 25';
  if (rank <= 50) return 'Top 50';
  if (rank <= 100) return 'Top 100';
  return 'Less common';
}

function genderColor(g: string) {
  if (g === 'M') return '#90CAF9';
  if (g === 'F') return '#F48FB1';
  return '#CE93D8';
}

function genderLabel(g: string) {
  if (g === 'M') return 'Boy';
  if (g === 'F') return 'Girl';
  return 'Neutral';
}

type Filters = {
  gender: string;
  letter: string;
  origin: string;
  vibe: string;
  syllables: number;
  trend: string;
};

const DEFAULT_FILTERS: Filters = { gender: 'All', letter: '', origin: '', vibe: '', syllables: 0, trend: '' };

function applyFilters(names: Name[], filters: Filters, seen: Set<string>): Name[] {
  return names.filter(n => {
    if (seen.has(n.name)) return false;
    if (filters.gender !== 'All' && n.gender !== filters.gender) return false;
    if (filters.letter && !n.name.startsWith(filters.letter)) return false;
    if (filters.origin && !n.origin.toLowerCase().includes(filters.origin.toLowerCase())) return false;
    if (filters.vibe && !n.vibes.includes(filters.vibe)) return false;
    if (filters.syllables > 0 && n.syllables !== filters.syllables) return false;
    if (filters.trend && n.trend !== filters.trend) return false;
    return true;
  });
}

// ── Card ─────────────────────────────────────────────────────────────────────

function NameCard({ item, onLike, onSkip }: { item: Name; onLike: () => void; onSkip: () => void }) {
  const pan = useRef(new Animated.ValueXY()).current;
  const rotate = pan.x.interpolate({ inputRange: [-CARD_W, 0, CARD_W], outputRange: ['-18deg', '0deg', '18deg'] });
  const likeOpacity = pan.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD / 2], outputRange: [0, 1], extrapolate: 'clamp' });
  const skipOpacity = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD / 2, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) {
          Animated.spring(pan, { toValue: { x: SCREEN_W * 1.5, y: g.dy }, useNativeDriver: false }).start(onLike);
        } else if (g.dx < -SWIPE_THRESHOLD) {
          Animated.spring(pan, { toValue: { x: -SCREEN_W * 1.5, y: g.dy }, useNativeDriver: false }).start(onSkip);
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  const ukRank = item.popularity.uk;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.card,
        { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] },
      ]}
    >
      {/* Like / Skip overlays */}
      <Animated.View style={[styles.swipeLabel, styles.likeLabel, { opacity: likeOpacity }]}>
        <Text style={styles.swipeLabelText}>LIKE</Text>
      </Animated.View>
      <Animated.View style={[styles.swipeLabel, styles.skipLabel, { opacity: skipOpacity }]}>
        <Text style={styles.swipeLabelText}>SKIP</Text>
      </Animated.View>

      {/* Name */}
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardPronounce}>/{item.name.toLowerCase()}/</Text>
      </View>

      {/* Badges row */}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: genderColor(item.gender) }]}>
          <Text style={styles.badgeText}>{genderLabel(item.gender)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: C.yellow }]}>
          <Text style={styles.badgeText}>{item.syllables} syl</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: C.lavender }]}>
          <Text style={[styles.badgeText, { color: C.purple }]}>{item.origin}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: item.trend === 'rising' ? '#C8E6C9' : '#FFE0B2' }]}>
          <Text style={styles.badgeText}>{item.trend === 'rising' ? 'Trending' : 'Classic'}</Text>
        </View>
      </View>

      {/* Meaning */}
      <View style={styles.meaningBox}>
        <Text style={styles.meaningText}>"{item.meaning}"</Text>
      </View>

      {/* Vibes */}
      <View style={styles.badgeRow}>
        {item.vibes.slice(0, 3).map(v => (
          <View key={v} style={[styles.badge, { backgroundColor: C.peach }]}>
            <Text style={[styles.badgeText, { color: C.pink }]}>{v}</Text>
          </View>
        ))}
      </View>

      {/* Famous */}
      {item.famous.length > 0 && (
        <Text style={styles.famousText} numberOfLines={2}>
          Famous: {item.famous.slice(0, 2).join(' · ')}
        </Text>
      )}

      {/* Nicknames */}
      {item.nicknames.length > 0 && (
        <Text style={styles.nicknameText}>
          Also: {item.nicknames.join(', ')}
        </Text>
      )}

      {/* Popularity */}
      <View style={styles.popularityRow}>
        <Text style={styles.popularityLabel}>UK rank #{ukRank}</Text>
        <Text style={styles.popularityLabel}>{popularityLabel(ukRank)}</Text>
      </View>

      {/* Sound button */}
      <TouchableOpacity style={styles.soundBtn} onPress={() => speak(item.name)}>
        <Text style={styles.soundBtnText}>🔊 Hear it</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Filter panel ─────────────────────────────────────────────────────────────

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function FilterPanel({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  function set(k: keyof Filters, v: any) {
    onChange({ ...filters, [k]: filters[k] === v ? (k === 'syllables' ? 0 : '') : v });
  }

  return (
    <View style={styles.filterPanel}>
      <Text style={styles.filterSection}>Gender</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16 }}>
          {['All', 'M', 'F', 'N'].map(g => (
            <FilterChip
              key={g}
              label={g === 'All' ? 'All' : genderLabel(g)}
              active={filters.gender === g}
              onPress={() => onChange({ ...filters, gender: g })}
            />
          ))}
        </View>
      </ScrollView>

      <Text style={styles.filterSection}>First letter</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 16 }}>
          {LETTERS.map(l => (
            <FilterChip key={l} label={l} active={filters.letter === l} onPress={() => set('letter', l)} />
          ))}
        </View>
      </ScrollView>

      <Text style={styles.filterSection}>Syllables</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16 }}>
          {[1, 2, 3, 4, 5].map(s => (
            <FilterChip key={s} label={`${s}`} active={filters.syllables === s} onPress={() => set('syllables', s)} />
          ))}
        </View>
      </ScrollView>

      <Text style={styles.filterSection}>Vibe</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16 }}>
          {VIBES.map(v => (
            <FilterChip key={v} label={v} active={filters.vibe === v} onPress={() => set('vibe', v)} />
          ))}
        </View>
      </ScrollView>

      <Text style={styles.filterSection}>Origin</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16 }}>
          {ORIGINS.map(o => (
            <FilterChip key={o} label={o} active={filters.origin === o} onPress={() => set('origin', o)} />
          ))}
        </View>
      </ScrollView>

      <Text style={styles.filterSection}>Trend</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16 }}>
          {['rising', 'stable'].map(t => (
            <FilterChip key={t} label={t === 'rising' ? 'Trending up' : 'Classic stable'} active={filters.trend === t} onPress={() => set('trend', t)} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Browse tab ────────────────────────────────────────────────────────────────

function BrowseTab({ liked, setLiked }: { liked: Name[]; setLiked: React.Dispatch<React.SetStateAction<Name[]>> }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [cardKey, setCardKey] = useState(0);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.gender !== 'All') n++;
    if (filters.letter) n++;
    if (filters.origin) n++;
    if (filters.vibe) n++;
    if (filters.syllables > 0) n++;
    if (filters.trend) n++;
    return n;
  }, [filters]);

  const deck = useMemo(() => applyFilters(ALL_NAMES, filters, seen), [filters, seen]);
  const current = deck[0];
  const next = deck[1];

  function advanceSeen(name: string) {
    setSeen(s => new Set([...s, name]));
    setCardKey(k => k + 1);
  }

  function handleLike() {
    if (!current) return;
    setLiked(l => l.find(x => x.name === current.name) ? l : [...l, current]);
    advanceSeen(current.name);
  }

  function handleSkip() {
    if (!current) return;
    advanceSeen(current.name);
  }

  function handleReset() {
    setSeen(new Set());
    setCardKey(k => k + 1);
  }

  return (
    <View style={{ flex: 1, flexDirection: 'column' }}>
      {/* Filter toggle */}
      <View style={styles.filterToggleRow}>
        <TouchableOpacity style={styles.filterToggle} onPress={() => setFiltersOpen(o => !o)}>
          <Text style={styles.filterToggleText}>
            {filtersOpen ? '▲' : '▼'} Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
        {activeFilterCount > 0 && (
          <TouchableOpacity onPress={() => { setFilters(DEFAULT_FILTERS); setSeen(new Set()); }}>
            <Text style={{ color: C.pink, fontSize: 13 }}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {filtersOpen && (
        <FilterPanel filters={filters} onChange={(f) => { setFilters(f); setSeen(new Set()); setCardKey(k => k + 1); }} />
      )}

      {/* Card + buttons — fills all remaining space */}
      <View style={styles.cardArea}>
        {current ? (
          <>
            {/* Explicit-height wrapper so absolute-positioned cards have a parent with size */}
            <View style={styles.cardStack}>
              {next && <View style={[styles.card, styles.cardBehind]} />}
              <NameCard key={cardKey} item={current} onLike={handleLike} onSkip={handleSkip} />
            </View>
            {/* Action buttons anchored directly below the card */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.skipBtn]} onPress={handleSkip}>
                <Text style={styles.skipBtnText}>✕ Skip</Text>
              </TouchableOpacity>
              <View style={styles.remainingBadge}>
                <Text style={styles.remainingText}>{deck.length} left</Text>
              </View>
              <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={handleLike}>
                <Text style={styles.likeBtnText}>♥ Like</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>You've seen them all!</Text>
            <Text style={styles.emptySubtitle}>{seen.size} names reviewed</Text>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>Start over</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Liked tab ─────────────────────────────────────────────────────────────────

function LikedTab({ liked, setLiked }: { liked: Name[]; setLiked: React.Dispatch<React.SetStateAction<Name[]>> }) {
  function remove(name: string) {
    setLiked(l => l.filter(x => x.name !== name));
  }

  if (liked.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>💜</Text>
        <Text style={styles.emptyTitle}>No liked names yet</Text>
        <Text style={styles.emptySubtitle}>Swipe right on names you love</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.likedCount}>{liked.length} liked name{liked.length !== 1 ? 's' : ''}</Text>
      {liked.map(item => (
        <View key={item.name} style={styles.likedCard}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={styles.likedName}>{item.name}</Text>
              <View style={[styles.badge, { backgroundColor: genderColor(item.gender) }]}>
                <Text style={styles.badgeText}>{genderLabel(item.gender)}</Text>
              </View>
              <TouchableOpacity onPress={() => speak(item.name)} style={{ marginLeft: 'auto' }}>
                <Text style={{ fontSize: 18 }}>🔊</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.likedOrigin}>{item.origin} · {item.syllables} syllable{item.syllables !== 1 ? 's' : ''}</Text>
            <Text style={styles.likedMeaning} numberOfLines={2}>{item.meaning}</Text>
            <View style={[styles.badgeRow, { marginTop: 6 }]}>
              {item.vibes.slice(0, 3).map(v => (
                <View key={v} style={[styles.badge, { backgroundColor: C.peach }]}>
                  <Text style={[styles.badgeText, { color: C.pink }]}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
          <TouchableOpacity style={styles.removeBtn} onPress={() => remove(item.name)}>
            <Text style={styles.removeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Partner tab ───────────────────────────────────────────────────────────────

function PartnerTab({ liked }: { liked: Name[] }) {
  const [code] = useState(() => Math.random().toString(36).slice(2, 8).toUpperCase());

  return (
    <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>💑</Text>
      <Text style={styles.partnerTitle}>Partner Mode</Text>
      <Text style={styles.partnerSubtitle}>Coming soon — swipe together and find your shared favourites</Text>

      <View style={styles.partnerCodeCard}>
        <Text style={styles.partnerCodeLabel}>Your session code</Text>
        <Text style={styles.partnerCode}>{code}</Text>
        <Text style={styles.partnerCodeHint}>Share this with your partner to sync your lists</Text>
      </View>

      {liked.length > 0 && (
        <View style={{ width: '100%', marginTop: 24 }}>
          <Text style={styles.filterSection}>Your picks ({liked.length})</Text>
          {liked.map(n => (
            <View key={n.name} style={[styles.likedCard, { padding: 12 }]}>
              <View style={[styles.badge, { backgroundColor: genderColor(n.gender), marginRight: 8 }]}>
                <Text style={styles.badgeText}>{genderLabel(n.gender)}</Text>
              </View>
              <Text style={[styles.likedName, { fontSize: 18 }]}>{n.name}</Text>
              <Text style={[styles.likedOrigin, { marginLeft: 8, flex: 1 }]}>{n.origin}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function MainScreen() {
  const [tab, setTab] = useState<'browse' | 'liked' | 'partner'>('browse');
  const [liked, setLiked] = useState<Name[]>([]);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Baby Names</Text>
        <Text style={styles.headerSub}>Find the perfect name</Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {tab === 'browse' && <BrowseTab liked={liked} setLiked={setLiked} />}
        {tab === 'liked' && <LikedTab liked={liked} setLiked={setLiked} />}
        {tab === 'partner' && <PartnerTab liked={liked} />}
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {(['browse', 'liked', 'partner'] as const).map(t => {
          const active = tab === t;
          const label = t === 'browse' ? '🔍 Browse' : t === 'liked' ? `♥ Liked${liked.length ? ` (${liked.length})` : ''}` : '💑 Partner';
          return (
            <TouchableOpacity key={t} style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingTop: 52, paddingBottom: 12, paddingHorizontal: 20, backgroundColor: C.purple },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  filterToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  filterToggle: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: C.lavender, borderRadius: 20 },
  filterToggleText: { color: C.purple, fontWeight: '600', fontSize: 13 },
  filterPanel: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.border, paddingTop: 12, paddingBottom: 8 },
  filterSection: { fontSize: 11, fontWeight: '700', color: C.muted, paddingHorizontal: 16, marginBottom: 6, letterSpacing: 0.8, textTransform: 'uppercase' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: C.purple, borderColor: C.purple },
  chipText: { fontSize: 12, color: C.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  cardStack: {
    width: CARD_W,
    height: CARD_H + 10,
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#7C5CBF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    position: 'absolute',
    top: 0,
    justifyContent: 'center',
  },
  cardBehind: {
    top: 10,
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 2,
  },
  cardName: { fontSize: 52, fontWeight: '800', color: C.purple, letterSpacing: -1 },
  cardPronounce: { fontSize: 14, color: C.muted, fontStyle: 'italic' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600', color: C.text },
  meaningBox: { backgroundColor: C.lavender, borderRadius: 10, padding: 10, marginVertical: 8 },
  meaningText: { fontSize: 13, color: C.purple, fontStyle: 'italic', lineHeight: 20 },
  famousText: { fontSize: 11, color: C.muted, marginTop: 4 },
  nicknameText: { fontSize: 11, color: C.muted, marginTop: 2 },
  popularityRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  popularityLabel: { fontSize: 11, color: C.muted },
  soundBtn: { marginTop: 10, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, backgroundColor: C.lavender, borderRadius: 20 },
  soundBtnText: { fontSize: 13, color: C.purple, fontWeight: '600' },

  swipeLabel: {
    position: 'absolute',
    top: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
    zIndex: 10,
  },
  likeLabel: { right: 20, borderColor: '#4CAF50', transform: [{ rotate: '12deg' }] },
  skipLabel: { left: 20, borderColor: '#F44336', transform: [{ rotate: '-12deg' }] },
  swipeLabelText: { fontSize: 22, fontWeight: '900' },

  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24, paddingBottom: 12 },
  actionBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30 },
  skipBtn: { backgroundColor: '#FFF0F0', borderWidth: 2, borderColor: '#FFCDD2' },
  skipBtnText: { fontSize: 16, fontWeight: '700', color: '#E57373' },
  likeBtn: { backgroundColor: '#F0FFF0', borderWidth: 2, borderColor: C.pink },
  likeBtnText: { fontSize: 16, fontWeight: '700', color: C.pink },
  remainingBadge: { backgroundColor: C.lavender, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  remainingText: { fontSize: 12, color: C.purple, fontWeight: '600' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: C.muted, textAlign: 'center' },
  resetBtn: { marginTop: 24, backgroundColor: C.purple, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 },
  resetBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  likedCount: { fontSize: 13, color: C.muted, fontWeight: '600', marginBottom: 12 },
  likedCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  likedName: { fontSize: 22, fontWeight: '800', color: C.purple },
  likedOrigin: { fontSize: 12, color: C.muted, marginTop: 2 },
  likedMeaning: { fontSize: 13, color: C.text, marginTop: 4, lineHeight: 18 },
  removeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFE4E4', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  removeBtnText: { fontSize: 13, color: '#E57373', fontWeight: '700' },

  partnerTitle: { fontSize: 26, fontWeight: '800', color: C.purple, marginBottom: 8 },
  partnerSubtitle: { fontSize: 15, color: C.muted, textAlign: 'center', marginBottom: 32 },
  partnerCodeCard: { backgroundColor: C.card, borderRadius: 20, padding: 24, alignItems: 'center', width: '100%', shadowColor: C.purple, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 },
  partnerCodeLabel: { fontSize: 12, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  partnerCode: { fontSize: 42, fontWeight: '900', color: C.purple, letterSpacing: 6, marginBottom: 8 },
  partnerCodeHint: { fontSize: 13, color: C.muted, textAlign: 'center' },

  tabBar: { flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderTopWidth: 2, borderTopColor: C.purple },
  tabLabel: { fontSize: 13, color: C.muted, fontWeight: '500' },
  tabLabelActive: { color: C.purple, fontWeight: '700' },
});
