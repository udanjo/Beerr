import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { SegmentedTabs } from '../../../shared/components/SegmentedTabs';
import { fontSize, fonts, radius, type Palette } from '../../../shared/theme';
import { useThemedStyles } from '../../../shared/theme/ThemeContext';
import { MUSCLE_GROUPS, type MuscleGroup } from '../../plans/types';
import {
  TOTAL_EXERCISES,
  countByGroup,
  getLibraryExercise,
  listExercises,
  suggestSimilar,
  type LibraryExercise,
} from '../services/exerciseLibrary';
import { useCustomExercises } from '../hooks/useCustomExercises';
import { CustomExerciseSheet } from './CustomExerciseSheet';
import { ExerciseDetailModal } from './ExerciseDetail';
import { ExerciseThumb } from './ExerciseThumb';

type LibraryTab = 'all' | 'muscle' | 'cardio';

const TABS: { value: LibraryTab; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'muscle', label: 'Por músculo' },
  { value: 'cardio', label: 'Cardio' },
];

const MUSCLE_ONLY_GROUPS = MUSCLE_GROUPS.filter((group) => group !== 'Cardio');

interface ExerciseLibraryProps {
  title: string;
  /** Com seleção, cada linha tem uma caixa e há um botão de confirmação. */
  selectable?: boolean;
  /** Permite escolher só um exercício (usado em "Substituir"). */
  single?: boolean;
  confirmLabel?: string;
  preferredGroups?: MuscleGroup[];
  /** Exercício que está sendo substituído (id da biblioteca): mostra sugestões parecidas no topo. */
  similarTo?: string;
  /** Ids da biblioteca que não devem ser sugeridos (ex.: já estão no treino). */
  excludeIds?: string[];
  /** Espaço extra no fim da lista (ex.: para a barra de abas flutuante). */
  bottomPadding?: number;
  onConfirm?: (selected: LibraryExercise[]) => void;
  onClose?: () => void;
}

