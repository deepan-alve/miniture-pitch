import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { ScreenContainer } from '@/components/screen-container';
import { Palette, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useReturnFlow } from '@/hooks/use-return-flow';
import type { SelfDeclaredGrade } from '@/hooks/use-path-recommendation';

const GRADES: {
  value: SelfDeclaredGrade;
  title: string;
  emoji: string;
  body: string;
  bg: string;
  dot: string;
}[] = [
  {
    value: 'good',
    title: 'Good',
    emoji: '\u{1F31F}',
    body: 'Like new — minor signs of love. No damage, all parts present.',
    bg: Palette.pastelGreen,
    dot: Palette.success,
  },
  {
    value: 'fair',
    title: 'Fair',
    emoji: '\u{1F31E}',
    body: 'Light wear or scratches. Fully functional, all parts present.',
    bg: Palette.pastelYellow,
    dot: Palette.yellowDeep,
  },
  {
    value: 'worn',
    title: 'Worn',
    emoji: '\u{1F33F}',
    body: 'Used a lot. Visible marks, maybe one small piece missing — still usable.',
    bg: Palette.pastelPeach,
    dot: Palette.orange,
  },
];

export default function ReturnGradeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const flow = useReturnFlow();
  const selected = flow.grade;

  return (
    <ScreenContainer>
      <Text style={styles.headline}>How’s it holding up?</Text>
      <Text style={styles.lead}>
        Be honest. Our QC team double-checks at receipt — overstating grade just slows the
        approval down.
      </Text>

      <View style={styles.list}>
        {GRADES.map((g) => {
          const active = g.value === selected;
          return (
            <Pressable
              key={g.value}
              onPress={() => flow.setGrade(g.value)}
              style={[
                styles.card,
                { backgroundColor: g.bg },
                active ? styles.cardActive : null,
              ]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardEmoji}>{g.emoji}</Text>
                <View style={[styles.dot, { backgroundColor: g.dot }]} />
              </View>
              <Text style={styles.cardTitle}>{g.title}</Text>
              <Text style={styles.cardBody}>{g.body}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.cta}>
        <Button
          label="Continue"
          disabled={!selected}
          onPress={() => router.push(`/return/${id}/paths` as any)}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headline: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
    marginBottom: Spacing.xs,
  },
  lead: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  list: { gap: Spacing.md },
  card: {
    borderRadius: Radius.cardLg,
    padding: Spacing.xl,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardActive: { borderColor: Palette.black, ...Shadows.cta },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardEmoji: { fontSize: 28 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  cardTitle: {
    fontSize: Typography.title,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
    marginBottom: Spacing.xs,
  },
  cardBody: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    lineHeight: 20,
  },
  cta: { marginTop: Spacing.xl },
});
