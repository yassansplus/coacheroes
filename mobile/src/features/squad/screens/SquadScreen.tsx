import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppModal } from '@/components/AppModal';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/IconButton';
import { LoadingState } from '@/components/LoadingState';
import { Motion } from '@/components/Motion';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { TextField } from '@/components/TextField';
import { Toggle } from '@/components/Toggle';
import { useSession } from '@/providers/SessionProvider';
import { readSelectedSquadGroup, storeSelectedSquadGroup } from '@/storage/squad';
import { claimSquadInvitation, createSquadChallenge, createSquadGroup, leaveSquadGroup, loadSquad, loadSquadGroup,
  loadSquadInvitations, removeSquadFriend, renameSquadGroup, resolveSquadInvitation, saveSquadPreferences,
  shareSquadInvitation, transferSquadGroup, type SquadGroupDetail, type SquadInvitations, type SquadOverview } from '@/services/squad';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { dayLabel, type Page } from '../data';
import { Activity } from '../components/Activity';
import { Challenge } from '../components/Challenge';
import { Comparison } from '../components/Comparison';
import { MemberProfile } from '../components/MemberProfile';
import { Ranking } from '../components/Ranking';
import { SquadHome } from '../components/SquadHome';
import { Action, Avatar, Heading, Panel, Row, s } from '../components/UI';

const titles: Record<Page['kind'], string> = { home: 'Squad', challenge: 'Challenge collectif', ranking: 'Classement', member: 'Profil sportif',
  compare: 'Comparer l’assiduité', activity: 'Activité du groupe', memberActivity: 'Activité partagée', friends: 'Mes amis', settings: 'Réglages Squad', manage: 'Gérer le groupe' };
type Sheet = 'groups' | 'createGroup' | 'code' | 'createChallenge' | 'history' | null;
type Confirm = { kind: 'friend' | 'leave' | 'transfer'; id: string; name: string } | null;
const inviteCode = (value: string) => value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] ?? value.trim();

