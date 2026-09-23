export type CoachPage = 'questions' | 'chat' | 'reasons' | 'proposal' | 'compare' | 'decision';
export type ProposalStatus = 'pending' | 'applied' | 'declined';
export type Proposal = {
  id: string;
  status: ProposalStatus;
  kind: 'program_exercise' | 'meal_portion';
  description: string;
  change: Record<string, unknown>;
  createdAt: number;
};
export type CoachMessage = {
  id: string;
  role: 'user' | 'coach';
  text: string;
  createdAt: number;
  image?: string;
  proposalId?: string;
};
export type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: CoachMessage[];
  proposals: Proposal[];
};
