import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { ChatMessages } from '@/components/ChatMessages';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import type { Conversation } from '../types';
import { s } from './styles';
export function CoachChat({ conversation, onProposal, onKeep, onProgram }: { conversation?: Conversation; onProposal: (id: string) => void; onKeep: (id: string) => void; onProgram: () => void }) {
  return <ChatMessages messages={(conversation?.messages ?? []).map(message => ({ ...message, role: message.role === 'coach' ? 'assistant' : 'user', renderKey: conversation?.proposals.find(p => p.id === message.proposalId)?.status }))} renderActions={id => {
    const message = conversation?.messages.find(m => m.id === id);
    const proposal = conversation?.proposals.find(p => p.id === message?.proposalId);
    if (!proposal) return null;
    return proposal.status === 'pending' ? <View style={[s.row, { gap: 7, alignItems: 'stretch', flexWrap: 'wrap' }]}>
      <Button text="Voir le changement" leading={<Symbol name="eye" color="primary" size={17} />} variant="secondary" radius={16} backgroundColor={colors.primarySurface} textColor={colors.primary} containerStyle={{ flex: 1, minWidth: 118 }} style={{ minHeight: 48, paddingHorizontal: 8 }} textStyle={{ fontSize: 11 }} onPress={() => onProposal(proposal.id)} />
      <Button text="Garder comme avant" radius={16} containerStyle={{ flex: 1, minWidth: 118 }} style={{ minHeight: 48, paddingHorizontal: 8 }} textStyle={{ fontSize: 11 }} onPress={() => onKeep(proposal.id)} />
    </View> : <View style={{ gap: 9 }}><Text style={[s.caption, { color: proposal.status === 'applied' ? colors.successText : colors.textSecondary }]}>{proposal.status === 'applied' ? 'Changement appliqué' : 'Aucun changement appliqué'}</Text>{proposal.status === 'applied' && proposal.kind === 'program_exercise' ? <Button text="Voir mon programme" variant="outline" onPress={onProgram} /> : null}</View>;
  }} />;
}
