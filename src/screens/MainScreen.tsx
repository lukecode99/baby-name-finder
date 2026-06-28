import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
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
const CARD_H = Math.min(SCREEN_H * 0.55, 480);
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
const BAD_INITIALS = ['ASS', 'FAT', 'PIG', 'DIE', 'BUM', 'STD', 'HIV', 'POO', 'WTF', 'FUK', 'DUM', 'SHT', 'EFF', 'SOD'];

function speak(text: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 1;
  const matches = w.match(/[aeiouy]+/g);
  let n = matches ? matches.length : 1;
  if (w.endsWith('e') && w.length > 2 && !w.match(/le$/)) n = Math.max(n - 1, 1);
  return Math.max(n, 1);
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

// ── Reality Check Modal ───────────────────────────────────────────────────────

function RealityCheckModal({
  name, surname, onChangeSurname, onClose,
}: {
  name: Name;
  surname: string;
  onChangeSurname: (s: string) => void;
  onClose: () => void;
}) {
  const fullName = surname ? `${name.name} ${surname}` : name.name;

  const firstInitial = name.name[0].toUpperCase();
  const lastInitial = surname ? surname[0].toUpperCase() : '';
  const initials = `${firstInitial}${lastInitial}`;
  const initialsFlag = surname.length > 0 && BAD_INITIALS.some(b => b === initials || b.startsWith(initials) && b.length === initials.length);

  const firstSyl = name.syllables;
  const lastSyl = surname ? countSyllables(surname) : 0;
  const rhymeRisk = surname.length > 0 && firstSyl === 1 && lastSyl === 1;

  const firstEnds = name.name[name.name.length - 1].toLowerCase();
  const lastStarts = surname ? surname[0].toLowerCase() : '';
  const endingClash = surname.length > 0 && firstEnds === lastStarts;

  const [badNicknames, setBadNicknames] = useState<string[]>([]);

  return (
    <View style={rc.overlay}>
      <View style={rc.sheet}>
        <View style={rc.sheetHeader}>
          <Text style={rc.sheetTitle}>Reality Check</Text>
          <TouchableOpacity onPress={onClose} style={rc.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={rc.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {/* Full name preview */}
          <View style={rc.namePreview}>
            <Text style={rc.namePreviewText}>{fullName}</Text>
            <TouchableOpacity onPress={() => speak(fullName)} style={rc.speakBtn}>
              <Text style={rc.speakBtnText}>🔊 Hear it</Text>
            </TouchableOpacity>
          </View>

          {/* Surname input */}
          <Text style={rc.label}>Surname</Text>
          <TextInput
            style={rc.input}
            value={surname}
            onChangeText={onChangeSurname}
            placeholder="e.g. Holder"
            placeholderTextColor={C.muted}
            autoCapitalize="words"
            returnKeyType="done"
          />

          <Text style={rc.sectionHeader}>Checks</Text>

          {/* Initials */}
          <View style={rc.checkCard}>
            <Text style={rc.checkIcon}>{initialsFlag ? '⚠️' : '✅'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={rc.checkTitle}>Initials: {initials || firstInitial}</Text>
              <Text style={rc.checkDesc}>
                {initialsFlag ? `"${initials}" could raise eyebrows` : 'No awkward initials spotted'}
              </Text>
            </View>
          </View>

          {/* Rhythm */}
          {surname.length > 0 && (
            <View style={rc.checkCard}>
              <Text style={rc.checkIcon}>{rhymeRisk ? '⚠️' : '✅'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={rc.checkTitle}>Rhythm: {firstSyl} + {lastSyl} syllables</Text>
                <Text style={rc.checkDesc}>
                  {rhymeRisk
                    ? 'Both one syllable — may sound choppy or rhyme-y (like Mark Clark)'
                    : 'Good syllable variety'}
                </Text>
              </View>
            </View>
          )}

          {/* Ending clash */}
          {surname.length > 0 && (
            <View style={rc.checkCard}>
              <Text style={rc.checkIcon}>{endingClash ? '⚠️' : '✅'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={rc.checkTitle}>Sound flow</Text>
                <Text style={rc.checkDesc}>
                  {endingClash
                    ? `"${name.name}" ends with "${firstEnds.toUpperCase()}" and surname starts with "${lastStarts.toUpperCase()}" — can blur together when spoken quickly`
                    : 'First and last names flow cleanly into each other'}
                </Text>
              </View>
            </View>
          )}

          {/* Nickname risk */}
          {name.nicknames.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={rc.sectionHeader}>Nickname check</Text>
              <Text style={rc.checkDesc}>Tap any nickname you'd want to avoid:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {name.nicknames.map(nick => (
                  <TouchableOpacity
                    key={nick}
                    onPress={() => setBadNicknames(f =>
                      f.includes(nick) ? f.filter(n => n !== nick) : [...f, nick]
                    )}
                    style={[rc.nickChip, badNicknames.includes(nick) && rc.nickChipBad]}
                  >
                    <Text style={[rc.nickChipText, badNicknames.includes(nick) && { color: '#E57373' }]}>
                      {nick}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {badNicknames.length > 0 && (
                <Text style={{ color: '#E57373', fontSize: 12, marginTop: 6 }}>
                  ⚠️ Flagged: {badNicknames.join(', ')}
                </Text>
              )}
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const rc = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 100,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: SCREEN_H * 0.85, padding: 24, paddingBottom: 40,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: C.purple },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.lavender, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, color: C.purple, fontWeight: '700' },
  namePreview: { alignItems: 'center', marginBottom: 20, paddingVertical: 16, backgroundColor: C.card, borderRadius: 16, gap: 8 },
  namePreviewText: { fontSize: 42, fontWeight: '900', color: C.purple, letterSpacing: -1 },
  speakBtn: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: C.lavender, borderRadius: 20 },
  speakBtnText: { fontSize: 13, color: C.purple, fontWeight: '600' },
  label: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 16, color: C.text, backgroundColor: C.card, marginBottom: 20,
    outlineStyle: 'none',
  } as any,
  sectionHeader: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  checkCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 8 },
  checkIcon: { fontSize: 22 },
  checkTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  checkDesc: { fontSize: 12, color: C.muted, lineHeight: 18 },
  nickChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border },
  nickChipBad: { borderColor: '#FFCDD2', backgroundColor: '#FFF0F0' },
  nickChipText: { fontSize: 13, color: C.text, fontWeight: '500' },
});

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
      style={[styles.card, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}
    >
      <Animated.View style={[styles.swipeLabel, styles.likeLabel, { opacity: likeOpacity }]}>
        <Text style={styles.swipeLabelText}>LIKE</Text>
      </Animated.View>
      <Animated.View style={[styles.swipeLabel, styles.skipLabel, { opacity: skipOpacity }]}>
        <Text style={styles.swipeLabelText}>SKIP</Text>
      </Animated.View>

      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardPronounce}>/{item.name.toLowerCase()}/</Text>
      </View>

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

      <View style={styles.meaningBox}>
        <Text style={styles.meaningText}>"{item.meaning}"</Text>
      </View>

      <View style={styles.badgeRow}>
        {item.vibes.slice(0, 3).map(v => (
          <View key={v} style={[styles.badge, { backgroundColor: C.peach }]}>
            <Text style={[styles.badgeText, { color: C.pink }]}>{v}</Text>
          </View>
        ))}
      </View>

      {item.famous.length > 0 && (
        <Text style={styles.famousText} numberOfLines={2}>
          Famous: {item.famous.slice(0, 2).join(' · ')}
        </Text>
      )}

      {item.nicknames.length > 0 && (
        <Text style={styles.nicknameText}>Also: {item.nicknames.join(', ')}</Text>
      )}

      <View style={styles.popularityRow}>
        <Text style={styles.popularityLabel}>UK rank #{ukRank}</Text>
        <Text style={styles.popularityLabel}>{popularityLabel(ukRank)}</Text>
      </View>

      <TouchableOpacity style={styles.soundBtn} onPress={() => speak(item.name)}>
        <Text style={styles.soundBtnText}>🔊 Hear it</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Filter panel ─────────────────────────────────────────────────────────────

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
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
            <FilterChip key={g} label={g === 'All' ? 'All' : genderLabel(g)} active={filters.gender === g} onPress={() => onChange({ ...filters, gender: g })} />
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

function BrowseTab({ liked, setLiked, tabBarHeight }: { liked: Name[]; setLiked: React.Dispatch<React.SetStateAction<Name[]>>; tabBarHeight: number }) {
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
    <View style={{ flex: 1 }}>
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

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {current ? (
          <>
            <View style={{ width: CARD_W, height: CARD_H, position: 'relative' }}>
              {next && <View style={[styles.card, styles.cardBehind]} />}
              <NameCard key={cardKey} item={current} onLike={handleLike} onSkip={handleSkip} />
            </View>
            <View style={[styles.actionRow, { marginTop: 12 }]}>
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

function LikedTab({
  liked, setLiked, surname, setSurname, onRealityCheck,
}: {
  liked: Name[];
  setLiked: React.Dispatch<React.SetStateAction<Name[]>>;
  surname: string;
  setSurname: (s: string) => void;
  onRealityCheck: (name: Name) => void;
}) {
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
            <TouchableOpacity
              style={likedStyles.rcBtn}
              onPress={() => onRealityCheck(item)}
            >
              <Text style={likedStyles.rcBtnText}>🔍 Reality Check</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.removeBtn} onPress={() => remove(item.name)}>
            <Text style={styles.removeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const likedStyles = StyleSheet.create({
  rcBtn: {
    marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: C.lavender, borderRadius: 14,
  },
  rcBtnText: { fontSize: 12, color: C.purple, fontWeight: '600' },
});

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
  const [surname, setSurname] = useState('');
  const [realityCheckName, setRealityCheckName] = useState<Name | null>(null);
  const insets = useSafeAreaInsets();
  const tabBarHeight = 60 + insets.bottom;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Baby Names</Text>
        <Text style={styles.headerSub}>Find the perfect name · v6</Text>
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'browse' && <BrowseTab liked={liked} setLiked={setLiked} tabBarHeight={tabBarHeight} />}
        {tab === 'liked' && (
          <LikedTab
            liked={liked}
            setLiked={setLiked}
            surname={surname}
            setSurname={setSurname}
            onRealityCheck={setRealityCheckName}
          />
        )}
        {tab === 'partner' && <PartnerTab liked={liked} />}
      </View>

      <View style={[styles.tabBar, { height: tabBarHeight, paddingBottom: insets.bottom }]}>
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

      {realityCheckName && (
        <RealityCheckModal
          name={realityCheckName}
          surname={surname}
          onChangeSurname={setSurname}
          onClose={() => setRealityCheckName(null)}
        />
      )}
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

  card: {
    width: CARD_W, height: CARD_H, backgroundColor: C.card, borderRadius: 20, padding: 24,
    shadowColor: '#7C5CBF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20,
    elevation: 8, position: 'absolute', top: 0, justifyContent: 'center',
  },
  cardBehind: { top: 10, opacity: 0.45, shadowOpacity: 0, elevation: 2 },
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

  swipeLabel: { position: 'absolute', top: 24, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 3, zIndex: 10 },
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
    backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
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
