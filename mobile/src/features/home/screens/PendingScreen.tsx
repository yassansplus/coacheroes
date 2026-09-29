import { localizeLabel } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { IconButton } from '@/components/IconButton';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';

export function PendingScreen({ title, onBack }: { title: string; onBack: () => void }) {
  useLanguage();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ width: '100%', maxWidth: 680, alignSelf: 'center' }}>
        <AppHeader
          title={title}
          leading={<IconButton accessibilityLabel={localizeLabel("Retour à l’accueil")} icon={<Symbol name="back" />} onPress={onBack} />}
        />
      </View>
    </SafeAreaView>
  );
}