export function SquadScreen({ onClose, onProgram, initialToken }: { onClose: () => void; onProgram: () => void; initialToken?: string }) {
  const { user } = useSession();
  const [overview, setOverview] = useState<SquadOverview | null>(null);
  const [detail, setDetail] = useState<SquadGroupDetail | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<SquadInvitations>({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stack, setStack] = useState<Page[]>([{ kind: 'home' }]);
  const [week, setWeek] = useState(0);
  const [filter, setFilter] = useState('all');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [groupName, setGroupName] = useState('');
  const [code, setCode] = useState('');
  const [challengeTitle, setChallengeTitle] = useState('20 entraînements');
  const [challengeTarget, setChallengeTarget] = useState('20');
  const [challengeDays, setChallengeDays] = useState<7 | 14>(7);
  const scroll = useRef<ScrollView>(null);
  const positions = useRef<number[]>([0]);
  const consumedToken = useRef<string | null>(null);
  const currentGroup = useRef<string | null>(null);
  const page = stack[stack.length - 1];
  const open = (next: Page) => { if (next.kind === 'activity' || next.kind === 'memberActivity') setFilter('all'); if (next.kind === 'manage') setGroupName(detail?.group.name ?? ''); positions.current[stack.length] = 0; setStack(current => [...current, next]); };
  const back = () => { if (sheet) setSheet(null); else if (confirm) setConfirm(null); else if (stack.length > 1) setStack(current => current.slice(0, -1)); else onClose(); };
  const refresh = useCallback(async (preferredGroupId?: string) => {
    try {
      const next = await loadSquad();
      const saved = user?.id && !currentGroup.current ? await readSelectedSquadGroup(user.id) : null;
      const chosen = next.groups.find(group => group.id === (preferredGroupId ?? currentGroup.current ?? saved))?.id ?? next.groups[0]?.id ?? null;
      const [nextDetail, nextInvitations] = await Promise.all([chosen ? loadSquadGroup(chosen) : Promise.resolve(null), loadSquadInvitations()]);
      currentGroup.current = chosen; setSelectedGroupId(chosen); setOverview(next); setDetail(nextDetail); setInvitations(nextInvitations); setError(null);
      if (user?.id) void storeSelectedSquadGroup(user.id, chosen);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible de charger ton Squad.'); }
    finally { setLoading(false); }
  }, [user?.id]);
  useFocusEffect(useCallback(() => { setLoading(true); void refresh(); }, [refresh]));
  useEffect(() => { if (!initialToken || !user?.id || consumedToken.current === initialToken) return;
    consumedToken.current = initialToken; setBusy(true);
    void claimSquadInvitation(inviteCode(initialToken)).then(() => refresh()).then(() => open({ kind: 'settings' }))
      .catch(cause => { setError(cause instanceof Error ? cause.message : 'Invitation invalide.'); open({ kind: 'settings' }); })
      .finally(() => setBusy(false));
  }, [initialToken, user?.id, refresh]);
  useEffect(() => { const frame = requestAnimationFrame(() => scroll.current?.scrollTo({ y: positions.current[stack.length - 1] ?? 0, animated: false })); return () => cancelAnimationFrame(frame); }, [stack.length]);
  useEffect(() => { const handler = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; }); return () => handler.remove(); });
  const run = async (action: () => Promise<unknown>, after?: () => void) => {
    if (busy) return;
    setBusy(true); setError(null);
    try { await action(); await refresh(); after?.(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Action impossible. Réessaie.'); }
    finally { setBusy(false); }
  };
  const shareFriend = () => void run(() => shareSquadInvitation('friend'));
  const shareGroup = () => { if (detail) void run(() => shareSquadInvitation('group', detail.group.id, detail.group.name)); };
  const claimCode = () => void run(async () => { await claimSquadInvitation(inviteCode(code)); }, () => { setCode(''); setSheet(null); open({ kind: 'settings' }); });
  const member = page.kind === 'member' || page.kind === 'compare' || page.kind === 'memberActivity'
    ? overview?.friends.find(friend => friend.id === page.member) ?? detail?.members.find(person => person.id === page.member) ?? (overview?.self.id === page.member ? overview.self : undefined)
    : undefined;
  const people = [...(detail?.members ?? []), ...(overview?.friends ?? []), ...(overview ? [overview.self] : [])];
  const events = page.kind === 'activity' && detail ? detail.activity
    : [...new Map([...(detail?.activity ?? []), ...(overview?.activity ?? [])].map(event => [event.id, event])).values()].sort((a, b) => b.at.localeCompare(a.at));
  return <View style={styles.root}><ScreenBackdrop /><SafeAreaView style={styles.safe}><View style={styles.frame}>
    <View style={styles.header}><IconButton accessibilityLabel="Retour" size={37} backgroundColor={colors.primarySurface} icon={<Symbol name="back" size={23} />} onPress={back} /><Text numberOfLines={1} adjustsFontSizeToFit style={styles.title}>{titles[page.kind]}</Text>{page.kind === 'home' ? <View><IconButton accessibilityLabel={`Réglages et invitations${overview?.inboxCount ? `, ${overview.inboxCount} en attente` : ''}`} size={37} icon={<Symbol name="settings" size={23} />} onPress={() => open({ kind: 'settings' })} />{overview?.inboxCount ? <View style={styles.notificationDot} /> : null}</View> : <View style={{ width: 37 }} />}</View>
    <ScrollView ref={scroll} showsVerticalScrollIndicator={false} scrollEventThrottle={100} onScroll={event => { positions.current[stack.length - 1] = event.nativeEvent.contentOffset.y; }} contentContainerStyle={styles.content}>
      {loading && !overview ? <LoadingState label="Chargement du Squad…" /> : null}
      {error ? <ErrorState description={error} onRetry={() => void refresh()} /> : null}
      {overview ? <Motion key={stack.length + page.kind} style={styles.pages}>
        {page.kind === 'home' ? <SquadHome overview={overview} detail={detail} open={open} onGroups={() => setSheet('groups')}
          onInviteFriend={shareFriend} onInviteGroup={shareGroup} onCreateGroup={() => { setGroupName(''); setSheet('createGroup'); }} /> : null}
        {page.kind === 'friends' ? <><Panel>{overview.friends.length ? overview.friends.map((friend, index) => <Row key={friend.id} last={index === overview.friends.length - 1} onPress={() => open({ kind: 'member', member: friend.id })}><Avatar member={friend} size={42} /><View style={s.grow}><Text style={s.title}>{friend.name}</Text><Text style={s.muted}>{friend.stats.sessionsWeek} séances cette semaine</Text></View><Symbol name="chevron" size={16} color="textMuted" /></Row>) : <EmptyState title="Pas encore d’amis" description="Partage un lien pour suivre vos progrès ensemble." />}</Panel><Action text="Inviter un ami" onPress={shareFriend} /></> : null}
        {page.kind === 'challenge' && detail ? <Challenge detail={detail} userId={user?.id ?? ''} onProgram={onProgram} onMember={id => open({ kind: 'member', member: id })}
          onCreate={() => setSheet('createChallenge')} onHistory={() => setSheet('history')} /> : null}
        {page.kind === 'ranking' && detail ? <Ranking detail={detail} week={week} onWeek={setWeek} onMember={id => open({ kind: 'member', member: id })} /> : null}
        {page.kind === 'member' && member ? <MemberProfile member={member}
          onCompare={overview.friends.some(friend => friend.id === member.id) ? () => open({ kind: 'compare', member: member.id }) : undefined}
          onActivity={() => open({ kind: 'memberActivity', member: member.id })}
          onRemoveFriend={overview.friends.some(friend => friend.id === member.id) ? () => setConfirm({ kind: 'friend', id: member.id, name: member.name }) : undefined} /> : null}
        {page.kind === 'compare' && member ? <Comparison self={overview.self} member={member} friends={overview.friends}
          onMember={id => setStack(current => [...current.slice(0, -1), { kind: 'compare', member: id }])} /> : null}
        {page.kind === 'activity' || page.kind === 'memberActivity' ? <Activity activities={events} people={people}
          member={page.kind === 'memberActivity' ? page.member : undefined} filter={filter} onFilter={setFilter}
          onMember={id => open({ kind: 'member', member: id })} onPrivacy={() => open({ kind: 'settings' })} /> : null}
        {page.kind === 'settings' ? <>
          <Heading>Invitations reçues {invitations.incoming.length ? `· ${invitations.incoming.length}` : ''}</Heading>
          <Panel>{invitations.incoming.length ? invitations.incoming.map((invitation, index) => <View key={invitation.id} style={[s.stack, index < invitations.incoming.length - 1 && s.divider, { paddingBottom: 9 }]}><Text style={s.body}>{invitation.kind === 'friend' ? `${invitation.inviter_name || 'Une personne'} veut devenir ton ami` : `${invitation.inviter_name || 'Une personne'} t’invite dans ${invitation.group_name || 'un groupe'}`}</Text><View style={s.row}><View style={s.grow}><Button text="Accepter" disabled={busy} onPress={() => void run(() => resolveSquadInvitation(invitation.id, true))} /></View><View style={s.grow}><Button text="Refuser" variant="outline" disabled={busy} onPress={() => void run(() => resolveSquadInvitation(invitation.id, false))} /></View></View></View>) : <Text style={s.muted}>Aucune invitation en attente.</Text>}</Panel>
          <Action text="Entrer un code d’invitation" outline onPress={() => setSheet('code')} />
          <Heading>Inviter</Heading><Panel><Row onPress={shareFriend}><Symbol name="users" color="primary" /><Text style={[s.body, s.grow]}>Inviter un ami par lien</Text><Symbol name="chevron" color="textMuted" /></Row>{detail ? <Row last onPress={shareGroup}><Symbol name="plus" color="primary" /><Text style={[s.body, s.grow]}>Inviter dans {detail.group.name}</Text><Symbol name="chevron" color="textMuted" /></Row> : null}</Panel>
          {invitations.outgoing.some(invitation => invitation.status === 'claimed') ? <><Heading>En attente de réponse</Heading><Panel>{invitations.outgoing.filter(invitation => invitation.status === 'claimed').map(invitation => <Row key={invitation.id}><Text style={[s.body, s.grow]}>{invitation.invitee_name || 'Une personne'} · {invitation.kind === 'friend' ? 'Ami' : invitation.group_name}</Text><Text style={s.muted}>En attente</Text></Row>)}</Panel></> : null}
          <Heading>Confidentialité</Heading><Panel><Toggle label="Partager mes séances dans l’activité" value={overview.preferences.shareActivity} disabled={busy} onValueChange={value => void run(() => saveSquadPreferences(overview.preferences.revision, value, overview.preferences.shareRecords))} /><Text style={s.muted}>Tes amis voient le sport et la durée. Dans un groupe, les autres membres voient qu’une séance a été faite. Tes repas, photos, poids et douleurs restent privés.</Text><Toggle label="Partager mes performances récentes avec mes amis" value={overview.preferences.shareRecords} disabled={busy} onValueChange={value => void run(() => saveSquadPreferences(overview.preferences.revision, overview.preferences.shareActivity, value))} /></Panel>
          <Heading>Groupes</Heading><Action text="Mes groupes" outline onPress={() => setSheet('groups')} />{detail ? <Action text="Gérer le groupe sélectionné" outline onPress={() => open({ kind: 'manage' })} /> : null}
        </> : null}
        {page.kind === 'manage' && detail ? <><Panel><Text style={s.title}>{detail.group.name}</Text><Text style={s.muted}>{detail.group.memberCount} membres · {detail.group.ownerId === user?.id ? 'Tu gères ce groupe' : 'Groupe privé'}</Text></Panel>
          {detail.group.ownerId === user?.id ? <><Heading>Nom du groupe</Heading><Panel><TextField label="Nom" value={groupName} onChangeText={setGroupName} maxLength={60} /><Action text="Enregistrer le nom" onPress={groupName.trim().length >= 2 ? () => void run(() => renameSquadGroup(detail.group.id, groupName.trim(), detail.group.revision)) : undefined} /></Panel>
            <Heading>Transférer le groupe</Heading><Panel>{detail.members.filter(person => person.id !== user?.id).length ? detail.members.filter(person => person.id !== user?.id).map(person => <Row key={person.id} onPress={() => setConfirm({ kind: 'transfer', id: person.id, name: person.name })}><Avatar member={person} /><Text style={[s.body, s.grow]}>{person.name}</Text><Symbol name="chevron" color="textMuted" /></Row>) : <Text style={s.muted}>Invite un membre avant de pouvoir lui confier le groupe.</Text>}</Panel></> : null}
          <Action text="Inviter au groupe" onPress={shareGroup} /><Action text="Quitter le groupe" outline onPress={() => setConfirm({ kind: 'leave', id: detail.group.id, name: detail.group.name })} />
          {detail.group.ownerId === user?.id && (detail.group.memberCount ?? 0) > 1 ? <Text style={s.muted}>Transfère le groupe à un membre avant de le quitter.</Text> : null}
        </> : null}
      </Motion> : null}
    </ScrollView>
  </View></SafeAreaView>
    <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheet === 'groups' ? 'Mes groupes' : sheet === 'createGroup' ? 'Créer un groupe' : sheet === 'code' ? 'Rejoindre une invitation' : sheet === 'createChallenge' ? 'Lancer un challenge' : 'Challenges précédents'}>
      <View style={{ gap: 12, paddingBottom: 12 }}>
        {sheet === 'groups' ? <>{overview?.groups.map(group => <Row key={group.id} onPress={() => { setSheet(null); setLoading(true); void refresh(group.id); }}><Text style={[s.body, s.grow]}>{group.name}</Text><Text style={s.muted}>{group.member_count} membres</Text>{selectedGroupId === group.id ? <Symbol name="check" color="primary" /> : null}</Row>)}<Action text="Créer un groupe" onPress={() => { setGroupName(''); setSheet('createGroup'); }} /><Action text="Rejoindre par code" outline onPress={() => setSheet('code')} /></> : null}
        {sheet === 'createGroup' ? <><TextField label="Nom du groupe" value={groupName} onChangeText={setGroupName} maxLength={60} placeholder="Ex. Les potes du sport" /><Button text={busy ? 'Création…' : 'Créer mon groupe'} disabled={busy || groupName.trim().length < 2} onPress={() => void run(async () => { const group = await createSquadGroup(groupName.trim()); currentGroup.current = group.id; }, () => { setSheet(null); setStack([{ kind: 'home' }]); })} /></> : null}
        {sheet === 'code' ? <><Text style={s.muted}>Colle le lien reçu ou son code. L’invitation apparaîtra ensuite dans les réglages pour que tu l’acceptes ou la refuses.</Text><TextField label="Lien ou code" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} /><Button text={busy ? 'Ouverture…' : 'Voir l’invitation'} disabled={busy || !code.trim()} onPress={claimCode} /></> : null}
        {sheet === 'createChallenge' ? <><TextField label="Nom du challenge" value={challengeTitle} onChangeText={setChallengeTitle} maxLength={80} /><TextField label="Nombre de séances à atteindre" value={challengeTarget} onChangeText={setChallengeTarget} keyboardType="number-pad" /><TabSelector items={[{ value: '7', label: '7 jours' }, { value: '14', label: '14 jours' }]} value={String(challengeDays)} onChange={value => setChallengeDays(Number(value) as 7 | 14)} /><Button text={busy ? 'Création…' : 'Lancer le challenge'} disabled={busy || !detail || challengeTitle.trim().length < 2 || !Number.isInteger(Number(challengeTarget)) || Number(challengeTarget) < 1} onPress={() => { if (detail) void run(() => createSquadChallenge(detail.group.id, challengeTitle.trim(), Number(challengeTarget), challengeDays), () => setSheet(null)); }} /></> : null}
        {sheet === 'history' ? detail?.challengeHistory.length ? detail.challengeHistory.map(challenge => <Row key={challenge.id}><Text style={[s.body, s.grow]}>{challenge.title}</Text><Text style={s.muted}>{challenge.currentSessions} / {challenge.targetSessions} · {dayLabel(challenge.endsAt)}</Text></Row>) : <EmptyState title="Aucun challenge terminé" /> : null}
      </View>
    </BottomSheet>
    <AppModal visible={!!confirm} onClose={() => setConfirm(null)} title={confirm?.kind === 'friend' ? 'Retirer cet ami ?' : confirm?.kind === 'transfer' ? 'Transférer le groupe ?' : 'Quitter ce groupe ?'}
      actions={<View style={s.stack}><Button text="Annuler" onPress={() => setConfirm(null)} /><Button text={busy ? 'Un instant…' : 'Confirmer'} variant="outline" disabled={busy} onPress={() => { if (!confirm) return; const action = confirm.kind === 'friend' ? () => removeSquadFriend(confirm.id) : confirm.kind === 'transfer' ? () => transferSquadGroup(detail!.group.id, confirm.id) : () => leaveSquadGroup(confirm.id); void run(action, () => { setConfirm(null); setStack([{ kind: 'home' }]); }); }} /></View>}>
      <Text style={s.body}>{confirm?.kind === 'friend' ? `Tu ne verras plus la progression de ${confirm.name}. Vous pourrez redevenir amis avec une nouvelle invitation.` : confirm?.kind === 'transfer' ? `${confirm.name} pourra gérer les invitations et les challenges du groupe.` : `Tu ne verras plus ${confirm?.name} dans tes groupes. Son historique reste conservé.`}</Text>
    </AppModal>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.onboardingBackground }, safe: { flex: 1 },
  frame: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: { paddingHorizontal: 19, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, textAlign: 'center', fontFamily: fontFamily.bold, fontSize: 19, color: colors.text },
  notificationDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.energy, borderWidth: 2, borderColor: colors.white },
  content: { paddingHorizontal: 19, paddingBottom: 30, paddingTop: 3 }, pages: { gap: 14 },
});