export function ExerciseLibrary({
  title,
  selectable = false,
  single = false,
  confirmLabel = 'Adicionar',
  preferredGroups,
  similarTo,
  excludeIds,
  bottomPadding = 0,
  onConfirm,
  onClose,
}: ExerciseLibraryProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<LibraryTab>('all');
  const [openGroup, setOpenGroup] = useState<MuscleGroup | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  // Com o teclado aberto, o cabeçalho encolhe para sobrar espaço à lista.
  const [searchFocused, setSearchFocused] = useState(false);
  const [creating, setCreating] = useState<{ name: string } | null>(null);
  // Relista e recontagem quando um exercício personalizado é criado, editado ou excluído.
  const customExercises = useCustomExercises();
  const groupCounts = useMemo(() => countByGroup(), [customExercises]);

  const hasDayGroups = (preferredGroups?.length ?? 0) > 0;
  const [onlyDayGroups, setOnlyDayGroups] = useState(true);
  const filterByDay = hasDayGroups && onlyDayGroups && tab === 'all';

  const isSearching = query.trim().length > 0;
  const showGroupList = tab === 'muscle' && openGroup === null && !isSearching;

  const results = useMemo(() => {
    if (showGroupList) return [];
    if (tab === 'cardio') return listExercises({ group: 'Cardio', query });
    if (tab === 'muscle' && openGroup) return listExercises({ group: openGroup, query });
    return listExercises({
      query,
      onlyGroups: filterByDay ? preferredGroups : undefined,
      preferred: tab === 'all' ? preferredGroups : undefined,
    });
  }, [showGroupList, tab, openGroup, query, preferredGroups, filterByDay, customExercises]);

  // Sugestões só na troca de um exercício, na aba "Todos", sem busca e sem teclado aberto.
  const suggestions = useMemo(
    () => (single && similarTo ? suggestSimilar(similarTo, excludeIds) : []),
    [single, similarTo, excludeIds, customExercises],
  );
  const showSuggestions = suggestions.length > 0 && tab === 'all' && !isSearching && !searchFocused;
  const listData = useMemo(
    () =>
      showSuggestions
        ? results.filter((exercise) => !suggestions.some((item) => item.exercise.id === exercise.id))
        : results,
    [results, showSuggestions, suggestions],
  );

  const toggle = useCallback(
    (id: string) => {
      setSelectedIds((current) => {
        if (current.includes(id)) return current.filter((selectedId) => selectedId !== id);
        return single ? [id] : [...current, id];
      });
    },
    [single],
  );

  const handleConfirm = () => {
    const selected = selectedIds
      .map((id) => getLibraryExercise(id))
      .filter((exercise): exercise is LibraryExercise => exercise !== undefined);
    onConfirm?.(selected);
  };

  const handleCreated = (created: LibraryExercise) => {
    setCreating(null);
    // Sem seleção (aba Exercícios) não há o que marcar; no seletor o novo já vem marcado.
    if (!selectable) return;
    setQuery('');
    if (preferredGroups && !preferredGroups.includes(created.group)) setOnlyDayGroups(false);
    setSelectedIds((current) => (single ? [created.id] : [...current, created.id]));
  };

  const changeTab = (next: LibraryTab) => {
    setTab(next);
    setOpenGroup(null);
  };

  const footerHeight = selectable && selectedIds.length > 0 ? 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {onClose && (
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          )}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={22} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar exercícios..."
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Buscar exercícios"
            autoCorrect={false}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              style={styles.clearButton}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
            >
              <Ionicons name="close-circle" size={22} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {!searchFocused && (
          <Pressable
            onPress={() => setCreating({ name: '' })}
            style={styles.createButton}
            accessibilityRole="button"
            accessibilityLabel="Criar exercício"
          >
            <Ionicons name="add" size={22} color={colors.accent} />
            <Text style={styles.createText}>CRIAR EXERCÍCIO</Text>
          </Pressable>
        )}

        {!searchFocused && <SegmentedTabs options={TABS} value={tab} onChange={changeTab} />}

        {searchFocused && filterByDay && (
          <Text style={styles.count} numberOfLines={1}>
            Filtro: {preferredGroups?.join(', ')}
          </Text>
        )}

        {!searchFocused && hasDayGroups && tab === 'all' && (
          <View style={styles.dayFilter}>
            <Pressable
              onPress={() => setOnlyDayGroups(true)}
              style={[styles.filterChip, onlyDayGroups && styles.filterChipSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected: onlyDayGroups }}
              accessibilityLabel={`Só ${preferredGroups?.join(', ')}`}
            >
              <Text style={[styles.filterText, onlyDayGroups && styles.filterTextSelected]}>
                {preferredGroups?.join(' + ').toUpperCase()}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setOnlyDayGroups(false)}
              style={[styles.filterChip, !onlyDayGroups && styles.filterChipSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected: !onlyDayGroups }}
              accessibilityLabel="Mostrar todos os grupos"
            >
              <Text style={[styles.filterText, !onlyDayGroups && styles.filterTextSelected]}>
                TODOS OS GRUPOS
              </Text>
            </Pressable>
          </View>
        )}

        {!searchFocused && tab === 'muscle' && openGroup && !isSearching && (
          <Pressable
            onPress={() => setOpenGroup(null)}
            style={styles.backRow}
            accessibilityRole="button"
            accessibilityLabel="Voltar para grupos musculares"
          >
            <Ionicons name="chevron-back" size={20} color={colors.accent} />
            <Text style={styles.backText}>{openGroup}</Text>
          </Pressable>
        )}

        {!showGroupList && (
          <Text style={styles.count}>
            {results.length} {results.length === 1 ? 'exercício' : 'exercícios'}
            {tab === 'all' && !isSearching && !filterByDay ?` de ${TOTAL_EXERCISES}` : ''}
          </Text>
        )}
      </View>

      {showGroupList ? (
        <FlatList
          data={MUSCLE_ONLY_GROUPS}
          keyExtractor={(group) => group}
          contentContainerStyle={{ paddingBottom: bottomPadding + footerHeight + 16 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setOpenGroup(item)}
              style={styles.groupRow}
              accessibilityRole="button"
              accessibilityLabel={`${item}, ${groupCounts.get(item) ?? 0} exercícios`}
            >
              <View style={styles.groupBadge}>
                <Text style={styles.groupBadgeText}>{item.charAt(0)}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowName}>{item}</Text>
                <Text style={styles.rowMeta}>{groupCounts.get(item) ?? 0} exercícios</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(exercise) => exercise.id}
          extraData={selectedIds}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            showSuggestions ? (
              <View>
                <Text style={styles.suggestTitle} accessibilityRole="header">
                  SUGERIDOS PARA SUBSTITUIR
                </Text>
                {suggestions.map(({ exercise, reason }) => (
                  <ExerciseListRow
                    key={exercise.id}
                    exercise={exercise}
                    meta={reason}
                    selectable={selectable}
                    selected={selectedIds.includes(exercise.id)}
                    onToggle={toggle}
                    onOpen={setDetailId}
                  />
                ))}
                <Text style={styles.suggestTitle} accessibilityRole="header">
                  TODOS
                </Text>
              </View>
            ) : undefined
          }
          initialNumToRender={10}
          windowSize={7}
          contentContainerStyle={{ paddingBottom: bottomPadding + footerHeight + 16 }}
          ListEmptyComponent={
            <View>
              <Text style={styles.empty}>Nenhum exercício encontrado.</Text>
              {isSearching && (
                <Pressable
                  onPress={() => setCreating({ name: query })}
                  style={[styles.createButton, styles.createEmpty]}
                  accessibilityRole="button"
                  accessibilityLabel={`Criar exercício ${query.trim()}`}
                >
                  <Ionicons name="add" size={22} color={colors.accent} />
                  <Text style={styles.createText} numberOfLines={1}>
                    CRIAR "{query.trim()}"
                  </Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <ExerciseListRow
              exercise={item}
              selectable={selectable}
              selected={selectedIds.includes(item.id)}
              onToggle={toggle}
              onOpen={setDetailId}
            />
          )}
        />
      )}

      {footerHeight > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <PrimaryButton label={`${confirmLabel} (${selectedIds.length})`} onPress={handleConfirm} />
        </View>
      )}

      <ExerciseDetailModal libraryId={detailId} onClose={() => setDetailId(null)} />

      {creating && (
        <CustomExerciseSheet
          initialName={creating.name}
          initialGroup={tab === 'muscle' && openGroup ? openGroup : tab === 'cardio' ? 'Cardio' : undefined}
          existingNames={listExercises({}).map((exercise) => exercise.name)}
          onClose={() => setCreating(null)}
          onSaved={handleCreated}
        />
      )}
    </View>
  );
}

