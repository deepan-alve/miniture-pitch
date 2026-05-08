import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenContainer } from '@/components/screen-container';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { CapturedPhoto, useReturnFlow } from '@/hooks/use-return-flow';

const PROMPTS: {
  prompt: CapturedPhoto['prompt'];
  title: string;
  body: string;
  required: boolean;
}[] = [
  {
    prompt: 'front',
    title: 'Front view',
    body: 'A clean, well-lit photo of the whole item from the front.',
    required: true,
  },
  {
    prompt: 'damage',
    title: 'Any damaged areas?',
    body: 'Optional — if there’s wear, a scratch, or a missing piece, snap that.',
    required: false,
  },
  {
    prompt: 'all_parts',
    title: 'All parts included',
    body: 'Photo with all the bits laid out. Helps QC verify completeness.',
    required: true,
  },
];

export default function ReturnPhotosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const flow = useReturnFlow();

  const captureFor = async (prompt: CapturedPhoto['prompt']) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Camera needed',
        'We need camera access to capture photos for QC. You can grant it from Settings.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) flow.setPhoto(prompt, uri);
  };

  const requiredPrompts = PROMPTS.filter((p) => p.required).map((p) => p.prompt);
  const allRequiredCaptured = requiredPrompts.every((p) =>
    flow.photos.some((ph) => ph.prompt === p),
  );

  return (
    <ScreenContainer>
      <Text style={styles.headline}>Show us what we’re receiving</Text>
      <Text style={styles.lead}>
        Three quick photos help QC speed-run your request and protects your credit estimate.
      </Text>

      <View style={styles.list}>
        {PROMPTS.map((p) => {
          const captured = flow.photos.find((ph) => ph.prompt === p.prompt);
          return (
            <Card key={p.prompt} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title}>{p.title}</Text>
                    {p.required ? (
                      <Text style={styles.required}>Required</Text>
                    ) : (
                      <Text style={styles.optional}>Optional</Text>
                    )}
                  </View>
                  <Text style={styles.desc}>{p.body}</Text>
                </View>
              </View>

              <Pressable onPress={() => captureFor(p.prompt)} style={styles.thumbWrap}>
                {captured ? (
                  <Image
                    source={{ uri: captured.uri }}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}>
                    <Text style={styles.thumbEmptyText}>Tap to open camera</Text>
                  </View>
                )}
              </Pressable>

              {captured ? (
                <Pressable onPress={() => captureFor(p.prompt)}>
                  <Text style={styles.retakeLink}>Retake</Text>
                </Pressable>
              ) : null}
            </Card>
          );
        })}
      </View>

      <View style={styles.cta}>
        <Button
          label="Continue"
          disabled={!allRequiredCaptured}
          onPress={() => router.push(`/return/${id}/grade` as any)}
        />
        {!allRequiredCaptured ? (
          <Text style={styles.hint}>Capture the required photos to continue.</Text>
        ) : null}
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
  card: { gap: Spacing.md },
  cardHead: { flexDirection: 'row', gap: Spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: {
    fontSize: Typography.subhead,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
  },
  required: {
    fontSize: Typography.caption,
    fontWeight: Typography.bold as '700',
    color: Palette.orange,
    letterSpacing: 0.5,
  },
  optional: {
    fontSize: Typography.caption,
    color: Palette.textMuted,
  },
  desc: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  thumbWrap: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Palette.bgSubtle,
  },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Palette.borderStrong,
  },
  thumbEmptyText: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    fontWeight: Typography.semibold as '600',
  },
  retakeLink: {
    fontSize: Typography.body,
    color: Palette.orange,
    fontWeight: Typography.semibold as '600',
    textAlign: 'right',
  },
  cta: { marginTop: Spacing.xl, gap: Spacing.sm },
  hint: {
    fontSize: Typography.caption,
    color: Palette.textMuted,
    textAlign: 'center',
  },
});
