import { Image, Text, View } from 'react-native';
import { Motion } from '@/components/Motion';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Illustration } from '@/components/Illustration';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import type { Conversation } from '../types';
import { timeLabel } from '../utils';
import { s } from './styles';

export function CoachChat({ conversation, onProposal, onKeep, onProgram }: { conversation?: Conversation; onProposal: (id: string) => void; onKeep: (id: string) => void; onProgram: () => void }) {
  return <>{conversation?.messages.map(message => {
    const user = message.role === 'user';
    const proposal = conversation.proposals.find(item => item.id === message.proposalId);
    return <Motion key={message.id} trigger={proposal?.status ?? message.id} style={[s.row, { alignItems: 'flex-start', justifyContent: user ? 'flex-end' : 'flex-start', gap: 7 }]}>
      {!user ? <Illustration name="coach" size={32} /> : null}
      <Card style={{ maxWidth: user ? '86%' : undefined, flex: user ? undefined : 1, minWidth: 0, padding: 15, gap: 12, backgroundColor: user ? colors.accentSurface : colors.surface }}>
        {message.image ? <Image source={{ uri: message.image }} style={{ width: '100%', aspectRatio: 1.4, borderRadius: 14 }} resizeMode="cover" accessibilityLabel="Photo jointe à la conversation" /> : null}
        {message.text ? <Text style={[s.label, { fontSize: 15, lineHeight: 24 }]}>{message.text}</Text> : null}
        {proposal ? <>{proposal.status === 'pending' ? <View style={[s.row, { gap: 7, alignItems: 'stretch', flexWrap: 'wrap' }]}>
          <Button text="Voir l’ajustement" leading={<Symbol name="eye" color="primary" size={17} />} variant="secondary" radius={16} backgroundColor={colors.primarySurface} textColor={colors.primary} containerStyle={{ flex: 1, minWidth: 118 }} style={{ minHeight: 48, paddingHorizontal: 8 }} textStyle={{ fontSize: 11 }} onPress={() => onProposal(proposal.id)} />
          <Button text="Garder la séance" leading={<Symbol name="dumbbell" color="white" size={17} />} radius={16} containerStyle={{ flex: 1, minWidth: 118 }} style={{ minHeight: 48, paddingHorizontal: 8 }} textStyle={{ fontSize: 11 }} onPress={() => onKeep(proposal.id)} />
        </View> : <View style={{ gap: 9 }}><Text style={[s.caption, { color: proposal.status === 'applied' ? colors.successText : colors.textSecondary }]}>{proposal.status === 'applied' ? 'Ajustement appliqué' : 'Programme conservé'}</Text>{proposal.status === 'applied' ? <Button text="Voir mon programme" variant="outline" onPress={onProgram} /> : null}</View>}</> : null}
        <View style={[s.row, { justifyContent: user ? 'flex-end' : 'flex-start', gap: 5 }]}><Text style={s.caption}>{timeLabel(message.createdAt)}</Text>{user ? <Symbol name="check" size={13} color="primary" /> : null}</View>
      </Card>
    </Motion>;
  })}</>;
}