interface ExerciseListRowProps {
  exercise: LibraryExercise;
  selectable: boolean;
  selected: boolean;
  /** Texto no lugar de "músculo · equipamento" (ex.: o motivo de uma sugestão). */
  meta?: string;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}

const ExerciseListRow = memo(function ExerciseListRow({
  exercise,
  meta,
  selectable,
  selected,
  onToggle,
  onOpen,
}: ExerciseListRowProps) {
  const { colors, styles } = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={() => (selectable ? onToggle(exercise.id) : onOpen(exercise.id))}
      style={styles.row}
      accessibilityRole={selectable ? 'checkbox' : 'button'}
      accessibilityState={selectable ? { checked: selected } : undefined}
      accessibilityLabel={meta ? `${exercise.name}, sugestão, ${meta}` : exercise.name}
    >
      <Pressable
        onPress={() => onOpen(exercise.id)}
        accessibilityRole="button"
        accessibilityLabel={`Ver como fazer ${exercise.name}`}
        hitSlop={4}
      >
        <ExerciseThumb libraryId={exercise.id} size={56} />
      </Pressable>
      <View style={styles.rowText}>
        <View style={styles.nameRow}>
          <Text style={[styles.rowName, styles.nameFlex]}>{exercise.name}</Text>
          {exercise.custom && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>MEU</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowMeta}>
          {meta ?? `${exercise.target}${exercise.equipment ? ` · ${exercise.equipment}` : ''}`}
        </Text>
      </View>
      {selectable && (
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <Ionicons name="checkmark" size={20} color={colors.onPrimary} />}
        </View>
      )}
    </Pressable>
  );
});

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    gap: 14,
    paddingBottom: 8,
  },
  titleRow: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.lg,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  clearButton: {
    width: 44,
    height: 44,
    marginRight: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
  },
  backRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: colors.accent,
    fontFamily: fonts.displayBold,
    fontSize: 20,
  },
  dayFilter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
  },
  filterText: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    letterSpacing: 0.4,
  },
  filterTextSelected: {
    color: colors.onPrimary,
  },
  count: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
  },
  empty: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestTitle: {
    color: colors.accent,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    letterSpacing: 0.4,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  rowMeta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameFlex: {
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  badgeText: {
    color: colors.onPrimary,
    fontFamily: fonts.displayBold,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  createButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  createEmpty: {
    alignSelf: 'center',
    marginTop: 16,
    maxWidth: '90%',
  },
  createText: {
    color: colors.accent,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    letterSpacing: 0.4,
  },
  checkbox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.accent,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  groupBadge: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  groupBadgeText: {
    color: colors.accent,
    fontFamily: fonts.displayBold,
    fontSize: 28,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.background,
  },
  });
