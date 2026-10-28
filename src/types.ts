export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  teamName?: string;
  teamLogo?: string;
  province?: string;
  district?: string;
  phone?: string;
  whatsapp?: string;
  hidePhone?: boolean;
  isAdmin?: boolean;
  isSuspended?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type MatchFormat = '5' | '7' | '11';
export type MatchStatus = 'open' | 'confirmed' | 'completed' | 'cancelled';

export interface FootballPost {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhotoURL?: string;
  title: string;
  teamName: string;
  teamLogo?: string;
  matchType: MatchFormat;
  matchDate: string; // YYYY-MM-DD
  matchTime: string; // HH:mm
  pitchName: string;
  province: string;
  district: string;
  skillLevel: string;
  pitchFee: string;
  feeType: 'split' | 'loser_pays' | 'host_pays' | 'custom';
  details?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  hidePhone?: boolean;
  status: MatchStatus;
  opponentId?: string;
  opponentTeamName?: string;
  pushNotified?: boolean;
  pushNotifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface MatchRequest {
  id: string;
  postId: string;
  ownerId: string;
  requesterId: string;
  requesterName: string;
  requesterPhotoURL?: string;
  requesterTeamName: string;
  requesterPhone?: string;
  requesterWhatsapp?: string;
  message?: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt?: string;
  // Denormalized post data for easy viewing in my requests
  postTitle?: string;
  postMatchDate?: string;
  postMatchTime?: string;
  postPitchName?: string;
}

export interface MatchRecord {
  id: string;
  postId: string;
  hostTeamId: string;
  hostTeamName: string;
  hostTeamLogo?: string;
  hostContact?: string;
  challengerTeamId: string;
  challengerTeamName: string;
  challengerTeamLogo?: string;
  challengerContact?: string;
  matchDate: string;
  matchTime: string;
  pitchName: string;
  province: string;
  district: string;
  matchType: MatchFormat;
  status: 'confirmed' | 'completed' | 'cancelled';
  scoreHost?: number;
  scoreChallenger?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  participantPhotos: Record<string, string>;
  lastMessage?: string;
  lastSenderId?: string;
  lastMessageAt?: string;
  unreadCount?: Record<string, number>;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  title: string;
  message: string;
  link?: string;
  type: 'request_received' | 'request_accepted' | 'request_rejected' | 'chat_message' | 'match_update';
  read: boolean;
  createdAt: string;
}

export interface UserReport {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'post' | 'user' | 'chat';
  targetId: string;
  targetName?: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  createdAt: string;
}

export interface SystemSetting {
  id: string;
  currentProvince: string;
  supportedProvinces: string[];
  updatedAt: string;
}

export interface FcmToken {
  id?: string;
  token: string;
  userId: string;
  userEmail?: string;
  deviceType?: 'mobile' | 'desktop' | 'ios' | 'android' | 'pwa' | 'unknown';
  userAgent?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PushLog {
  id?: string;
  postId: string;
  title: string;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  sentAt: string;
}
